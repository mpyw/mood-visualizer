"""Appends a mood record to public/data. Called by the record workflow."""

from __future__ import annotations

import html
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

JST = timezone(timedelta(hours=9))
MIN_SCORE = 0
MAX_SCORE = 10
# Catches typos such as 2016 for 2026 while still allowing backfills.
MAX_AGE = timedelta(days=366)
# Allows small clock differences between the runner and the author.
MAX_FUTURE = timedelta(minutes=10)


class InputError(ValueError):
    pass


@dataclass(frozen=True)
class Entry:
    date: str
    score: int
    note: str | None

    @property
    def year_month(self) -> str:
        """`YYYY-MM` of the record in JST, which names its history file."""
        return datetime.fromisoformat(self.date).astimezone(JST).strftime('%Y-%m')

    def to_json(self) -> str:
        data: dict[str, object] = {'date': self.date, 'score': self.score}
        if self.note:
            data['note'] = self.note
        return json.dumps(data, ensure_ascii=False, separators=(',', ':'))


def parse_entry(date: str | None, score: str, note: str | None, now: datetime) -> Entry:
    """Validates the workflow inputs. An empty date means `now` in JST."""
    if not date:
        date = now.astimezone(JST).isoformat()
    try:
        parsed = datetime.fromisoformat(date)
    except ValueError:
        raise InputError(f'date は ISO 8601 形式で入力してください: {date}') from None
    if parsed.tzinfo is None:
        raise InputError(f'date にはタイムゾーン (例: +09:00) を含めてください: {date}')
    if parsed > now + MAX_FUTURE:
        raise InputError(f'date が未来の日時です: {date}')
    if parsed < now - MAX_AGE:
        raise InputError(f'date が 1 年以上前です。年の打ち間違いではありませんか: {date}')

    try:
        value = int(score)
    except ValueError:
        raise InputError(f'score は整数で入力してください: {score}') from None
    if not MIN_SCORE <= value <= MAX_SCORE:
        raise InputError(f'score は {MIN_SCORE} から {MAX_SCORE} の整数です: {score}')

    return Entry(date=date, score=value, note=note.strip() if note and note.strip() else None)


def append_entry(entry: Entry, data_dir: Path) -> Path:
    """Appends the record and registers its month. Returns the history file."""
    history_file = data_dir / 'history' / f'{entry.year_month}.jsonl'
    history_file.parent.mkdir(parents=True, exist_ok=True)
    with history_file.open('a', encoding='utf-8') as f:
        f.write(entry.to_json() + '\n')

    list_file = data_dir / 'history-list.jsonl'
    if entry.year_month not in read_months(list_file):
        with list_file.open('a', encoding='utf-8') as f:
            f.write(json.dumps({'date': entry.year_month}, separators=(',', ':')) + '\n')
    return history_file


def read_months(list_file: Path) -> set[str]:
    if not list_file.exists():
        return set()
    months = set()
    for line in list_file.read_text(encoding='utf-8').splitlines():
        try:
            months.add(json.loads(line)['date'])
        except (ValueError, KeyError, TypeError):
            continue
    return months


def build_summary(entry: Entry) -> str:
    """Markdown for $GITHUB_STEP_SUMMARY."""
    jst = datetime.fromisoformat(entry.date).astimezone(JST)
    rows = [
        ('Date', jst.strftime('%Y-%m-%d %H:%M:%S JST')),
        ('Score', str(entry.score)),
    ]
    if entry.note:
        rows.append(('Note', entry.note))
    cells = ''.join(f'<tr><th>{k}</th><td>{html.escape(v)}</td></tr>' for k, v in rows)
    return f'### 追加されたエントリ\n\n<table>{cells}</table>\n'


def main() -> int:
    try:
        entry = parse_entry(
            os.environ.get('INPUT_DATE'),
            os.environ.get('INPUT_SCORE', ''),
            os.environ.get('INPUT_NOTE'),
            datetime.now(JST),
        )
    except InputError as e:
        print(f'::error::{e}')
        return 1

    history_file = append_entry(entry, Path(os.environ.get('DATA_DIR', 'public/data')))
    print(f'Appended to {history_file}: {entry.to_json()}')

    if path := os.environ.get('GITHUB_OUTPUT'):
        with Path(path).open('a', encoding='utf-8') as f:
            f.write(f'date={entry.date}\n')
    if path := os.environ.get('GITHUB_STEP_SUMMARY'):
        with Path(path).open('a', encoding='utf-8') as f:
            f.write(build_summary(entry))
    return 0


if __name__ == '__main__':
    sys.exit(main())
