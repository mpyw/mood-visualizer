import { useCallback, useEffect, useMemo, useState } from 'react'
import { CurrentPng, type CurrentPngProps } from 'recharts-to-png'
import styles from './App.module.css'
import { Checkbox } from './components/Checkbox'
import { MonthSelector } from './components/MonthSelector'
import { MoodChart } from './components/MoodChart'
import { Timeline, type TimelineFocus } from './components/Timeline'
import { currentMonth, sortMonthsDesc, type YearMonth } from './domain/month'
import { hasNote, type MoodRecord } from './domain/mood'
import {
  latestOfDay,
  parsePermalink,
  resolvePermalink,
  type Permalink,
} from './domain/permalink'
import { selectChartDays, summarizeByDay } from './domain/summary'
import { nowJst } from './domain/time'
import { useMonthList } from './hooks/useMonthList'
import { useMoodRecords } from './hooks/useMoodRecords'
import { downloadUrl } from './utils/download'

const NO_RECORDS: readonly MoodRecord[] = []

const RECORD_URL =
  'https://github.com/mpyw/mood-visualizer/actions/workflows/record-and-deploy.yml'

export function App() {
  const monthList = useMonthList()

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mood Visualizer</h1>
      </header>
      {monthList.status === 'loading' && (
        <p className={styles.message}>月リスト取得中...</p>
      )}
      {monthList.status === 'error' && (
        <p className={styles.error}>月リストの取得に失敗しました</p>
      )}
      {monthList.status === 'success' && (
        <MoodVisualizer availableMonths={monthList.months} />
      )}
    </div>
  )
}

function MoodVisualizer({
  availableMonths,
}: {
  availableMonths: readonly YearMonth[]
}) {
  // The current month is selectable even before its first record.
  const [today] = useState(nowJst)
  const months = useMemo(
    () => sortMonthsDesc([...availableMonths, currentMonth()]),
    [availableMonths]
  )

  const [pendingLink, setPendingLink] = useState(() =>
    parsePermalink(location.hash)
  )
  const [selectedMonth, setSelectedMonth] = useState(() =>
    initialMonth(pendingLink, months)
  )
  const [includeAdjacent, setIncludeAdjacent] = useState(true)
  const [notesOnly, setNotesOnly] = useState(true)
  const [focus, setFocus] = useState<TimelineFocus | null>(null)

  const recordsState = useMoodRecords(
    selectedMonth,
    includeAdjacent,
    availableMonths
  )
  const records =
    recordsState.status === 'success' ? recordsState.records : NO_RECORDS
  const chartDays = useMemo(
    () =>
      selectChartDays(summarizeByDay(records), selectedMonth, includeAdjacent),
    [records, selectedMonth, includeAdjacent]
  )

  const jumpTo = useCallback(
    (record: MoodRecord) => {
      // Show every record when the target would be hidden by the filter.
      if (notesOnly && !hasNote(record)) setNotesOnly(false)
      setFocus({ date: record.date })
    },
    [notesOnly]
  )

  // Follow links opened while the page is already open (e.g. from the feed).
  useEffect(() => {
    const onHashChange = () => {
      const link = parsePermalink(location.hash)
      if (!link || !months.includes(link.month)) return
      setSelectedMonth(link.month)
      setPendingLink(link)
    }
    addEventListener('hashchange', onHashChange)
    return () => removeEventListener('hashchange', onHashChange)
  }, [months])

  // Jump to the linked record once the records of its month are loaded.
  if (pendingLink && recordsState.status === 'success') {
    const target = resolvePermalink(recordsState.records, pendingLink)
    setPendingLink(null)
    if (target) jumpTo(target)
  }

  const handleDayClick = useCallback(
    (day: string) => {
      const target = latestOfDay(records, day, { preferNote: notesOnly })
      if (target) jumpTo(target)
    },
    [records, notesOnly, jumpTo]
  )

  return (
    <>
      <CurrentPng>
        {({ getPng, chartRef, isLoading }: CurrentPngProps) => (
          <>
            <div className={styles.toolbar}>
              <div className={styles.controls}>
                <MonthSelector
                  months={months}
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                />
                <Checkbox
                  className={styles.adjacentToggle}
                  checked={includeAdjacent}
                  onChange={setIncludeAdjacent}
                >
                  前後月も含めて30件表示
                </Checkbox>
              </div>
              <div className={styles.actions}>
                <a
                  className={styles.button}
                  href={RECORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  記録をつける
                </a>
                <button
                  type="button"
                  className={styles.button}
                  disabled={isLoading}
                  onClick={async () => {
                    const png = await getPng()
                    if (png) downloadUrl(png, `${selectedMonth}_mood_chart.png`)
                  }}
                >
                  {isLoading ? 'ダウンロード中...' : 'PNGで保存'}
                </button>
              </div>
            </div>
            <div className={styles.chartCard}>
              <div className={styles.chartBody}>
                {recordsState.status === 'loading' && <p>読み込み中...</p>}
                {recordsState.status === 'error' && (
                  <p className={styles.error}>データ取得に失敗しました</p>
                )}
                {recordsState.status === 'success' &&
                  (chartDays.length > 0 ? (
                    <MoodChart
                      month={selectedMonth}
                      days={chartDays}
                      today={today}
                      chartRef={chartRef}
                      onDayClick={handleDayClick}
                    />
                  ) : (
                    <p>データがありません</p>
                  ))}
              </div>
            </div>
          </>
        )}
      </CurrentPng>
      <div className={styles.timelineSection}>
        {records.length > 0 && (
          <Timeline
            key={selectedMonth}
            records={records}
            notesOnly={notesOnly}
            onNotesOnlyChange={setNotesOnly}
            focus={focus}
          />
        )}
      </div>
    </>
  )
}

function initialMonth(
  link: Permalink | null,
  months: readonly YearMonth[]
): YearMonth {
  return link && months.includes(link.month) ? link.month : currentMonth()
}
