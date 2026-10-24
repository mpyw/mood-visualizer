import { fireEvent, render, screen } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import type * as Recharts from 'recharts'
import { describe, expect, it, vi } from 'vitest'
import type { MoodDaySummary } from '../domain/summary'
import { parseJst } from '../domain/time'
import { MoodChart } from './MoodChart'

// jsdom has no layout, so give the chart a fixed size.
vi.mock('recharts', async (importOriginal) => {
  const recharts = await importOriginal<typeof Recharts>()
  return {
    ...recharts,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(
        children as ReactElement<{ width: number; height: number }>,
        {
          width: 800,
          height: 540,
        }
      ),
  }
})

const day = (date: string, low: number, high: number): MoodDaySummary => ({
  date,
  open: low,
  high,
  low,
  close: high,
  avg: (low + high) / 2,
  notes: [],
})

function renderChart(onDayClick = vi.fn<(day: string) => void>()) {
  const view = render(
    <MoodChart
      month="2026-06"
      days={[
        day('2026-05-31', 4, 4),
        day('2026-06-02', 0, 6),
        day('2026-06-05', 7, 7),
      ]}
      today={parseJst('2026-06-05T12:00')}
      onDayClick={onDayClick}
    />
  )
  return { ...view, onDayClick }
}

describe('MoodChart', () => {
  it('draws a clickable dot per day with records', () => {
    const { onDayClick } = renderChart()
    expect(screen.getAllByTestId(/^dot-/)).toHaveLength(3)
    fireEvent.click(screen.getByTestId('dot-2026-06-02'))
    expect(onDayClick).toHaveBeenCalledWith('2026-06-02')
  })

  it('draws a range bar even when the low is 0', () => {
    // Regression: the old bar height was scaled by the low score, so a day
    // with a low of 0 got no bar.
    const { container } = renderChart()
    const [may31, jun02, jun05] = [
      ...container.querySelectorAll('.recharts-bar rect'),
    ].map((b) => ({
      y: Number(b.getAttribute('y')),
      height: Number(b.getAttribute('height')),
    }))
    // days with a single score have no range
    expect(may31.height).toBe(0)
    expect(jun05.height).toBe(0)
    // 0..6 spans from the zero line: 6 units, where 0..4 is 4 units
    const zeroLine = jun02.y + jun02.height
    expect(jun02.height / (zeroLine - may31.y)).toBeCloseTo(6 / 4)
  })

  it('labels days outside the month with the month', () => {
    renderChart()
    expect(screen.getByText('Mood Chart of 2026-06')).toBeInTheDocument()
    expect(screen.getByText('5/31(Sun)')).toBeInTheDocument()
  })

  it('highlights today', () => {
    renderChart()
    const today = screen.getByTestId('dot-2026-06-05')
    expect(today.tagName).toBe('g')
    expect(screen.getByTestId('dot-2026-06-02').tagName).toBe('circle')
  })
})
