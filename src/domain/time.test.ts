import { describe, expect, it } from 'vitest'
import { formatJstDateTime, parseJst, toJstDate } from './time'

describe('time', () => {
  it('runs the suite outside JST', () => {
    // Guards the TZ setting in vite.config.ts that the other tests rely on.
    expect(new Date('2026-01-01T00:00:00Z').getTimezoneOffset()).not.toBe(-540)
  })

  it('cuts days in JST', () => {
    expect(toJstDate('2026-06-15T23:30:00+09:00')).toBe('2026-06-15')
    expect(toJstDate('2026-06-15T15:30:00Z')).toBe('2026-06-16')
  })

  it('formats instants as JST wall-clock time', () => {
    expect(formatJstDateTime('2026-06-15T00:05:59+09:00')).toBe(
      '2026-06-15 00:05'
    )
    expect(formatJstDateTime('2026-06-14T15:05:00Z')).toBe('2026-06-15 00:05')
  })

  it('parses wall-clock strings as JST', () => {
    expect(parseJst('2026-06-01').toISOString()).toBe(
      '2026-05-31T15:00:00.000Z'
    )
  })
})
