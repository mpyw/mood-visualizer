import React from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ErrorBar, ResponsiveContainer, Legend, ComposedChart, Bar } from 'recharts';
import dayjs from 'dayjs';
import type { MoodDaySummary } from '../utils/parseJsonl';

export type MoodChartProps = {
  data: MoodDaySummary[];
  month: string; // 'YYYY-MM'
  chartRef?: React.RefObject<SVGSVGElement>;
};

// Recharts用データ整形
type ChartRow = {
  date: string; // YYYY-MM-DD
  avg: number;
  low: number;
  high: number;
};

const MoodChart: React.FC<MoodChartProps> = ({ data, month, chartRef }) => {
  // Recharts用データ配列
  const chartData: ChartRow[] = data.map(d => ({
    date: d.date,
    avg: d.avg,
    low: d.low,
    high: d.high,
    error: [d.avg - d.low, d.high - d.avg], // ErrorBar用
  }));

  const today = dayjs().format('YYYY-MM-DD');

  // XAxisのカスタムtick
  const renderCustomTick = (props: { x: number; y: number; payload: { value: string } }) => {
    const { x, y, payload } = props;
    const isToday = payload.value === today;
    // 日付の「日」部分と曜日を表示
    const dateObj = dayjs(payload.value);
    const dayLabel = dateObj.format('D(ddd)'); // 例: 12(Tue)
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="end"
          fill={isToday ? '#d32f2f' : '#666'}
          fontWeight={isToday ? 'bold' : 'normal'}
          fontSize={isToday ? 15 : 12}
          transform="rotate(-35)"
        >
          {dayLabel}
        </text>
      </g>
    );
  };

  // dotのカスタム描画
  const renderCustomDot = (props: { cx: number; cy: number; payload: ChartRow }) => {
    const { cx, cy, payload } = props;
    const isToday = payload.date === today;
    if (isToday) {
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={10}
            fill="#fff"
            stroke="#d32f2f"
            strokeWidth={4}
            style={{ filter: 'drop-shadow(0 0 6px #d32f2faa)' }}
          />
          <circle
            cx={cx}
            cy={cy}
            r={5}
            fill="#d32f2f"
            stroke="#fff"
            strokeWidth={2}
          />
        </g>
      );
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="mediumseagreen"
      />
    );
  };

  return (
    <div
      style={{
        width: '98vw',
        maxWidth: 1600,
        minWidth: 320,
        margin: '0 auto',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 16px #0001',
        padding: '2rem 1rem 2.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: 540 }}>
        <ResponsiveContainer width="98%" height={540}>
          <ComposedChart data={chartData} margin={{ top: 56, right: 40, left: 20, bottom: 32 }} ref={chartRef}>
            {/* グラフ内タイトル（PNGにも含まれる） */}
            <text
              x="50%"
              y={28}
              textAnchor="middle"
              fontSize={22}
              fontWeight="bold"
              fill="#222"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {month} の気分グラフ
            </text>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} tick={renderCustomTick} />
            <YAxis domain={[0, 10]} tickCount={11} />
            <Tooltip
              formatter={(
                v: number,
                name: string,
                item
              ) => {
                // itemはPayload<number, string>型
                if (name === 'High/Low' && item && item.payload) {
                  const { high, low } = item.payload as ChartRow;
                  return [
                    `High: ${high}\nLow: ${low}`,
                    name
                  ];
                }
                return v.toFixed(2);
              }}
            />
            <Legend />
            {/* ローソク足風の棒（Bar） */}
            <Bar
              dataKey="low"
              fill="#bfc6e0"
              barSize={8}
              name="High/Low"
              //eslint-disable-next-line @typescript-eslint/no-explicit-any
              shape={(props: any) => { // TODO: any 型を適切に定義する
                // 棒の上端はhigh, 下端はlow
                const { x, width, payload, y, height } = props;
                const barHeight = (payload.high - payload.low) / (payload.low - 0 || 1) * height;
                const yHigh = y - barHeight;
                return (
                  <rect
                    x={x}
                    y={yHigh}
                    width={width}
                    height={barHeight}
                    fill={payload.date === today ? '#d32f2f' : '#bfc6e0'}
                    opacity={payload.date === today ? 0.9 : 0.7}
                    rx={2}
                  />
                );
              }}
              isAnimationActive={false}
            />
            <ErrorBar dataKey="error" width={8} stroke="gray" direction="y" />
            <Line type="monotone" dataKey="avg" stroke="mediumseagreen" strokeWidth={3} dot={renderCustomDot} name="Avg" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MoodChart;
