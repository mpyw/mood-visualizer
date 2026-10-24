"""Posts a new mood record to Slack. Called by the record workflow.

The first post of a JST day starts a thread (with the chart PNG when one was
exported). Later posts of the same day reply in that thread. The thread is
remembered in public/data/latest-slack-update.json, which the workflow commits.

A Slack failure never fails the workflow: the record itself is already saved.
"""

from __future__ import annotations

import json
import mimetypes
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

JST = timezone(timedelta(hours=9))
STATE_FILE = Path('public/data/latest-slack-update.json')
API = 'https://slack.com/api'
TIMEOUT = 30

MOOD_EMOJIS = [
    (10, ':star-struck:'),
    (8, ':grinning:'),
    (6, ':slightly_smiling_face:'),
    (4, ':neutral_face:'),
    (2, ':slightly_frowning_face:'),
    (0, ':disappointed:'),
]


def mood_emoji(score: str) -> str:
    try:
        value = float(score)
    except (TypeError, ValueError):
        return ':grey_question:'
    for min_score, emoji in MOOD_EMOJIS:
        if value >= min_score:
            return emoji
    return MOOD_EMOJIS[-1][1]


def build_text(date: str, score: str, note: str | None) -> str:
    """Plain-text fallback for notifications."""
    return f'新しい気分記録: {date}\nスコア: {score}' + (f'\nメモ: {note}' if note else '')


def build_blocks(date: str, score: str, note: str | None) -> list[dict]:
    blocks: list[dict] = [
        {
            'type': 'header',
            'text': {'type': 'plain_text', 'text': '新しい気分記録', 'emoji': True},
        },
        {'type': 'context', 'elements': [{'type': 'mrkdwn', 'text': f'*記録日*: {date}（JST）'}]},
        {
            'type': 'section',
            'fields': [{'type': 'mrkdwn', 'text': f'*スコア*\n{score} {mood_emoji(score)}'}],
        },
    ]
    if note:
        quoted = '\n'.join(f'>{line}' for line in note.splitlines())
        blocks += [
            {'type': 'divider'},
            {'type': 'section', 'text': {'type': 'mrkdwn', 'text': f'*メモ*\n{quoted}'}},
        ]
    return blocks


@dataclass(frozen=True)
class State:
    date: str | None = None
    thread_ts: str | None = None

    def thread_for(self, today: str) -> str | None:
        """Thread to reply to, or None when today's thread is not started yet."""
        return self.thread_ts if self.date == today else None


def load_state(path: Path = STATE_FILE) -> State:
    if not path.exists():
        return State()
    obj = json.loads(path.read_text(encoding='utf-8'))
    return State(date=obj.get('date'), thread_ts=obj.get('thread_ts'))


def save_state(state: State, path: Path = STATE_FILE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({'date': state.date, 'thread_ts': state.thread_ts}, ensure_ascii=False),
        encoding='utf-8',
    )


def parse_bool(value: str | None, default: bool) -> bool:
    if value is None or value == '':
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


def find_latest_png() -> Path | None:
    files = list(Path().glob('*_mood_chart.png'))
    return max(files, key=lambda f: f.stat().st_mtime) if files else None


class SlackClient:
    def __init__(self, token: str, channel: str):
        self.token = token
        self.channel = channel

    def _call(self, method: str, **kwargs) -> dict:
        resp = requests.post(
            f'{API}/{method}',
            headers={'Authorization': f'Bearer {self.token}'},
            timeout=TIMEOUT,
            **kwargs,
        )
        resp.raise_for_status()
        body = resp.json()
        if not body.get('ok'):
            raise RuntimeError(f'Slack API error ({method}): {body}')
        return body

    def post_message(
        self, text: str, blocks: list[dict], thread_ts: str | None, reply_broadcast: bool
    ) -> str:
        payload: dict = {'channel': self.channel, 'text': text, 'blocks': blocks}
        if thread_ts:
            payload['thread_ts'] = thread_ts
            # reply_broadcast only works together with thread_ts.
            if reply_broadcast:
                payload['reply_broadcast'] = True
        return self._call('chat.postMessage', json=payload)['ts']

    def post_file(self, path: Path, blocks: list[dict]) -> str | None:
        """Uploads a file with blocks as a new message. Returns its ts."""
        size = path.stat().st_size
        upload = self._call(
            'files.getUploadURLExternal',
            data={'filename': path.name, 'length': str(size), 'alt_txt': '今日の気分記録'},
        )
        mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
        with path.open('rb') as f:
            resp = requests.post(
                upload['upload_url'],
                data=f,
                headers={'Content-Type': mime, 'Content-Length': str(size)},
                timeout=TIMEOUT,
            )
        if resp.status_code != 200:
            raise RuntimeError(f'Upload failed: HTTP {resp.status_code} {resp.text[:200]}')
        # initial_comment is ignored when blocks are given, so it is not sent.
        self._call(
            'files.completeUploadExternal',
            json={
                'files': [{'id': upload['file_id'], 'title': path.name}],
                'channel_id': self.channel,
                'blocks': blocks,
            },
        )
        return self._message_ts_of_file(upload['file_id'])

    def _message_ts_of_file(self, file_id: str, retries: int = 6) -> str | None:
        """The share appears asynchronously, so poll with backoff."""
        for i in range(retries):
            resp = requests.get(
                f'{API}/files.info',
                headers={'Authorization': f'Bearer {self.token}'},
                params={'file': file_id},
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
            shares = resp.json().get('file', {}).get('shares', {})
            for scope in ('public', 'private'):
                entries = shares.get(scope, {}).get(self.channel) or []
                if entries and (ts := entries[-1].get('ts')):
                    return ts
            time.sleep(0.5 * 2**i)
        return None


def notify(
    client: SlackClient,
    state: State,
    *,
    date: str,
    score: str,
    note: str | None,
    today: str,
    png: Path | None,
    reply_broadcast: bool,
) -> State:
    """Posts the record and returns the state to save."""
    text = build_text(date, score, note)
    blocks = build_blocks(date, score, note)
    thread_ts = state.thread_for(today)
    if thread_ts:
        client.post_message(text, blocks, thread_ts=thread_ts, reply_broadcast=reply_broadcast)
        return state
    if png:
        ts = client.post_file(png, blocks)
    else:
        ts = client.post_message(text, blocks, thread_ts=None, reply_broadcast=False)
    return State(date=today, thread_ts=ts)


def main() -> int:
    token = os.environ.get('SLACK_USER_TOKEN')
    channel = os.environ.get('SLACK_CHANNEL_ID')
    if not token or not channel:
        print(
            '::notice::SLACK_USER_TOKEN または SLACK_CHANNEL_ID が未設定のため'
            ' Slack 投稿をスキップしました'
        )
        return 0
    try:
        state = load_state()
        new_state = notify(
            SlackClient(token, channel),
            state,
            date=os.environ.get('INPUT_DATE', ''),
            score=os.environ.get('INPUT_SCORE', ''),
            note=os.environ.get('INPUT_NOTE') or None,
            today=datetime.now(JST).strftime('%Y-%m-%d'),
            png=find_latest_png(),
            reply_broadcast=parse_bool(os.environ.get('REPLY_BROADCAST'), default=True),
        )
        if new_state != state:
            save_state(new_state)
    except Exception as e:
        print(f'::warning::Slack 投稿に失敗しましたが記録は継続します: {e}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
