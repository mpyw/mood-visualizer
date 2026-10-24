import json
from datetime import UTC, datetime, timedelta

import pytest
from record_mood import JST, Entry, InputError, append_entry, build_summary, main, parse_entry

NOW = datetime(2026, 10, 24, 9, 0, tzinfo=JST)


class TestParseEntry:
    def test_defaults_to_now_in_jst(self):
        entry = parse_entry('', '5', None, NOW.astimezone(UTC))
        assert entry == Entry(date='2026-10-24T09:00:00+09:00', score=5, note=None)

    def test_keeps_the_given_date_as_is(self):
        entry = parse_entry('2026-10-19T09:00:00+09:00', '1', '  memo  ', NOW)
        assert entry == Entry(date='2026-10-19T09:00:00+09:00', score=1, note='memo')

    def test_drops_a_blank_note(self):
        assert parse_entry('', '5', '  \n', NOW).note is None

    @pytest.mark.parametrize(
        ('date', 'message'),
        [
            ('yesterday', 'ISO 8601'),
            ('2026-10-24T09:00:00', 'タイムゾーン'),
            ('2026-10-25T09:00:00+09:00', '未来'),
            # Regression: 2016 typed for 2026 went straight into the history.
            ('2016-10-19T09:00:00+09:00', '打ち間違い'),
        ],
    )
    def test_rejects_bad_dates(self, date, message):
        with pytest.raises(InputError, match=message):
            parse_entry(date, '5', None, NOW)

    def test_allows_a_backfill_within_a_year(self):
        date = (NOW - timedelta(days=300)).isoformat()
        assert parse_entry(date, '5', None, NOW).date == date

    @pytest.mark.parametrize('score', ['-1', '11', 'abc', '', '5.5'])
    def test_rejects_bad_scores(self, score):
        with pytest.raises(InputError):
            parse_entry('', score, None, NOW)

    @pytest.mark.parametrize('score', ['0', '10'])
    def test_accepts_boundary_scores(self, score):
        assert parse_entry('', score, None, NOW).score == int(score)


class TestEntry:
    def test_year_month_is_the_jst_month(self):
        assert Entry('2026-06-30T20:00:00Z', 5, None).year_month == '2026-07'
        assert Entry('2026-06-30T23:59:59+09:00', 5, None).year_month == '2026-06'

    def test_to_json_is_compact_and_keeps_japanese(self):
        assert Entry('2026-06-01T09:00:00+09:00', 5, 'メモ').to_json() == (
            '{"date":"2026-06-01T09:00:00+09:00","score":5,"note":"メモ"}'
        )
        assert Entry('2026-06-01T09:00:00+09:00', 5, None).to_json() == (
            '{"date":"2026-06-01T09:00:00+09:00","score":5}'
        )


class TestAppendEntry:
    def test_appends_and_registers_a_new_month_once(self, tmp_path):
        (tmp_path / 'history-list.jsonl').write_text('{"date":"2026-09"}\n')
        first = Entry('2026-10-01T09:00:00+09:00', 3, None)
        second = Entry('2026-10-02T09:00:00+09:00', 4, 'x')

        append_entry(first, tmp_path)
        history = append_entry(second, tmp_path)

        assert history == tmp_path / 'history' / '2026-10.jsonl'
        assert history.read_text().splitlines() == [first.to_json(), second.to_json()]
        assert (tmp_path / 'history-list.jsonl').read_text().splitlines() == [
            '{"date":"2026-09"}',
            '{"date":"2026-10"}',
        ]

    def test_creates_files_from_scratch(self, tmp_path):
        append_entry(Entry('2026-10-01T09:00:00+09:00', 3, None), tmp_path)
        assert (tmp_path / 'history-list.jsonl').read_text() == '{"date":"2026-10"}\n'


def test_build_summary_escapes_html():
    summary = build_summary(Entry('2026-10-01T00:00:00Z', 3, '<b>&</b>'))
    assert '2026-10-01 09:00:00 JST' in summary
    assert '&lt;b&gt;&amp;&lt;/b&gt;' in summary


class TestMain:
    def test_writes_files_and_outputs(self, tmp_path, monkeypatch):
        output = tmp_path / 'output'
        summary = tmp_path / 'summary'
        monkeypatch.setenv('DATA_DIR', str(tmp_path / 'data'))
        monkeypatch.setenv('GITHUB_OUTPUT', str(output))
        monkeypatch.setenv('GITHUB_STEP_SUMMARY', str(summary))
        monkeypatch.setenv('INPUT_DATE', '')
        monkeypatch.setenv('INPUT_SCORE', '7')
        monkeypatch.setenv('INPUT_NOTE', 'ok')

        assert main() == 0

        # Regression: the commit message used the raw input, which is empty
        # when the date is omitted, so the completed date must be an output.
        (line,) = output.read_text().splitlines()
        assert line.startswith('date=')
        date = line.removeprefix('date=')
        assert datetime.fromisoformat(date).utcoffset() == timedelta(hours=9)
        record = json.loads(next((tmp_path / 'data' / 'history').iterdir()).read_text())
        assert record == {'date': date, 'score': 7, 'note': 'ok'}
        assert '追加されたエントリ' in summary.read_text()

    def test_fails_on_bad_input_without_writing(self, tmp_path, monkeypatch, capsys):
        monkeypatch.setenv('DATA_DIR', str(tmp_path / 'data'))
        monkeypatch.setenv('INPUT_DATE', '2016-10-19T09:00:00+09:00')
        monkeypatch.setenv('INPUT_SCORE', '1')
        monkeypatch.delenv('GITHUB_OUTPUT', raising=False)

        assert main() == 1
        assert '::error::' in capsys.readouterr().out
        assert not (tmp_path / 'data').exists()
