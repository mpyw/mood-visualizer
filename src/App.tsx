import React, { useState } from 'react';
import MonthSelector from './components/MonthSelector';
import MoodChart from './components/MoodChart';
import { useMonthSummary } from './hooks/useMonthSummary';
import { useMonthList } from './hooks/useMonthList';
import { CurrentPng, type CurrentPngProps } from 'recharts-to-png';
import FileSaver from 'file-saver';

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
  const { summary, loading, error } = useMonthSummary(selectedMonth, includeAdjacent, months);

  return (
    <div style={{ width: '100vw', margin: 0, padding: 0 }}>
      <h1 style={{ textAlign: 'center' }}>Mood Visualizer</h1>
      {monthsLoading && <p>月リスト取得中...</p>}
      {monthsError && <p style={{ color: 'red' }}>{monthsError}</p>}
      {!monthsLoading && !monthsError && (
        <CurrentPng>
          {({ getPng, chartRef, isLoading }: CurrentPngProps) => (
            <>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 18,
                margin: '24px 0 8px 0',
                width: '100%',
              }}>
                <MonthSelector months={months} value={selectedMonth} onChange={setSelectedMonth} />
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#f3f6fd', borderRadius: 8, padding: '6px 16px',
                  boxShadow: '0 1px 4px #0001', fontSize: 15, cursor: 'pointer',
                }}>
                  <input
                    type="checkbox"
                    checked={includeAdjacent}
                    onChange={e => setIncludeAdjacent(e.target.checked)}
                    style={{ accentColor: '#646cff', width: 18, height: 18, marginRight: 4 }}
                  />
                  <span style={{ userSelect: 'none', color: '#333' }}>前後月も含めて30件表示</span>
                </label>
                <button
                  style={{
                    padding: '0.5em 1.2em',
                    borderRadius: 8,
                    border: 'none',
                    background: '#646cff',
                    color: '#fff',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: '0 1px 6px #0002',
                    zIndex: 2,
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#4b51c6')}
                  onMouseOut={e => (e.currentTarget.style.background = '#646cff')}
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
              {loading && <p>読み込み中...</p>}
              {error && <p style={{ color: 'red' }}>{error}</p>}
              {!loading && !error && summary.length > 0 && (
                <MoodChart
                  data={summary}
                  month={selectedMonth}
                  chartRef={chartRef}
                />
              )}
              {!loading && !error && summary.length === 0 && <p>データがありません</p>}
            </>
          )}
        </CurrentPng>
      )}
    </div>
  );
};

export default App;
