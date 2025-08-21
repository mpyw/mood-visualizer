import { useState, useRef, useEffect, useCallback } from 'react'
import MonthSelector from './components/MonthSelector'
import MoodChart from './components/MoodChart'
import { useMonthSummary } from './hooks/useMonthSummary'
import { useMonthList } from './hooks/useMonthList'
import { CurrentPng, type CurrentPngProps } from 'recharts-to-png'
import FileSaver from 'file-saver'
import { Timeline, type TimelineHandle } from './components/Timeline'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthFromHash() {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const match = hash.match(/^(\d{4})-(\d{2})(?:-|$)/)
  if (match) {
    const [, year, month] = match
    return `${year}-${month}`
  }
  return null
}

const App: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(
    getMonthFromHash() || getCurrentMonth()
  )
  const [includeAdjacent, setIncludeAdjacent] = useState(true)
  const [showOnlyWithNote, setShowOnlyWithNote] = useState(true)
  const [pendingScrollDate, setPendingScrollDate] = useState<{
    date: string
    exact: boolean
  } | null>(null)
  const [pendingHashScroll, setPendingHashScroll] = useState<string | null>(
    null
  )
  const timelineRef = useRef<TimelineHandle>(null)

  const { months, loading: monthsLoading, error: monthsError } = useMonthList()
  const {
    summary,
    records,
    loading,
    error,
    initialized,
    tryFetchRecordByDate,
  } = useMonthSummary(selectedMonth, includeAdjacent, months)

  // スクロール関数
  const scrollToDate = useCallback(
    async (date: string, exact: boolean) => {
      // 完全一致検索
      if (exact) {
        if (records.some((e) => e.date === date)) {
          return (await timelineRef.current?.scrollToExactDate(date)) ?? false
        }
        return false
      }
      // 先頭一致検索
      const found = records.filter((e) => e.date.startsWith(date))
      if (found.length > 0) {
        const latest = found.reduce((a, b) => (a.date > b.date ? a : b))
        return (
          (await timelineRef.current?.scrollToExactDate(latest.date)) ?? false
        )
      }
      return false
    },
    [records]
  )

  // スクロール関数を ref に保存し，常に最新の records を参照できるようにする
  const scrollToDateRef = useRef(scrollToDate)
  useEffect(() => {
    scrollToDateRef.current = scrollToDate
  }, [scrollToDate])

  // グラフポイントクリック時はその日付の最新投稿の完全タイムスタンプを使う
  const handleDotClick = useCallback(
    async (date: string) => {
      if (await scrollToDate(date, true)) {
        return
      }
      const fetched = await tryFetchRecordByDate(date)
      if (fetched) setPendingScrollDate({ date: fetched.date, exact: true })
    },
    [scrollToDate, tryFetchRecordByDate]
  )

  // ハッシュ流入時のスクロール処理を1回だけ実行する
  // 意図的に依存配列に showOnlyWithNote を含めない
  useEffect(() => {
    // 初回フェッチが完了していない場合は何もしない
    if (!initialized || !window.location.hash) return

    // ハッシュから日付を取得
    const hash = window.location.hash.replace(/^#/, '') // スクロールできた場合，もしくはスクロールできなかったが showOnlyWithNote が既に false の場合は何もしない
    ;(async () => {
      const res = await scrollToDateRef.current?.(hash, false)
      if (res || !showOnlyWithNote) {
        return
      }
      // スクロールできなかった場合は showOnlyWithNote を false にして再度スクロールを試みる
      setShowOnlyWithNote(false)
      setPendingHashScroll(hash)
    })()
  }, [initialized]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pendingHashScroll && !showOnlyWithNote) {
      ;(async () => {
        if (await scrollToDateRef.current?.(pendingHashScroll, false)) {
          setPendingHashScroll(null)
        }
      })()
    }
  }, [showOnlyWithNote, records, pendingHashScroll])

  useEffect(() => {
    ;(async () => {
      if (
        pendingScrollDate &&
        (await scrollToDate(pendingScrollDate.date, pendingScrollDate.exact))
      ) {
        setPendingScrollDate(null)
      }
    })()
  }, [records, scrollToDate, pendingScrollDate])

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          marginTop: 0,
          padding: '32px 0 8px 0',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            margin: 0,
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: 1,
            color: '#3b3b4f',
            textShadow: '0 2px 8px #0001',
          }}
        >
          Mood Visualizer
        </h1>
      </header>
      {monthsLoading && (
        <p style={{ textAlign: 'center' }}>月リスト取得中...</p>
      )}
      {monthsError && (
        <p style={{ color: 'red', textAlign: 'center' }}>{monthsError}</p>
      )}
      {!monthsLoading && !monthsError && (
        <CurrentPng>
          {({ getPng, chartRef, isLoading }: CurrentPngProps) => (
            <>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 18,
                  margin: '0 0 24px 0',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    background: 'rgba(243,246,253,0.92)',
                    border: '1.5px solid #e0e7ef',
                    borderRadius: 14,
                    boxShadow: '0 2px 12px #0001',
                    padding: '18px 28px',
                    marginBottom: 8,
                    minWidth: 320,
                    maxWidth: 520,
                  }}
                >
                  <MonthSelector
                    months={months}
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 15,
                      cursor: 'pointer',
                      color: '#333',
                      background: 'none',
                      borderRadius: 8,
                      padding: 0,
                      boxShadow: 'none',
                      margin: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeAdjacent}
                      onChange={(e) => setIncludeAdjacent(e.target.checked)}
                      style={{
                        accentColor: '#646cff',
                        width: 18,
                        height: 18,
                        marginRight: 4,
                      }}
                    />
                    <span style={{ userSelect: 'none' }}>
                      前後月も含めて30件表示
                    </span>
                  </label>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    justifyContent: 'space-around',
                    background: 'none',
                    border: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    minWidth: 320,
                    maxWidth: 520,
                  }}
                >
                  <a
                    href="https://github.com/mpyw/mood-visualizer/actions/workflows/record-and-deploy.yml"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background:
                        'linear-gradient(90deg, #646cff 0%, #3b82f6 100%)',
                      color: '#fff',
                      padding: '0.5em 1.5em',
                      borderRadius: 22,
                      fontWeight: 600,
                      fontSize: 16,
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px #646cff22',
                      transition: 'background 0.2s, box-shadow 0.2s',
                      margin: 0,
                      minWidth: 130,
                      textAlign: 'center',
                      letterSpacing: 0.5,
                      boxSizing: 'border-box',
                      border: 'none',
                      outline: 'none',
                      lineHeight: 1.5,
                      verticalAlign: 'middle',
                    }}
                  >
                    記録をつける
                  </a>
                  <button
                    style={{
                      display: 'inline-block',
                      background:
                        'linear-gradient(90deg, #646cff 0%, #3b82f6 100%)',
                      color: '#fff',
                      padding: '0.5em 1.5em',
                      borderRadius: 22,
                      fontWeight: 600,
                      fontSize: 16,
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px #646cff22',
                      transition: 'background 0.2s, box-shadow 0.2s',
                      margin: 0,
                      minWidth: 130,
                      textAlign: 'center',
                      border: 'none',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.6 : 1,
                      letterSpacing: 0.5,
                    }}
                    disabled={isLoading}
                    onClick={async () => {
                      const png = await getPng()
                      if (png) {
                        FileSaver.saveAs(png, `${selectedMonth}_mood_chart.png`)
                      }
                    }}
                  >
                    {isLoading ? 'ダウンロード中...' : 'PNGで保存'}
                  </button>
                </div>
              </div>
              <div
                style={{
                  width: '100%',
                  maxWidth: 1200,
                  margin: '0 auto 0 auto',
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: 18,
                  boxShadow: '0 2px 16px #0001',
                  padding: '32px 0 24px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  overflowX: 'auto',
                }}
              >
                <div style={{ width: '100%' }}>
                  {!loading && !error && summary.length > 0 && (
                    <MoodChart
                      data={summary}
                      month={selectedMonth}
                      chartRef={chartRef}
                      onDotClick={handleDotClick}
                    />
                  )}
                  {!loading && !error && summary.length === 0 && (
                    <p>データがありません</p>
                  )}
                  {loading && <p>読み込み中...</p>}
                  {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
              </div>
            </>
          )}
        </CurrentPng>
      )}
      <div style={{ maxWidth: 700, margin: '32px auto 40px auto' }}>
        {!loading && !error && records.length > 0 && (
          <Timeline
            ref={timelineRef}
            entries={records}
            showOnlyWithNote={showOnlyWithNote}
            setShowOnlyWithNote={setShowOnlyWithNote}
          />
        )}
      </div>
    </div>
  )
}

export default App
