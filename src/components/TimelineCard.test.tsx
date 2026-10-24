import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TimelineCard } from './TimelineCard'

describe('TimelineCard', () => {
  it('shows the score, the JST time and the note', () => {
    const { container } = render(
      <TimelineCard
        record={{
          date: '2026-06-14T15:05:00Z',
          score: 9,
          note: 'いい日\n2行目',
        }}
      />
    )
    expect(screen.getByText('Score: 9')).toBeInTheDocument()
    expect(screen.getByText('2026-06-15 00:05')).toHaveAttribute(
      'datetime',
      '2026-06-14T15:05:00Z'
    )
    expect(screen.getByText(/いい日/)).toHaveTextContent('いい日 2行目')
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/mpyw-grinning.png'
    )
  })

  it('omits the note box without a note', () => {
    const { container } = render(
      <TimelineCard
        record={{ date: '2026-06-15T00:00:00+09:00', score: 0, note: ' ' }}
      />
    )
    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/mpyw-disappointed.png'
    )
  })
})
