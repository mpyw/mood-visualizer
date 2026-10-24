import { afterEach, describe, expect, it, vi } from 'vitest'
import { currentMonth, isYearMonth, shiftMonth, sortMonthsDesc } from './month'

describe('isYearMonth', () => {
  it.each(['2026-01', '2026-12', '2016-10'])('accepts %s', (value) => {
    expect(isYearMonth(value)).toBe(true)
  })

  it.each(['2026-00', '2026-13', '2026-1', '2026-01-01', '', 202601, null])(
    'rejects %j',
    (value) => {
      expect(isYearMonth(value)).toBe(false)
    }
  )
})

describe('shiftMonth', () => {
  it.each([
    ['2026-06', -1, '2026-05'],
    ['2026-06', 1, '2026-07'],
    ['2026-01', -1, '2025-12'],
    ['2025-12', 1, '2026-01'],
    ['2026-03', -13, '2025-02'],
  ])('%s %+d -> %s', (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected)
  })
})

describe('sortMonthsDesc', () => {
  it('sorts newest first and removes duplicates', () => {
    expect(
      sortMonthsDesc(['2025-06', '2026-10', '2016-10', '2026-10', '2025-11'])
    ).toEqual(['2026-10', '2025-11', '2025-06', '2016-10'])
  })
})

describe('currentMonth', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the JST month even where it is still the previous month', () => {
    // 2026-07-01 00:30 JST is still June 30 in Los Angeles.
    vi.useFakeTimers({ now: new Date('2026-06-30T15:30:00Z') })
    expect(currentMonth()).toBe('2026-07')
  })
})
