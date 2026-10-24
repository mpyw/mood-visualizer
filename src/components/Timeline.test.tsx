import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { MoodRecord } from '../domain/mood'
import { Timeline, type TimelineFocus } from './Timeline'

/** `count` records, one per hour going back from 2026-06-30 23:00 JST. */
function makeRecords(count: number, withNote: (i: number) => boolean) {
  return Array.from({ length: count }, (_, i): MoodRecord => {
    const date = new Date(Date.parse('2026-06-30T23:00:00+09:00') - i * 3600e3)
    return {
      date: date.toISOString(),
      score: i % 11,
      ...(withNote(i) ? { note: `note ${i}` } : {}),
    }
  })
}

function Harness(props: {
  records: MoodRecord[]
  focus?: TimelineFocus | null
  notesOnly?: boolean
}) {
  const [notesOnly, setNotesOnly] = useState(props.notesOnly ?? false)
  return (
    <Timeline
      records={props.records}
      notesOnly={notesOnly}
      onNotesOnlyChange={setNotesOnly}
      focus={props.focus ?? null}
    />
  )
}

const cards = () => screen.queryAllByRole('article')

describe('Timeline', () => {
  it('shows the first page only', () => {
    render(<Harness records={makeRecords(45, () => true)} />)
    expect(cards()).toHaveLength(20)
    expect(screen.queryByText('これ以上ありません')).toBeNull()
  })

  it('says when there is nothing more', () => {
    render(<Harness records={makeRecords(3, () => true)} />)
    expect(cards()).toHaveLength(3)
    expect(screen.getByText('これ以上ありません')).toBeInTheDocument()
  })

  it('filters to records with a note', async () => {
    render(<Harness records={makeRecords(10, (i) => i % 2 === 0)} />)
    expect(cards()).toHaveLength(10)
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Note 付きのみ' })
    )
    expect(cards()).toHaveLength(5)
  })

  it('says when the filter leaves nothing', () => {
    render(<Harness records={makeRecords(3, () => false)} notesOnly />)
    expect(screen.getByText('データがありません')).toBeInTheDocument()
  })

  it('renders far enough to scroll to a focused record', () => {
    const records = makeRecords(100, () => true)
    render(<Harness records={records} focus={{ date: records[57].date }} />)
    // page boundary after the record plus a margin: 57 + 1 + 5 -> 80
    expect(cards()).toHaveLength(80)
    const target = document.getElementById(records[57].date)
    expect(target?.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    })
    expect(location.hash).toBe(`#${records[57].date}`)
  })

  it('scrolls again when the same record is focused again', () => {
    const records = makeRecords(5, () => true)
    const { rerender } = render(
      <Harness records={records} focus={{ date: records[2].date }} />
    )
    rerender(<Harness records={records} focus={{ date: records[2].date }} />)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2)
  })
})
