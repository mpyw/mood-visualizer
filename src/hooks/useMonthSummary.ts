import { useEffect, useCallback, useReducer } from 'react'
import {
  parseJsonl,
  groupByDate,
  type MoodRecord,
  type MoodDaySummary,
} from '../utils/parseJsonl'

const BASE_PATH = import.meta.env.VITE_BASE_PATH || ''
const MOOD_HISTORY_PATH = `${BASE_PATH}/data/history/`

// 状態型
interface State {
  summary: MoodDaySummary[]
  records: MoodRecord[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; summary: MoodDaySummary[]; records: MoodRecord[] }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'ADD_RECORDS'; records: MoodRecord[] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null }
    case 'FETCH_SUCCESS':
      return {
        ...state,
        summary: action.summary,
        records: action.records,
        loading: false,
        error: null,
      }
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error }
    case 'ADD_RECORDS': {
      // 重複排除
      const merged = [
        ...state.records,
        ...action.records.filter(
          (fr) =>
            !state.records.some(
              (r) =>
                r.date === fr.date && r.score === fr.score && r.note === fr.note
            )
        ),
      ]
      merged.sort((a, b) => (a.date < b.date ? 1 : -1))
      return { ...state, records: merged }
    }
    default:
      return state
  }
}

export function useMonthSummary(
  selectedMonth: string,
  includeAdjacent: boolean,
  months: string[]
) {
  const [state, dispatch] = useReducer(reducer, {
    summary: [],
    records: [],
    loading: false,
    error: null,
  })

  const tryFetchRecordByDate = useCallback(
    async (date: string): Promise<null | MoodRecord> => {
      const month = date.slice(0, 7)
      if (!months.includes(month)) return null
      try {
        const res = await fetch(`${MOOD_HISTORY_PATH}${month}.jsonl`)
        if (!res.ok) return null
        const text = await res.text()
        const fetchedRecords = parseJsonl(text)
        const found = fetchedRecords.filter((r) => r.date.startsWith(date))
        if (found.length > 0) {
          dispatch({ type: 'ADD_RECORDS', records: fetchedRecords })
          return found[0]
        }
        return null
      } catch {
        return null
      }
    },
    [months]
  )

  useEffect(() => {
    if (!selectedMonth) return
    ;(async () => {
      dispatch({ type: 'FETCH_START' })
      try {
        let allRecords: MoodRecord[] = []
        if (includeAdjacent) {
          const [year, month] = selectedMonth.split('-').map(Number)
          const prevMonth =
            month === 1
              ? `${year - 1}-12`
              : `${year}-${String(month - 1).padStart(2, '0')}`
          const nextMonth =
            month === 12
              ? `${year + 1}-01`
              : `${year}-${String(month + 1).padStart(2, '0')}`
          const prevMonthExists = months.includes(prevMonth)
          const nextMonthExists = months.includes(nextMonth)
          const fetches = [
            prevMonthExists
              ? fetch(`${MOOD_HISTORY_PATH}${prevMonth}.jsonl`).then((r) =>
                  r.ok ? r.text() : ''
                )
              : Promise.resolve(''),
            fetch(`${MOOD_HISTORY_PATH}${selectedMonth}.jsonl`).then((r) =>
              r.ok ? r.text() : ''
            ),
            nextMonthExists
              ? fetch(`${MOOD_HISTORY_PATH}${nextMonth}.jsonl`).then((r) =>
                  r.ok ? r.text() : ''
                )
              : Promise.resolve(''),
          ]
          const [prevText, currText, nextText] = await Promise.all(fetches)
          const prev = parseJsonl(prevText)
          const curr = parseJsonl(currText)
          const next = parseJsonl(nextText)
          allRecords = [...prev, ...curr, ...next]
          const result = [...curr]
          let prevIdx = prev.length - 1
          let nextIdx = 0
          let turn = 0
          while (
            result.length < 30 &&
            (prevIdx >= 0 || nextIdx < next.length)
          ) {
            if (turn % 2 === 0 && prevIdx >= 0) {
              result.unshift(prev[prevIdx--])
            } else if (turn % 2 === 1 && nextIdx < next.length) {
              result.push(next[nextIdx++])
            } else if (prevIdx >= 0) {
              result.unshift(prev[prevIdx--])
            } else if (nextIdx < next.length) {
              result.push(next[nextIdx++])
            }
            turn++
          }
          dispatch({
            type: 'FETCH_SUCCESS',
            summary: groupByDate(result),
            records: allRecords.sort((a, b) => (a.date < b.date ? 1 : -1)),
          })
        } else {
          const currText = await fetch(
            `${MOOD_HISTORY_PATH}${selectedMonth}.jsonl`
          ).then((r) => (r.ok ? r.text() : ''))
          allRecords = parseJsonl(currText)
          dispatch({
            type: 'FETCH_SUCCESS',
            summary: groupByDate(allRecords),
            records: allRecords.sort((a, b) => (a.date < b.date ? 1 : -1)),
          })
        }
      } catch {
        dispatch({ type: 'FETCH_ERROR', error: 'データ取得に失敗しました' })
      }
    })()
  }, [selectedMonth, includeAdjacent, months])

  return { ...state, tryFetchRecordByDate }
}
