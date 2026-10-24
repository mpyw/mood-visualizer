import { describe, expect, it } from 'vitest'
import type { MoodRecord } from './mood'
import {
  buildChartRows,
  dayLabel,
  selectChartDays,
  summarizeByDay,
  type MoodDaySummary,
} from './summary'
import { parseJst } from './time'

const r = (date: string, score: number, note?: string): MoodRecord =>
  note === undefined ? { date, score } : { date, score, note }

describe('summarizeByDay', () => {
  it('groups by JST day and computes OHLC and average', () => {
    const summaries = summarizeByDay([
      // given newest first, as the app holds them
      r('2026-06-02T08:00:00+09:00', 9),
      r('2026-06-01T23:59:00+09:00', 2, 'late'),
      r('2026-06-01T12:00:00+09:00', 8),
      r('2026-06-01T09:00:00+09:00', 5, 'morning'),
    ])
    expect(summaries).toEqual([
      {
        date: '2026-06-01',
        open: 5,
        high: 8,
        low: 2,
        close: 2,
        avg: 5,
        notes: ['morning', 'late'],
      },
      {
        date: '2026-06-02',
        open: 9,
        high: 9,
        low: 9,
        close: 9,
        avg: 9,
        notes: [],
      },
    ])
  })

  it('assigns UTC timestamps to their JST day', () => {
    const [summary] = summarizeByDay([r('2026-06-01T15:00:00Z', 4)])
    expect(summary.date).toBe('2026-06-02')
  })

  it('returns nothing for no records', () => {
    expect(summarizeByDay([])).toEqual([])
  })
})

describe('buildChartRows', () => {
  const summaries = summarizeByDay([
    r('2026-06-02T09:00:00+09:00', 0),
    r('2026-06-02T21:00:00+09:00', 6),
    r('2026-06-30T09:00:00+09:00', 7),
  ])

  it('has one row per day of a past month', () => {
    const rows = buildChartRows(
      '2026-06',
      summaries,
      parseJst('2026-10-24T12:00')
    )
    expect(rows).toHaveLength(30)
    expect(rows[0]).toEqual({ present: false, date: '2026-06-01' })
    expect(rows[1]).toEqual({
      present: true,
      date: '2026-06-02',
      avg: 3,
      low: 0,
      high: 6,
      // a low of 0 must still give a visible range
      range: [0, 6],
    })
    expect(rows[29]).toMatchObject({ present: true, date: '2026-06-30' })
  })

  it('stops at today in the current month', () => {
    const rows = buildChartRows(
      '2026-06',
      summaries.slice(0, 1),
      parseJst('2026-06-02T00:10')
    )
    expect(rows.map((row) => row.date)).toEqual(['2026-06-01', '2026-06-02'])
  })

  it('handles leap years', () => {
    expect(buildChartRows('2028-02', [], parseJst('2030-01-01'))).toHaveLength(
      29
    )
  })

  it('has no rows for a future month', () => {
    expect(buildChartRows('2026-11', [], parseJst('2026-10-24'))).toEqual([])
  })
})

/** One summary per given day, as if each day had a single record. */
const days = (...dates: string[]): MoodDaySummary[] =>
  dates.map((date) => ({
    date,
    open: 5,
    high: 5,
    low: 5,
    close: 5,
    avg: 5,
    notes: [],
  }))

/** Every day from `from` for `count` days. */
const run = (from: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) =>
    parseJst(from).add(i, 'day').format('YYYY-MM-DD')
  )

const datesOf = (summaries: readonly MoodDaySummary[]) =>
  summaries.map((s) => s.date)

describe('selectChartDays', () => {
  const prev = run('2026-05-01', 31)
  const next = run('2026-07-01', 31)

  it('keeps only the month without adjacent months', () => {
    const all = days(...prev.slice(-3), '2026-06-10', ...next.slice(0, 3))
    expect(datesOf(selectChartDays(all, '2026-06', false))).toEqual([
      '2026-06-10',
    ])
  })

  it('fills up to 30 days, alternating before and after', () => {
    const all = days(...prev, '2026-06-10', '2026-06-20', ...next)
    const picked = datesOf(selectChartDays(all, '2026-06', true))
    expect(picked).toHaveLength(30)
    // 28 extra days: 14 from each side, the closest ones
    expect(picked).toEqual([
      ...run('2026-05-18', 14),
      '2026-06-10',
      '2026-06-20',
      ...run('2026-07-01', 14),
    ])
  })

  it('takes the odd extra day from before the month', () => {
    const all = days(...prev, '2026-06-10', ...next)
    const picked = datesOf(selectChartDays(all, '2026-06', true))
    expect(picked.filter((d) => d < '2026-06')).toHaveLength(15)
    expect(picked.filter((d) => d > '2026-06-31')).toHaveLength(14)
  })

  it('fills from the other side when one side runs out', () => {
    // The current month: no next month yet.
    const all = days(...prev, '2026-06-01', '2026-06-02')
    expect(datesOf(selectChartDays(all, '2026-06', true))).toEqual([
      ...run('2026-05-04', 28),
      '2026-06-01',
      '2026-06-02',
    ])
  })

  it('shows everything when there are fewer than 30 days in total', () => {
    const all = days('2026-05-31', '2026-06-15', '2026-07-01')
    expect(datesOf(selectChartDays(all, '2026-06', true))).toEqual([
      '2026-05-31',
      '2026-06-15',
      '2026-07-01',
    ])
  })

  it('never drops days of the month, even past the limit', () => {
    // Regression: the old code cut the list to 30 days from the start and
    // lost the 31st.
    const july = run('2026-07-01', 31)
    const all = days(...prev, ...july, ...run('2026-08-01', 5))
    expect(datesOf(selectChartDays(all, '2026-07', true))).toEqual(july)
  })

  it('fills only from adjacent months when the month is empty', () => {
    const all = days(...prev.slice(-2))
    expect(datesOf(selectChartDays(all, '2026-06', true))).toEqual(
      prev.slice(-2)
    )
  })

  it('accepts unsorted input', () => {
    const all = days('2026-07-01', '2026-06-15', '2026-05-31')
    expect(datesOf(selectChartDays(all, '2026-06', true))).toEqual([
      '2026-05-31',
      '2026-06-15',
      '2026-07-01',
    ])
  })
})

describe('buildChartRows with adjacent days', () => {
  it('stretches the axis to cover adjacent days', () => {
    // Regression: the axis was fixed to the selected month, so the days
    // added from adjacent months were never drawn.
    const rows = buildChartRows(
      '2026-06',
      days('2026-05-30', '2026-06-15', '2026-07-02'),
      parseJst('2026-10-24')
    )
    expect(rows[0]).toMatchObject({ date: '2026-05-30', present: true })
    expect(rows.at(-1)).toMatchObject({ date: '2026-07-02', present: true })
    expect(rows).toHaveLength(2 + 30 + 2)
    expect(rows.filter((row) => row.present)).toHaveLength(3)
  })

  it('still covers the whole month up to today', () => {
    const rows = buildChartRows(
      '2026-10',
      days('2026-09-28'),
      parseJst('2026-10-24T09:00')
    )
    expect(rows[0].date).toBe('2026-09-28')
    expect(rows.at(-1)?.date).toBe('2026-10-24')
  })
})

describe('dayLabel', () => {
  it('adds the month only outside the selected month', () => {
    expect(dayLabel('2026-06-15', '2026-06')).toBe('15(Mon)')
    expect(dayLabel('2026-07-01', '2026-06')).toBe('7/1(Wed)')
  })
})
