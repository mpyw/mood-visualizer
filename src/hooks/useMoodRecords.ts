import { useEffect, useState } from 'react'
import { fetchMonthRecords } from '../api/history'
import { shiftMonth, type YearMonth } from '../domain/month'
import { mergeRecords, type MoodRecord } from '../domain/mood'

export type MoodRecordsState =
  | { status: 'loading' }
  | { status: 'success'; records: MoodRecord[] }
  | { status: 'error' }

/** Months to load: the selected one, plus its neighbors when requested. */
export function monthsToLoad(
  month: YearMonth,
  includeAdjacent: boolean,
  available: readonly YearMonth[]
): YearMonth[] {
  const wanted = includeAdjacent
    ? [shiftMonth(month, -1), month, shiftMonth(month, 1)]
    : [month]
  return wanted.filter((m) => available.includes(m))
}

/**
 * Loads records of `month` (and the months next to it with `includeAdjacent`)
 * newest first. A response for a previous selection never overwrites a newer
 * one.
 */
export function useMoodRecords(
  month: YearMonth,
  includeAdjacent: boolean,
  available: readonly YearMonth[]
): MoodRecordsState {
  const targets = monthsToLoad(month, includeAdjacent, available)
  const key = targets.join(',')
  const [loaded, setLoaded] = useState<{
    key: string
    state: MoodRecordsState
  }>()

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    Promise.all(
      key.split(',').map((m) => fetchMonthRecords(m, controller.signal))
    ).then(
      (lists) =>
        setLoaded({
          key,
          state: { status: 'success', records: mergeRecords(...lists) },
        }),
      () => {
        if (!controller.signal.aborted) {
          setLoaded({ key, state: { status: 'error' } })
        }
      }
    )
    return () => controller.abort()
  }, [key])

  if (!key) return { status: 'success', records: [] }
  return loaded?.key === key ? loaded.state : { status: 'loading' }
}
