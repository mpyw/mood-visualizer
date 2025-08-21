import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { TimelineCard, type TimelineEntry } from './TimelineCard'

export type TimelineHandle = {
  scrollToExactDate: (date: string) => Promise<boolean>
}

export const Timeline = React.memo(
  forwardRef<
    TimelineHandle,
    {
      entries: TimelineEntry[]
      showOnlyWithNote: boolean
      setShowOnlyWithNote: (v: boolean) => void
    }
  >(({ entries, showOnlyWithNote, setShowOnlyWithNote }, ref) => {
    const [page, setPage] = useState(1)
    const loader = useRef<HTMLDivElement | null>(null)
    const pageSize = 20
    const dateRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const filteredEntries = useMemo(
      () =>
        showOnlyWithNote
          ? entries.filter((e) => e.note && e.note.trim() !== '')
          : entries,
      [entries, showOnlyWithNote]
    )
    const pagedEntries = useMemo(
      () => filteredEntries.slice(0, page * pageSize),
      [filteredEntries, page, pageSize]
    )
    const hasMore = useMemo(
      () => filteredEntries.length > pagedEntries.length,
      [filteredEntries, pagedEntries]
    )

    const handleObserver = useCallback(
      (entriesObs: IntersectionObserverEntry[]) => {
        const target = entriesObs[0]
        if (target.isIntersecting && hasMore) setPage((p) => p + 1)
      },
      [hasMore]
    )

    useEffect(() => {
      const option = { root: null, rootMargin: '0px', threshold: 1.0 }
      const observer = new window.IntersectionObserver(handleObserver, option)
      const loaderEl = loader.current
      if (loaderEl) observer.observe(loaderEl)
      return () => {
        if (loaderEl) observer.unobserve(loaderEl)
      }
    }, [handleObserver])

    useImperativeHandle(
      ref,
      () => ({
        scrollToExactDate: async (date: string): Promise<boolean> => {
          let el = dateRefs.current[date]
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            window.location.hash = date
            return true
          } else {
            // filteredEntriesでページング判定
            const idx = filteredEntries.findIndex((e) => e.date === date)
            if (idx !== -1 && idx >= page * pageSize) {
              const newPage = Math.ceil((idx + 1) / pageSize)
              setPage(newPage)
              // ページング後、要素が描画されるまで待機
              for (let i = 0; i < 20; i++) {
                await new Promise((r) => setTimeout(r, 50))
                el = dateRefs.current[date]
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  window.location.hash = date
                  return true
                }
              }
            }
            return false
          }
        },
      }),
      [filteredEntries, page, pageSize]
    )

    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 0' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            background: '#e4e6ea',
            width: '100vw',
            minWidth: '100%',
            borderRadius: 0,
            marginLeft: 'calc(50% - 50vw)',
            marginRight: 'calc(50% - 50vw)',
            marginBottom: 18,
            paddingTop: 4,
            paddingBottom: 16,
            display: 'block',
          }}
        >
          <h2 style={{ textAlign: 'center', marginBottom: 12, marginTop: 0 }}>
            Mood Timeline
          </h2>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
              padding: '4px 10px',
              boxShadow: 'none',
              fontSize: 15,
              cursor: 'pointer',
              marginBottom: 0,
              background: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={showOnlyWithNote}
              onChange={(e) => {
                setShowOnlyWithNote(e.target.checked)
                setPage(1)
              }}
              style={{
                accentColor: '#646cff',
                width: 18,
                height: 18,
                marginRight: 4,
              }}
            />
            <span style={{ userSelect: 'none', color: '#666' }}>
              Note 付きのみ
            </span>
          </label>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {(() => {
            return pagedEntries.map((entry) => (
              <div
                key={entry.date}
                ref={(el) => {
                  if (el) {
                    dateRefs.current[entry.date] = el
                  } else {
                    delete dateRefs.current[entry.date]
                  }
                }}
              >
                <TimelineCard entry={entry} />
              </div>
            ))
          })()}
        </div>
        <div ref={loader} />
        {!hasMore && pagedEntries.length > 0 && (
          <p style={{ textAlign: 'center', color: '#aaa' }}>
            これ以上ありません
          </p>
        )}
        {pagedEntries.length === 0 && (
          <p style={{ textAlign: 'center', color: '#aaa' }}>
            データがありません
          </p>
        )}
      </div>
    )
  })
)
