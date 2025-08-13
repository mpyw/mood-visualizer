import React, { useState } from 'react';
import MonthSelector from './components/MonthSelector';
import MoodChart from './components/MoodChart';
import { useMonthSummary } from './hooks/useMonthSummary';
import { useMonthList } from './hooks/useMonthList';
import { CurrentPng, type CurrentPngProps } from 'recharts-to-png';
import FileSaver from 'file-saver';
import { Timeline } from './components/Timeline';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const App: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [includeAdjacent, setIncludeAdjacent] = useState(true);

  // 月リスト取得をフック化
  const { months, loading: monthsLoading, error: monthsError } = useMonthList();

  // データ取得はカスタムフックに委譲
  const { summary, records, loading, error } = useMonthSummary(selectedMonth, includeAdjacent, months);

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
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 8, marginBottom: 8, marginTop: 0,
          padding: '32px 0 8px 0',
        }}
      >
        <h1
          style={{
            textAlign: 'center', margin: 0, fontWeight: 700, fontSize: 32,
            letterSpacing: 1, color: '#3b3b4f',
            textShadow: '0 2px 8px #0001',
          }}
        >
          Mood Visualizer
        </h1>
      </header>
      {monthsLoading && <p style={{ textAlign: 'center' }}>月リスト取得中...</p>}
      {monthsError && <p style={{ color: 'red', textAlign: 'center' }}>{monthsError}</p>}
      {!monthsLoading && !monthsError && (
        <CurrentPng>
          {({ getPng, chartRef, isLoading }: CurrentPngProps) => (
            <>
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
                  margin: '0 0 24px 0', width: '100%',
                }}
              >
                {/* 上部パネル: 月選択・チェックボックス */}
                <div
                  style={{
                    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16,
                    background: 'rgba(243,246,253,0.92)', border: '1.5px solid #e0e7ef',
                    borderRadius: 14, boxShadow: '0 2px 12px #0001', padding: '18px 28px',
                    marginBottom: 8, minWidth: 320, maxWidth: 520,
                  }}
                >
                  <MonthSelector months={months} value={selectedMonth} onChange={setSelectedMonth} />
                  <label
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 15, cursor: 'pointer', color: '#333',
                      background: 'none', borderRadius: 8, padding: 0, boxShadow: 'none',
                      margin: 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={includeAdjacent}
                      onChange={e => setIncludeAdjacent(e.target.checked)}
                      style={{ accentColor: '#646cff', width: 18, height: 18, marginRight: 4 }}
                    />
                    <span style={{ userSelect: 'none' }}>前後月も含めて30件表示</span>
                  </label>
                </div>
                {/* 下部パネル: 記録をつける・PNGで保存 */}
                <div
                  style={{
                    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16,
                    justifyContent: 'space-around', // ← 追加
                    background: 'none', border: 'none', boxShadow: 'none',
                    padding: 0, minWidth: 320, maxWidth: 520,
                  }}
                >
                  <a
                    href="https://github.com/mpyw/mood-visualizer/actions/workflows/record-and-deploy.yml"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background: 'linear-gradient(90deg, #646cff 0%, #3b82f6 100%)',
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
                      background: 'linear-gradient(90deg, #646cff 0%, #3b82f6 100%)',
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
                      const png = await getPng();
                      if (png) {
                        FileSaver.saveAs(png, `${selectedMonth}_mood_chart.png`);
                      }
                    }}
                  >
                    {isLoading ? 'ダウンロード中...' : 'PNGで保存'}
                  </button>
                </div>
              </div>
              {/* グラフ本体 */}
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
                    />
                  )}
                  {!loading && !error && summary.length === 0 && <p>データがありません</p>}
                  {loading && <p>読み込み中...</p>}
                  {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
              </div>
            </>
          )}
        </CurrentPng>
      )}
      {/* タイムラインを下に移動。グラフのsummaryを渡す */}
      <div style={{ maxWidth: 700, margin: '32px auto 40px auto' }}>
        {!loading && !error && records.length > 0 && (
          <Timeline
            entries={records.map(r => ({
              date: r.date,
              score: r.score,
              note: r.note,
            }))}
          />
        )}
      </div>
    </div>
  );
};

export default App;
