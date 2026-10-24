from pathlib import Path

import notify_slack
import pytest
from notify_slack import State, build_blocks, load_state, mood_emoji, notify, parse_bool, save_state


@pytest.mark.parametrize(
    ('score', 'emoji'),
    [
        ('10', ':star-struck:'),
        ('9', ':grinning:'),
        ('8', ':grinning:'),
        ('7', ':slightly_smiling_face:'),
        ('4', ':neutral_face:'),
        ('3', ':slightly_frowning_face:'),
        ('1', ':disappointed:'),
        ('0', ':disappointed:'),
        ('', ':grey_question:'),
        ('x', ':grey_question:'),
    ],
)
def test_mood_emoji(score, emoji):
    assert mood_emoji(score) == emoji


def test_build_blocks_quotes_every_line_of_the_note():
    blocks = build_blocks('2026-10-24T09:00:00+09:00', '5', 'a\nb')
    assert blocks[-1]['text']['text'] == '*メモ*\n>a\n>b'
    assert len(build_blocks('2026-10-24T09:00:00+09:00', '5', None)) == 3


@pytest.mark.parametrize(
    ('value', 'expected'),
    [('1', True), ('true', True), ('True', True), ('0', False), ('false', False), ('', True)],
)
def test_parse_bool(value, expected):
    assert parse_bool(value, default=True) is expected


def test_state_round_trip(tmp_path):
    path = tmp_path / 'state.json'
    assert load_state(path) == State()
    save_state(State('2026-10-24', '123.456'), path)
    assert load_state(path) == State('2026-10-24', '123.456')


class FakeClient:
    def __init__(self):
        self.calls = []

    def post_message(self, text, blocks, thread_ts, reply_broadcast):
        self.calls.append(('message', thread_ts, reply_broadcast))
        return 'msg-ts'

    def post_file(self, path, blocks):
        self.calls.append(('file', path))
        return 'file-ts'


def run(state, png=None, reply_broadcast=True):
    client = FakeClient()
    new_state = notify(
        client,
        state,
        date='2026-10-24T09:00:00+09:00',
        score='5',
        note=None,
        today='2026-10-24',
        png=png,
        reply_broadcast=reply_broadcast,
    )
    return client.calls, new_state


def test_first_post_of_the_day_starts_a_thread_with_the_chart():
    calls, state = run(State('2026-10-23', 'old'), png=Path('chart.png'))
    assert calls == [('file', Path('chart.png'))]
    assert state == State('2026-10-24', 'file-ts')


def test_first_post_without_a_chart_posts_a_message():
    calls, state = run(State(), png=None)
    assert calls == [('message', None, False)]
    assert state == State('2026-10-24', 'msg-ts')


@pytest.mark.parametrize('broadcast', [True, False])
def test_later_posts_reply_in_the_thread(broadcast):
    state = State('2026-10-24', 'thread')
    calls, new_state = run(state, png=Path('chart.png'), reply_broadcast=broadcast)
    assert calls == [('message', 'thread', broadcast)]
    assert new_state == state


def test_starts_a_new_thread_when_the_saved_one_has_no_ts():
    calls, _ = run(State('2026-10-24', None))
    assert calls == [('message', None, False)]


def test_main_skips_without_credentials(monkeypatch, capsys):
    monkeypatch.delenv('SLACK_USER_TOKEN', raising=False)
    assert notify_slack.main() == 0
    assert '::notice::' in capsys.readouterr().out


def test_main_never_fails_the_workflow(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv('SLACK_USER_TOKEN', 'x')
    monkeypatch.setenv('SLACK_CHANNEL_ID', 'C1')
    monkeypatch.chdir(tmp_path)

    def boom(*args, **kwargs):
        raise RuntimeError('token revoked')

    monkeypatch.setattr(notify_slack, 'notify', boom)
    assert notify_slack.main() == 0
    assert 'token revoked' in capsys.readouterr().out
