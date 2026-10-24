import { memo, type MouseEvent, type RefObject } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type DotItemDotProps,
  type XAxisTickContentProps,
} from 'recharts'
import { MAX_SCORE, MIN_SCORE } from '../domain/mood'
import type { YearMonth } from '../domain/month'
import {
  buildChartRows,
  dayLabel,
  type ChartRow,
  type MoodDaySummary,
} from '../domain/summary'
import type { Dayjs } from '../domain/time'

const TODAY_COLOR = '#d32f2f'
const LINE_COLOR = 'mediumseagreen'
const RANGE_COLOR = '#bfc6e0'
const RANGE_LABEL = 'High/Low'
const HEIGHT = 540

type Props = {
  month: YearMonth
  /** Days to plot, from `selectChartDays`. */
  days: readonly MoodDaySummary[]
  today: Dayjs
  // recharts-to-png hands out an untyped ref.
  // oxlint-disable-next-line typescript/no-explicit-any
  chartRef?: RefObject<any>
  onDayClick?: (day: string) => void
}

export const MoodChart = memo(function MoodChart({
  month,
  days,
  today,
  chartRef,
  onDayClick,
}: Props) {
  const rows = buildChartRows(month, days, today)
  const todayDate = today.format('YYYY-MM-DD')

  const renderTick = ({ x, y, payload }: XAxisTickContentProps) => {
    const date = String(payload.value)
    const isToday = date === todayDate
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="end"
          fill={isToday ? TODAY_COLOR : '#666'}
          fontWeight={isToday ? 'bold' : 'normal'}
          fontSize={isToday ? 15 : 12}
          transform="rotate(-35)"
        >
          {dayLabel(date, month)}
        </text>
      </g>
    )
  }

  const renderDot = ({ cx, cy, payload }: DotItemDotProps) => {
    const row = payload as ChartRow
    if (!row.present) return <g key={row.date} />
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation()
      onDayClick?.(row.date)
    }
    if (row.date === todayDate) {
      return (
        <g
          key={row.date}
          onClick={handleClick}
          style={{ cursor: 'pointer' }}
          data-testid={`dot-${row.date}`}
        >
          <circle
            cx={cx}
            cy={cy}
            r={10}
            fill="#fff"
            stroke={TODAY_COLOR}
            strokeWidth={4}
            style={{ filter: `drop-shadow(0 0 6px ${TODAY_COLOR}aa)` }}
          />
          <circle
            cx={cx}
            cy={cy}
            r={5}
            fill={TODAY_COLOR}
            stroke="#fff"
            strokeWidth={2}
          />
        </g>
      )
    }
    return (
      <circle
        key={row.date}
        cx={cx}
        cy={cy}
        r={4}
        fill={LINE_COLOR}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
        data-testid={`dot-${row.date}`}
      />
    )
  }

  const renderRange = ({ x, y, width, height, payload }: BarShapeProps) => {
    const isToday = (payload as ChartRow).date === todayDate
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isToday ? TODAY_COLOR : RANGE_COLOR}
        opacity={isToday ? 0.9 : 0.7}
        rx={2}
      />
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', minWidth: 320 }}>
      <ResponsiveContainer width="100%" height={HEIGHT}>
        <ComposedChart
          data={rows}
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
            // The custom tick draws the labels, but recharts still uses the
            // angle to decide how many labels fit.
            angle={-45}
            textAnchor="end"
            height={60}
            tick={renderTick}
          />
          <YAxis domain={[MIN_SCORE, MAX_SCORE]} tickCount={11} />
          <Tooltip
            formatter={(value, name, item) => {
              const row = item?.payload as ChartRow | undefined
              if (name === RANGE_LABEL && row?.present) {
                return [`High: ${row.high}\nLow: ${row.low}`, name]
              }
              return Number(value).toFixed(2)
            }}
          />
          <Legend />
          <Bar
            dataKey="range"
            fill={RANGE_COLOR}
            barSize={8}
            name={RANGE_LABEL}
            shape={renderRange}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke={LINE_COLOR}
            strokeWidth={3}
            dot={renderDot}
            activeDot={false}
            name="Avg"
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
})
