import { parseJsonl } from '../domain/jsonl'
import { sortMonthsDesc, type YearMonth } from '../domain/month'
import {
  isMonthListEntry,
  isMoodRecord,
  sortRecordsDesc,
  type MoodRecord,
} from '../domain/mood'

const DATA_URL = `${import.meta.env.BASE_URL}data`

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { cache: 'no-cache', signal })
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`)
  return res.text()
}

/** Months that have records, newest first. */
export async function fetchMonthList(
  signal?: AbortSignal
): Promise<YearMonth[]> {
  const text = await fetchText(`${DATA_URL}/history-list.jsonl`, signal)
  return sortMonthsDesc(parseJsonl(text, isMonthListEntry).map((e) => e.date))
}

/** Records of one month, newest first. */
export async function fetchMonthRecords(
  month: YearMonth,
  signal?: AbortSignal
): Promise<MoodRecord[]> {
  const text = await fetchText(`${DATA_URL}/history/${month}.jsonl`, signal)
  return sortRecordsDesc(parseJsonl(text, isMoodRecord))
}
