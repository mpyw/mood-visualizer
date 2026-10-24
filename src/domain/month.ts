import { nowJst, parseJst } from './time'

/** A calendar month in `YYYY-MM` form. */
export type YearMonth = string

const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

export function isYearMonth(value: unknown): value is YearMonth {
  return typeof value === 'string' && YEAR_MONTH.test(value)
}

export function currentMonth(): YearMonth {
  return nowJst().format('YYYY-MM')
}

/** Returns the month `delta` months away from `month`. */
export function shiftMonth(month: YearMonth, delta: number): YearMonth {
  return parseJst(`${month}-01`).add(delta, 'month').format('YYYY-MM')
}

/** Sorts months newest first and drops duplicates. */
export function sortMonthsDesc(months: readonly YearMonth[]): YearMonth[] {
  return [...new Set(months)].toSorted((a, b) => b.localeCompare(a))
}
