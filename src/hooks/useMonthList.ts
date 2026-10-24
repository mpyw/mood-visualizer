import { useEffect, useState } from 'react'
import { fetchMonthList } from '../api/history'
import type { YearMonth } from '../domain/month'

export type MonthListState =
  | { status: 'loading' }
  | { status: 'success'; months: YearMonth[] }
  | { status: 'error' }

export function useMonthList(): MonthListState {
  const [state, setState] = useState<MonthListState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchMonthList(controller.signal).then(
      (months) => setState({ status: 'success', months }),
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      }
    )
    return () => controller.abort()
  }, [])

  return state
}
