import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockFetch } from '../test/fetchMock'
import { useMonthList } from './useMonthList'

describe('useMonthList', () => {
  it('returns valid months newest first', async () => {
    mockFetch({
      '/data/history-list.jsonl':
        '{"date":"2025-06"}\n{"date":"2026-10"}\nbroken\n{"date":"2025-13"}\n{"date":"2025-11"}\n',
    })
    const { result } = renderHook(() => useMonthList())
    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'success',
        months: ['2026-10', '2025-11', '2025-06'],
      })
    )
  })

  it('reports an error', async () => {
    mockFetch({})
    const { result } = renderHook(() => useMonthList())
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }))
  })
})
