import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deferred, jsonl, mockFetch } from '../test/fetchMock'
import { monthsToLoad, useMoodRecords } from './useMoodRecords'

describe('monthsToLoad', () => {
  const available = ['2025-12', '2026-01', '2026-02', '2026-05']

  it('loads only the month without adjacent months', () => {
    expect(monthsToLoad('2026-01', false, available)).toEqual(['2026-01'])
  })

  it('loads the neighbors across a year boundary', () => {
    expect(monthsToLoad('2026-01', true, available)).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
    ])
  })

  it('skips months without records', () => {
    expect(monthsToLoad('2026-04', true, available)).toEqual(['2026-05'])
    expect(monthsToLoad('2026-08', true, available)).toEqual([])
  })
})

describe('useMoodRecords', () => {
  const may = { date: '2026-05-31T09:00:00+09:00', score: 1 }
  const june = { date: '2026-06-01T09:00:00+09:00', score: 2 }
  const july = { date: '2026-07-01T09:00:00+09:00', score: 3 }
  const available = ['2026-05', '2026-06', '2026-07']

  it('loads and merges the month and its neighbors, newest first', async () => {
    const fetchMock = mockFetch({
      '/data/history/2026-05.jsonl': jsonl(may),
      '/data/history/2026-06.jsonl': jsonl(june),
      '/data/history/2026-07.jsonl': jsonl(july),
    })
    const { result } = renderHook(() =>
      useMoodRecords('2026-06', true, available)
    )
    expect(result.current).toEqual({ status: 'loading' })
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'success',
        records: [july, june, may],
      })
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does not fetch a month that has no records', () => {
    const fetchMock = mockFetch({})
    const { result } = renderHook(() =>
      useMoodRecords('2026-12', true, available)
    )
    expect(result.current).toEqual({ status: 'success', records: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports an error when a month fails to load', async () => {
    mockFetch({ '/data/history/2026-06.jsonl': jsonl(june) }) // 05 and 07 404
    const { result } = renderHook(() =>
      useMoodRecords('2026-06', true, available)
    )
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }))
  })

  it('ignores a slow response for a previous selection', async () => {
    const slowJune = deferred<string>()
    mockFetch({
      '/data/history/2026-06.jsonl': () => slowJune.promise,
      '/data/history/2026-07.jsonl': jsonl(july),
    })
    const { result, rerender } = renderHook(
      ({ month }) => useMoodRecords(month, false, available),
      { initialProps: { month: '2026-06' } }
    )
    rerender({ month: '2026-07' })
    await waitFor(() =>
      expect(result.current).toEqual({ status: 'success', records: [july] })
    )
    await act(async () => slowJune.resolve(jsonl(june)))
    expect(result.current).toEqual({ status: 'success', records: [july] })
  })

  it('shows loading again right after the selection changes', async () => {
    mockFetch({
      '/data/history/2026-06.jsonl': jsonl(june),
      '/data/history/2026-07.jsonl': () => new Promise(() => {}),
    })
    const { result, rerender } = renderHook(
      ({ month }) => useMoodRecords(month, false, available),
      { initialProps: { month: '2026-06' } }
    )
    await waitFor(() => expect(result.current.status).toBe('success'))
    rerender({ month: '2026-07' })
    // no stale June records while July is loading
    expect(result.current).toEqual({ status: 'loading' })
  })
})
