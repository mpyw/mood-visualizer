import { isYearMonth, type YearMonth } from './month'

export const MIN_SCORE = 0
export const MAX_SCORE = 10

export type MoodRecord = {
  /** ISO 8601 timestamp with a UTC offset. */
  date: string
  /** Integer from 0 to 10. */
  score: number
  note?: string
}

export function isMoodRecord(value: unknown): value is MoodRecord {
  if (typeof value !== 'object' || value === null) return false
  const { date, score, note } = value as Record<string, unknown>
  return (
    typeof date === 'string' &&
    !Number.isNaN(Date.parse(date)) &&
    Number.isInteger(score) &&
    (score as number) >= MIN_SCORE &&
    (score as number) <= MAX_SCORE &&
    (note === undefined || typeof note === 'string')
  )
}

export function hasNote(record: MoodRecord): boolean {
  return !!record.note?.trim()
}

export function timestampOf(record: MoodRecord): number {
  return Date.parse(record.date)
}

/** Sorts records newest first. */
export function sortRecordsDesc(records: readonly MoodRecord[]): MoodRecord[] {
  return records.toSorted((a, b) => timestampOf(b) - timestampOf(a))
}

/**
 * Merges record lists, keeps one record per timestamp string and sorts them
 * newest first. The timestamp string is the record ID (it is used as the URL
 * hash and as the RSS guid).
 */
export function mergeRecords(
  ...lists: readonly (readonly MoodRecord[])[]
): MoodRecord[] {
  const byDate = new Map<string, MoodRecord>()
  for (const list of lists) {
    for (const record of list) byDate.set(record.date, record)
  }
  return sortRecordsDesc([...byDate.values()])
}

/** Entry of `history-list.jsonl`. */
export type MonthListEntry = { date: YearMonth }

export function isMonthListEntry(value: unknown): value is MonthListEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    isYearMonth((value as Record<string, unknown>).date)
  )
}

/** Mood levels from best to worst. `minScore` is inclusive. */
export const MOOD_LEVELS = [
  { minScore: 10, emoji: 'star-struck' },
  { minScore: 8, emoji: 'grinning' },
  { minScore: 6, emoji: 'slightly_smiling_face' },
  { minScore: 4, emoji: 'neutral_face' },
  { minScore: 2, emoji: 'slightly_frowning_face' },
  { minScore: MIN_SCORE, emoji: 'disappointed' },
] as const

export type MoodEmoji = (typeof MOOD_LEVELS)[number]['emoji']

export function moodEmojiOf(score: number): MoodEmoji {
  const level = MOOD_LEVELS.find((l) => score >= l.minScore)
  return level?.emoji ?? 'disappointed'
}

/** Avatar file name under `public/`, for example `mpyw-grinning.png`. */
export function avatarFileOf(score: number): string {
  return `mpyw-${moodEmojiOf(score)}.png`
}
