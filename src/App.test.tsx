import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { jsonl, mockFetch } from './test/fetchMock'

// recharts cannot lay out in jsdom. The stub lists the plotted days as
// buttons so tests can check what the chart gets and click on a day.
vi.mock('./components/MoodChart', () => ({
  MoodChart: (props: {
    month: string
    days: { date: string }[]
    onDayClick?: (day: string) => void
  }) => (
    <ul aria-label={`chart ${props.month}`}>
      {props.days.map((d) => (
        <li key={d.date}>
          <button onClick={() => props.onDayClick?.(d.date)}>{d.date}</button>
        </li>
      ))}
    </ul>
  ),
}))

const records = {
  '2026-05': [{ date: '2026-05-31T09:00:00+09:00', score: 4, note: '五月末' }],
  '2026-06': [
    { date: '2026-06-01T09:00:00+09:00', score: 5, note: '六月初日' },
    { date: '2026-06-15T08:00:00+09:00', score: 8, note: '朝' },
    { date: '2026-06-15T21:00:00+09:00', score: 2 },
  ],
  '2026-07': [{ date: '2026-07-01T09:00:00+09:00', score: 7 }],
  '2026-10': [{ date: '2026-10-23T09:00:00+09:00', score: 3, note: '最近' }],
}

function serve() {
  return mockFetch({
    '/data/history-list.jsonl': jsonl(
      ...Object.keys(records).map((date) => ({ date }))
    ),
    ...Object.fromEntries(
      Object.entries(records).map(([month, list]) => [
        `/data/history/${month}.jsonl`,
        jsonl(...list),
      ])
    ),
  })
}

const chartDays = async (month: string) =>
  within(await screen.findByRole('list', { name: `chart ${month}` }))
    .getAllByRole('button')
    .map((b) => b.textContent)

const notesOnly = () => screen.getByRole('checkbox', { name: 'Note 付きのみ' })
const adjacent = () =>
  screen.getByRole('checkbox', { name: '前後月も含めて30件表示' })

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      now: new Date('2026-10-24T12:00:00+09:00'),
      toFake: ['Date'],
    })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens the current month', async () => {
    serve()
    render(<App />)
    expect(await chartDays('2026-10')).toEqual(['2026-10-23'])
    expect(screen.getByRole('combobox', { name: '表示する月' })).toHaveValue(
      '2026-10'
    )
    expect(screen.getByText('最近')).toBeInTheDocument()
  })

  it('lists months newest first', async () => {
    serve()
    render(<App />)
    const select = await screen.findByRole('combobox', { name: '表示する月' })
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['2026-10', '2026-07', '2026-06', '2026-05'])
  })

  it('plots adjacent months only when asked', async () => {
    serve()
    render(<App />)
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: '表示する月' }),
      '2026-06'
    )
    expect(await chartDays('2026-06')).toEqual([
      '2026-05-31',
      '2026-06-01',
      '2026-06-15',
      '2026-07-01',
    ])
    await userEvent.click(adjacent())
    expect(await chartDays('2026-06')).toEqual(['2026-06-01', '2026-06-15'])
  })

  it('opens the month of a month link without jumping', async () => {
    location.hash = '#2026-06'
    serve()
    render(<App />)
    await chartDays('2026-06')
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
  })

  it('jumps to a record link and shows it even without a note', async () => {
    location.hash = '#2026-06-15T21:00:00+09:00'
    serve()
    render(<App />)
    await chartDays('2026-06')
    await waitFor(() => expect(notesOnly()).not.toBeChecked())
    const target = document.getElementById('2026-06-15T21:00:00+09:00')
    expect(target?.scrollIntoView).toHaveBeenCalled()
  })

  it('keeps the notes filter for a record that has a note', async () => {
    location.hash = '#2026-06-01T09:00:00+09:00'
    serve()
    render(<App />)
    await chartDays('2026-06')
    await waitFor(() =>
      expect(
        document.getElementById('2026-06-01T09:00:00+09:00')?.scrollIntoView
      ).toHaveBeenCalled()
    )
    expect(notesOnly()).toBeChecked()
  })

  it('falls back to the current month for a month without records', async () => {
    location.hash = '#2026-09'
    serve()
    render(<App />)
    expect(await chartDays('2026-10')).toEqual(['2026-10-23'])
  })

  it('jumps to the latest visible record of a clicked day', async () => {
    serve()
    render(<App />)
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: '表示する月' }),
      '2026-06'
    )
    await userEvent.click(
      within(
        await screen.findByRole('list', { name: 'chart 2026-06' })
      ).getByRole('button', { name: '2026-06-15' })
    )
    // 21:00 is newer but has no note, so the filter keeps 08:00
    expect(location.hash).toBe('#2026-06-15T08:00:00+09:00')
    expect(notesOnly()).toBeChecked()

    await userEvent.click(notesOnly())
    await userEvent.click(screen.getByRole('button', { name: '2026-06-15' }))
    expect(location.hash).toBe('#2026-06-15T21:00:00+09:00')
  })

  it('follows a link opened while the page is open', async () => {
    serve()
    render(<App />)
    await chartDays('2026-10')
    location.hash = '#2026-07-01T09:00:00+09:00'
    expect(await chartDays('2026-07')).toContain('2026-07-01')
    await waitFor(() =>
      expect(
        document.getElementById('2026-07-01T09:00:00+09:00')?.scrollIntoView
      ).toHaveBeenCalled()
    )
  })

  it('reports a broken month list', async () => {
    mockFetch({})
    render(<App />)
    expect(
      await screen.findByText('月リストの取得に失敗しました')
    ).toBeInTheDocument()
  })

  it('reports a broken month file', async () => {
    mockFetch({ '/data/history-list.jsonl': jsonl({ date: '2026-10' }) })
    render(<App />)
    expect(
      await screen.findByText('データ取得に失敗しました')
    ).toBeInTheDocument()
  })
})
