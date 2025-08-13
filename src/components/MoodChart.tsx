import React from 'react'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ErrorBar,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
} from 'recharts'
import dayjs from 'dayjs'
import type { MoodDaySummary } from '../utils/parseJsonl'

export type MoodChartProps = {
  data: MoodDaySummary[]
  month: string
  chartRef?: React.RefObject<SVGSVGElement>
  onDotClick?: (date: string) => void
}

type ChartRow = {
  date: string
  avg: number
  low: number
  high: number
}

const MoodChart: React.FC<MoodChartProps> = ({
  data,
  month,
  chartRef,
  onDotClick,
}) => {
  const chartData: ChartRow[] = data.map((d) => ({
    date: d.date,
    avg: d.avg,
    low: d.low,
    high: d.high,
    error: [d.avg - d.low, d.high - d.avg],
  }))

  const today = dayjs().format('YYYY-MM-DD')

  const renderCustomTick = ({
    x,
    y,
    payload,
  }: {
    x: number
    y: number
    payload: { value: string }
  }) => {
    const isToday = payload.value === today
    const dateObj = dayjs(payload.value)
    const dayLabel = dateObj.format('D(ddd)')
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
    )
  }

  const renderCustomDot = ({
    cx,
    cy,
    payload,
  }: {
    cx: number
    cy: number
    payload: ChartRow
  }) => {
    const isToday = payload.date === today
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      onDotClick?.(payload.date)
    }
    return isToday ? (
      <g onClick={handleClick} style={{ cursor: 'pointer' }} key={payload.date}>
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
    ) : (
      <circle
        key={payload.date}
        cx={cx}
        cy={cy}
        r={4}
        fill="mediumseagreen"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />
    )
  }

  return (
    <div
      style={{
        width: '100%',
        minWidth: 320,
        background: 'none',
        borderRadius: 0,
        boxShadow: 'none',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: 540 }}>
        <ResponsiveContainer width="100%" height={540}>
          <ComposedChart
            data={chartData}
            margin={{ top: 56, right: 40, left: 20, bottom: 32 }}
            ref={chartRef}
          >
            <text
              x="50%"
              y={28}
              textAnchor="middle"
              fontSize={22}
              fontWeight="bold"
              fill="#222"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              Mood Chart of {month}
            </text>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={60}
              tick={renderCustomTick}
            />
            <YAxis domain={[0, 10]} tickCount={11} />
            <Tooltip
              formatter={(v: number, name: string, item) => {
                if (name === 'High/Low' && item && item.payload) {
                  const { high, low } = item.payload as ChartRow
                  return [`High: ${high}\nLow: ${low}`, name]
                }
                return v.toFixed(2)
              }}
            />
            <Legend />
            <Bar
              dataKey="low"
              fill="#bfc6e0"
              barSize={8}
              name="High/Low"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              shape={(props: any) => {
                const { x, width, payload, y, height } = props
                const barHeight =
                  ((payload.high - payload.low) / (payload.low - 0 || 1)) *
                  height
                const yHigh = y - barHeight
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
                )
              }}
              isAnimationActive={false}
            />
            <ErrorBar dataKey="error" width={8} stroke="gray" direction="y" />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="mediumseagreen"
              strokeWidth={3}
              dot={renderCustomDot}
              activeDot={false}
              name="Avg"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default React.memo(MoodChart)
