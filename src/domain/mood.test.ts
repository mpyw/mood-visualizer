import { describe, expect, it } from 'vitest'
import {
  avatarFileOf,
  hasNote,
  isMonthListEntry,
  isMoodRecord,
  mergeRecords,
  moodEmojiOf,
  sortRecordsDesc,
  type MoodRecord,
} from './mood'

describe('isMoodRecord', () => {
  it.each([
    { date: '2026-06-01T09:00:00+09:00', score: 0 },
    { date: '2026-06-01T09:00:00.123456+09:00', score: 10, note: 'x' },
    { date: '2026-06-01T00:00:00Z', score: 5, note: '' },
  ])('accepts %j', (value) => {
    expect(isMoodRecord(value)).toBe(true)
  })

  it.each([
    null,
    'x',
    {},
    { date: '2026-06-01T09:00:00+09:00' },
    { date: 'not a date', score: 5 },
    { date: '2026-06-01T09:00:00+09:00', score: -1 },
    { date: '2026-06-01T09:00:00+09:00', score: 11 },
    { date: '2026-06-01T09:00:00+09:00', score: 5.5 },
    { date: '2026-06-01T09:00:00+09:00', score: '5' },
    { date: '2026-06-01T09:00:00+09:00', score: 5, note: 1 },
  ])('rejects %j', (value) => {
    expect(isMoodRecord(value)).toBe(false)
  })
})

describe('isMonthListEntry', () => {
  it('accepts only valid months', () => {
    expect(isMonthListEntry({ date: '2026-06' })).toBe(true)
    expect(isMonthListEntry({ date: '2026-13' })).toBe(false)
    expect(isMonthListEntry({})).toBe(false)
    expect(isMonthListEntry(null)).toBe(false)
  })
})

describe('hasNote', () => {
  it('ignores blank notes', () => {
    expect(hasNote({ date: '', score: 1, note: 'x' })).toBe(true)
    expect(hasNote({ date: '', score: 1, note: ' \n' })).toBe(false)
    expect(hasNote({ date: '', score: 1 })).toBe(false)
  })
})

describe('sortRecordsDesc / mergeRecords', () => {
  const a: MoodRecord = { date: '2026-06-01T09:00:00+09:00', score: 1 }
  const b: MoodRecord = { date: '2026-06-01T01:00:00Z', score: 2 } // 10:00 JST
  const c: MoodRecord = { date: '2026-06-02T09:00:00.5+09:00', score: 3 }

  it('sorts by instant, not by string', () => {
    expect(sortRecordsDesc([a, b, c])).toEqual([c, b, a])
  })

  it('does not mutate the input', () => {
    const input = [a, c]
    sortRecordsDesc(input)
    expect(input).toEqual([a, c])
  })

  it('merges lists and keeps one record per timestamp', () => {
    const edited = { ...a, note: 'edited' }
    expect(mergeRecords([a, b], [c, edited])).toEqual([c, b, edited])
  })
})

describe('moodEmojiOf / avatarFileOf', () => {
  it.each([
    [10, 'star-struck'],
    [9, 'grinning'],
    [8, 'grinning'],
    [7, 'slightly_smiling_face'],
    [6, 'slightly_smiling_face'],
    [5, 'neutral_face'],
    [4, 'neutral_face'],
    [3, 'slightly_frowning_face'],
    [2, 'slightly_frowning_face'],
    [1, 'disappointed'],
    [0, 'disappointed'],
  ])('score %i -> %s', (score, emoji) => {
    expect(moodEmojiOf(score)).toBe(emoji)
    expect(avatarFileOf(score)).toBe(`mpyw-${emoji}.png`)
  })
})
