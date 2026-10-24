import { useEffect, useRef, useState } from 'react'
import { hasNote, type MoodRecord } from '../domain/mood'
import { Checkbox } from './Checkbox'
import styles from './Timeline.module.css'
import { TimelineCard } from './TimelineCard'

const PAGE_SIZE = 20

/** A request to scroll to a record. A new object scrolls again. */
export type TimelineFocus = { date: string }

/**
 * Item count that includes the focused record with a few more after it, so
 * that it can be scrolled to the center of the screen.
 */
function itemsToShow(focusIndex: number): number {
  if (focusIndex < 0) return 0
  return Math.ceil((focusIndex + 1 + FOCUS_MARGIN) / PAGE_SIZE) * PAGE_SIZE
}

const FOCUS_MARGIN = 5

type Props = {
  records: readonly MoodRecord[]
  notesOnly: boolean
  onNotesOnlyChange: (notesOnly: boolean) => void
  focus: TimelineFocus | null
}

export function Timeline({
  records,
  notesOnly,
  onNotesOnlyChange,
  focus,
}: Props) {
  const [pages, setPages] = useState(1)
  const sentinel = useRef<HTMLDivElement>(null)
  const items = useRef(new Map<string, HTMLElement>())

  const visible = notesOnly ? records.filter(hasNote) : records
  const focusIndex = focus
    ? visible.findIndex((r) => r.date === focus.date)
    : -1
  const shownCount = Math.max(pages * PAGE_SIZE, itemsToShow(focusIndex))
  const shown = visible.slice(0, shownCount)
  const hasMore = visible.length > shown.length

  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setPages(Math.ceil(shownCount / PAGE_SIZE) + 1)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, shownCount])

  useEffect(() => {
    if (!focus) return
    const el = items.current.get(focus.date)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    history.replaceState(null, '', `#${focus.date}`)
  }, [focus])

  return (
    <section className={styles.timeline}>
      <div className={styles.stickyHeader}>
        <h2 className={styles.heading}>Mood Timeline</h2>
        <Checkbox
          className={styles.filter}
          checked={notesOnly}
          onChange={(checked) => {
            onNotesOnlyChange(checked)
            setPages(1)
          }}
        >
          Note 付きのみ
        </Checkbox>
      </div>
      <div className={styles.list}>
        {shown.map((record) => (
          <div
            key={record.date}
            id={record.date}
            ref={(el) => {
              if (el) items.current.set(record.date, el)
              else items.current.delete(record.date)
            }}
          >
            <TimelineCard record={record} />
          </div>
        ))}
      </div>
      <div ref={sentinel} />
      {shown.length === 0 ? (
        <p className={styles.end}>データがありません</p>
      ) : (
        !hasMore && <p className={styles.end}>これ以上ありません</p>
      )}
    </section>
  )
}
