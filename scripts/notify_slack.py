import os
import sys
import json
import time
import glob
import mimetypes
from datetime import datetime, timezone, timedelta
from pathlib import Path
import requests

SLACK_USER_TOKEN = os.environ.get('SLACK_USER_TOKEN')
SLACK_CHANNEL_ID = os.environ.get('SLACK_CHANNEL_ID')
LATEST_FILE = 'public/data/latest-slack-update.json'
REPLY_BROADCAST = os.environ.get('REPLY_BROADCAST', '1')  # "1"=on, "0"=off

def find_latest_png():
    png_files = glob.glob('*_mood_chart.png')
    if not png_files:
        return None
    return max(png_files, key=os.path.getmtime)

def build_blocks(input_date, score, note):
    try:
        s = float(score)
    except Exception:
        s = None
    if s is None: mood_emoji = ':grey_question:'
    elif s >= 10: mood_emoji = ':star-struck:'
    elif s >= 8:  mood_emoji = ':grinning:'
    elif s >= 6:  mood_emoji = ':slightly_smiling_face:'
    elif s >= 4:  mood_emoji = ':neutral_face:'
    elif s >= 2:  mood_emoji = ':slightly_frowning_face:'
    else:         mood_emoji = ':disappointed:'

    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": "新しい気分記録", "emoji": True}},
        {"type": "context", "elements": [{"type": "mrkdwn", "text": f"*記録日*: {input_date}（JST）"}]},
        {"type": "section", "fields": [{"type": "mrkdwn", "text": f"*スコア*\n{score} {mood_emoji}"}]},
    ]
    if note:
        blocks += [
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*メモ*\n>{note}"}}
        ]
    return blocks

