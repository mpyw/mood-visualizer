import { describe, expect, it } from 'vitest'
import type { MoodRecord } from './mood'
import { latestOfDay, parsePermalink, resolvePermalink } from './permalink'

describe('parsePermalink', () => {
  it.each([
    ['#2026-06', { kind: 'month', month: '2026-06' }],
    ['2026-06', { kind: 'month', month: '2026-06' }],
    ['#2026-06-15', { kind: 'day', month: '2026-06', day: '2026-06-15' }],
    [
      '#2026-06-15T08:04:03.638603+09:00',
      {
        kind: 'record',
        month: '2026-06',
        date: '2026-06-15T08:04:03.638603+09:00',
      },
    ],
    [
      // percent-encoded by some clients
      '#2026-06-15T08:04:03%2B09:00',
      { kind: 'record', month: '2026-06', date: '2026-06-15T08:04:03+09:00' },
    ],
    [
      // the month is the JST month of the instant
      '#2026-06-30T20:00:00Z',
      { kind: 'record', month: '2026-07', date: '2026-06-30T20:00:00Z' },
    ],
  ])('%s', (hash, expected) => {
    expect(parsePermalink(hash)).toEqual(expected)
  })

  it.each(['', '#', '#foo', '#2026-13', '#2026-02-30', '#2026-06-15Tnope'])(
    'rejects %j',
    (hash) => {
      expect(parsePermalink(hash)).toBeNull()
    }
  )
})

describe('resolvePermalink / latestOfDay', () => {
  const records: MoodRecord[] = [
    { date: '2026-06-16T00:30:00+09:00', score: 1 },
    { date: '2026-06-15T21:00:00+09:00', score: 2 },
    { date: '2026-06-15T12:00:00+09:00', score: 3, note: 'lunch' },
    { date: '2026-06-15T08:00:00+09:00', score: 4, note: 'morning' },
  ]

  it('finds an exact record', () => {
    expect(
      resolvePermalink(records, {
        kind: 'record',
        month: '2026-06',
        date: '2026-06-15T12:00:00+09:00',
      })
    ).toBe(records[2])
  })

  it('finds the latest record of a day', () => {
    expect(
      resolvePermalink(records, {
        kind: 'day',
        month: '2026-06',
        day: '2026-06-15',
      })
    ).toBe(records[1])
  })

  it('does not jump for a month link', () => {
    expect(
      resolvePermalink(records, { kind: 'month', month: '2026-06' })
    ).toBeUndefined()
  })

  it('prefers the latest record with a note when asked', () => {
    expect(latestOfDay(records, '2026-06-15', { preferNote: true })).toBe(
      records[2]
    )
    // falls back to any record when the day has no note
    expect(latestOfDay(records, '2026-06-16', { preferNote: true })).toBe(
      records[0]
    )
  })

  it('returns undefined for a day without records', () => {
    expect(latestOfDay(records, '2026-06-14')).toBeUndefined()
  })
})
