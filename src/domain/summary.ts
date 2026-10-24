import type { YearMonth } from './month'
import { timestampOf, type MoodRecord } from './mood'
import { parseJst, toJstDate, type Dayjs } from './time'

export type MoodDaySummary = {
  /** `YYYY-MM-DD` in JST. */
  date: string
  open: number
  high: number
  low: number
  close: number
  avg: number
  notes: string[]
}

/** Groups records by JST day. Days are sorted oldest first. */
export function summarizeByDay(
  records: readonly MoodRecord[]
): MoodDaySummary[] {
  const byDay = new Map<string, MoodRecord[]>()
  const chronological = records.toSorted(
    (a, b) => timestampOf(a) - timestampOf(b)
  )
  for (const record of chronological) {
    const day = toJstDate(record.date)
    const list = byDay.get(day)
    if (list) list.push(record)
    else byDay.set(day, [record])
  }
  return [...byDay.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([date, recs]) => {
      const scores = recs.map((r) => r.score)
      return {
        date,
        open: scores[0],
        high: Math.max(...scores),
        low: Math.min(...scores),
        close: scores[scores.length - 1],
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        notes: recs.flatMap((r) => (r.note ? [r.note] : [])),
      }
    })
}

/** How many days with records the chart shows with adjacent months on. */
export const ADJACENT_DAY_LIMIT = 30

/**
 * Picks the days the chart plots.
 *
 * Every day of `month` is always kept. With `includeAdjacent`, days from the
 * previous and the next month are added until there are `limit` days, taking
 * turns: the latest day before the month, then the earliest day after it,
 * and so on. When one side runs out, the other side fills the rest.
 */
export function selectChartDays(
  summaries: readonly MoodDaySummary[],
  month: YearMonth,
  includeAdjacent: boolean,
  limit = ADJACENT_DAY_LIMIT
): MoodDaySummary[] {
  const monthOf = (s: MoodDaySummary) => s.date.slice(0, 7)
  const sorted = summaries.toSorted((a, b) => a.date.localeCompare(b.date))
  const picked = sorted.filter((s) => monthOf(s) === month)
  if (!includeAdjacent) return picked

  const before = sorted.filter((s) => monthOf(s) < month)
  const after = sorted.filter((s) => monthOf(s) > month)
  let b = before.length - 1
  let a = 0
  let takeBefore = true
  while (picked.length < limit && (b >= 0 || a < after.length)) {
    if ((takeBefore && b >= 0) || a >= after.length) {
      picked.unshift(before[b--])
    } else {
      picked.push(after[a++])
    }
    takeBefore = !takeBefore
  }
  return picked
}

export type ChartRow =
  | {
      present: true
      date: string
      avg: number
      low: number
      high: number
      /** `[low, high]` for the range bar. */
      range: [number, number]
    }
  | { present: false; date: string }

/**
 * Builds one row per day for the x-axis. The axis covers the whole `month`
 * (up to `today` for the current month) and stretches to include every day
 * in `days`. Days without records get a placeholder row so the axis stays
 * continuous.
 */
export function buildChartRows(
  month: YearMonth,
  days: readonly MoodDaySummary[],
  today: Dayjs
): ChartRow[] {
  const monthStart = parseJst(`${month}-01`)
  const monthEnd = monthStart.endOf('month').startOf('day')
  const lastDay = today.startOf('day')
  const dates = days.map((d) => parseJst(d.date))
  const start = dates.reduce(
    (min, d) => (d.isBefore(min) ? d : min),
    monthStart
  )
  let end = monthEnd.isBefore(lastDay) ? monthEnd : lastDay
  end = dates.reduce((max, d) => (d.isAfter(max) ? d : max), end)

  const count = Math.max(0, end.diff(start, 'day') + 1)
  const byDate = new Map(days.map((s) => [s.date, s]))
  return Array.from({ length: count }, (_, i): ChartRow => {
    const date = start.add(i, 'day').format('YYYY-MM-DD')
    const s = byDate.get(date)
    if (!s) return { present: false, date }
    return {
      present: true,
      date,
      avg: s.avg,
      low: s.low,
      high: s.high,
      range: [s.low, s.high],
    }
  })
}

/** Axis label: `15(Mon)` inside the selected month, `7/1(Wed)` outside it. */
export function dayLabel(date: string, month: YearMonth): string {
  return parseJst(date).format(date.startsWith(month) ? 'D(ddd)' : 'M/D(ddd)')
}