def get_upload_url_external(file_path, alt_text=None):
    size = os.path.getsize(file_path)
    headers = {
        'Authorization': f'Bearer {SLACK_USER_TOKEN}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    data = {"filename": os.path.basename(file_path), "length": str(size)}
    if alt_text:
        data["alt_txt"] = alt_text
    resp = requests.post('https://slack.com/api/files.getUploadURLExternal',
                         headers=headers, data=data)
    resp.raise_for_status()
    j = resp.json()
    if not j.get("ok"):
        raise RuntimeError(f"Slack API error (getUploadURLExternal): {j}")
    return j["upload_url"], j["file_id"]

def post_file_bytes_to_upload_url(upload_url, file_path):
    size = os.path.getsize(file_path)
    mime = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
    with open(file_path, 'rb') as f:
        resp = requests.post(upload_url, data=f,
                             headers={'Content-Type': mime, 'Content-Length': str(size)})
    if resp.status_code != 200:
        raise RuntimeError(f"Upload failed: HTTP {resp.status_code} {resp.text[:200]}")

def complete_upload_with_blocks(file_id, channel_id, title, blocks, thread_ts=None):
    # files.completeUploadExternal は reply_broadcast 未対応（thread_ts のみ）
    headers = {'Authorization': f'Bearer {SLACK_USER_TOKEN}',
               'Content-Type': 'application/json; charset=utf-8'}
    payload = {
        "files": [{"id": file_id, "title": title}],
        "channel_id": channel_id,
        "blocks": blocks
        # initial_comment は blocks と同時に送らない（無視される）
    }
    if thread_ts:
        payload["thread_ts"] = thread_ts
    resp = requests.post('https://slack.com/api/files.completeUploadExternal',
                         headers=headers, json=payload)
    resp.raise_for_status()
    j = resp.json()
    if not j.get("ok"):
        raise RuntimeError(f"Slack API error (completeUploadExternal): {j}")
    return j

def get_message_ts_from_file_share(file_id, channel_id, max_retries=6, base_sleep=0.5):
    headers = {'Authorization': f'Bearer {SLACK_USER_TOKEN}'}
    for i in range(max_retries):
        resp = requests.get('https://slack.com/api/files.info',
                            headers=headers, params={"file": file_id})
        resp.raise_for_status()
        j = resp.json()
        if j.get("ok"):
            file = j.get("file", {})
            shares = file.get("shares", {})
            for scope_key in ("public", "private"):
                if scope_key in shares and channel_id in shares[scope_key]:
                    entries = shares[scope_key][channel_id]
                    if entries:
                        ts = entries[-1].get("ts")
                        if ts:
                            return ts
        time.sleep(base_sleep * (2 ** i))
    return None

def chat_post_blocks(channel_id, text, blocks, thread_ts=None, reply_broadcast=False):
    headers = {'Authorization': f'Bearer {SLACK_USER_TOKEN}',
               'Content-Type': 'application/json; charset=utf-8'}
    payload = {"channel": channel_id, "text": text, "blocks": blocks}
    if thread_ts:
        payload["thread_ts"] = thread_ts
        # reply_broadcast は thread_ts とセットのときのみ有効
        if reply_broadcast:
            payload["reply_broadcast"] = True
    resp = requests.post('https://slack.com/api/chat.postMessage', headers=headers, json=payload)
    resp.raise_for_status()
    j = resp.json()
    if not j.get("ok"):
        raise RuntimeError(f"Slack API error (chat.postMessage): {j}")
    return j["ts"]

def load_state():
    if not os.path.exists(LATEST_FILE):
        return {"date": None, "thread_ts": None}
    with open(LATEST_FILE, encoding='utf-8') as f:
        obj = json.load(f)
    return {"date": obj.get("date"), "thread_ts": obj.get("thread_ts")}

def save_state(date_str, thread_ts):
    Path(LATEST_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(LATEST_FILE, 'w', encoding='utf-8') as f:
        json.dump({'date': date_str, 'thread_ts': thread_ts}, f, ensure_ascii=False)

if __name__ == '__main__':
    if not SLACK_USER_TOKEN or not SLACK_CHANNEL_ID:
        print('SLACK_USER_TOKEN または SLACK_CHANNEL_ID が未設定です', file=sys.stderr)
        sys.exit(1)

    score = os.environ.get('INPUT_SCORE')
    note = os.environ.get('INPUT_NOTE')
    input_date = os.environ.get('INPUT_DATE')

    now = datetime.now(timezone(timedelta(hours=9)))
    today_str = now.strftime('%Y-%m-%d')

    state = load_state()
    latest_date = state["date"]
    saved_thread_ts = state["thread_ts"]
    is_first_today = (latest_date != today_str or not saved_thread_ts)

    try:
        text = f'新しい気分記録: {input_date}\nスコア: {score}' + (f'\nメモ: {note}' if note else "")
        blocks = build_blocks(input_date, score, note)

        if is_first_today:
            png_path = find_latest_png()
            if png_path and os.path.exists(png_path):
                upload_url, file_id = get_upload_url_external(png_path, alt_text="今日の気分記録")
                post_file_bytes_to_upload_url(upload_url, png_path)
                complete_upload_with_blocks(file_id, SLACK_CHANNEL_ID,
                                            title=os.path.basename(png_path),
                                            blocks=blocks)
                parent_ts = get_message_ts_from_file_share(file_id, SLACK_CHANNEL_ID)
                save_state(today_str, parent_ts)
            else:
                parent_ts = chat_post_blocks(SLACK_CHANNEL_ID, text=text, blocks=blocks)
                save_state(today_str, parent_ts)
        else:
            # 2回目以降はスレッド返信。reply_broadcast を必要に応じて付ける
            rb = (REPLY_BROADCAST == '1')
            chat_post_blocks(SLACK_CHANNEL_ID, text=text, blocks=blocks,
                             thread_ts=saved_thread_ts, reply_broadcast=rb)

    except Exception as e:
        print(f'Slack 投稿失敗: {e}', file=sys.stderr)
        sys.exit(1)
