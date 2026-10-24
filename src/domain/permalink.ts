import type { YearMonth } from './month'
import { hasNote, timestampOf, type MoodRecord } from './mood'
import { parseJst, toJst, toJstDate } from './time'

/**
 * What a URL hash points at.
 *
 * - `#2026-06` opens the month.
 * - `#2026-06-15` opens the month and jumps to the latest record of the day.
 * - `#2026-06-15T08:04:03+09:00` jumps to that exact record. This is the form
 *   the timeline writes and the RSS feed links to.
 */
export type Permalink =
  | { kind: 'month'; month: YearMonth }
  | { kind: 'day'; month: YearMonth; day: string }
  | { kind: 'record'; month: YearMonth; date: string }

export function parsePermalink(hash: string): Permalink | null {
  const value = decodeURIComponent(hash.replace(/^#/, ''))
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return { kind: 'month', month: value }
  }
  if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) {
    const day = parseJst(value)
    if (!day.isValid() || day.format('YYYY-MM-DD') !== value) return null
    return { kind: 'day', month: day.format('YYYY-MM'), day: value }
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value))) {
    return {
      kind: 'record',
      month: toJst(value).format('YYYY-MM'),
      date: value,
    }
  }
  return null
}

/** Picks the record a permalink points at, or `undefined`. */
export function resolvePermalink(
  records: readonly MoodRecord[],
  link: Permalink
): MoodRecord | undefined {
  switch (link.kind) {
    case 'month':
      return undefined
    case 'record':
      return records.find((r) => r.date === link.date)
    case 'day':
      return latestOfDay(records, link.day)
  }
}

/**
 * Latest record of a JST day. With `preferNote`, records with a note win so
 * the jump target stays visible while the "notes only" filter is on.
 */
export function latestOfDay(
  records: readonly MoodRecord[],
  day: string,
  { preferNote = false } = {}
): MoodRecord | undefined {
  const ofDay = records.filter((r) => toJstDate(r.date) === day)
  const candidates =
    preferNote && ofDay.some(hasNote) ? ofDay.filter(hasNote) : ofDay
  return candidates.reduce<MoodRecord | undefined>(
    (latest, r) =>
      !latest || timestampOf(r) > timestampOf(latest) ? r : latest,
    undefined
  )
}
