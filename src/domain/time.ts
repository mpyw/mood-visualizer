import dayjs, { type Dayjs } from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * All records are written in JST, so days and months are always cut in JST,
 * regardless of the viewer's local time zone.
 */
export const TIME_ZONE = 'Asia/Tokyo'

export type { Dayjs }

/** Converts an instant (ISO 8601 string, Date or epoch ms) to JST. */
export function toJst(value: string | number | Date): Dayjs {
  return dayjs(value).tz(TIME_ZONE)
}

/** Interprets a wall-clock string such as `2026-06-01` as JST. */
export function parseJst(value: string): Dayjs {
  return dayjs.tz(value, TIME_ZONE)
}

export function nowJst(): Dayjs {
  return toJst(Date.now())
}

/** `YYYY-MM-DD` of the instant in JST. */
export function toJstDate(value: string | number | Date): string {
  return toJst(value).format('YYYY-MM-DD')
}

/** `YYYY-MM-DD HH:mm` of the instant in JST. */
export function formatJstDateTime(value: string | number | Date): string {
  return toJst(value).format('YYYY-MM-DD HH:mm')
}
