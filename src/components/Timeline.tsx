import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TimelineCard, type TimelineEntry } from './TimelineCard';

export type TimelineHandle = {
  scrollToDate: (date: string) => void;
};

export const Timeline = forwardRef<TimelineHandle, { entries: TimelineEntry[] }>(
  ({ entries }, ref) => {
    const [page, setPage] = useState(1);
    const [showOnlyWithNote, setShowOnlyWithNote] = useState(true);
    const loader = useRef<HTMLDivElement | null>(null);
    const pageSize = 20;
    // 日付→refのMap
    const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const filteredEntries = showOnlyWithNote
      ? entries.filter(e => e.note && e.note.trim() !== '')
      : entries;
    const pagedEntries = filteredEntries.slice(0, page * pageSize);
    const hasMore = filteredEntries.length > pagedEntries.length;

    // 無限スクロール
    const handleObserver = useCallback((entriesObs: IntersectionObserverEntry[]) => {
      const target = entriesObs[0];
      if (target.isIntersecting && hasMore) {
        setPage(p => p + 1);
      }
    }, [hasMore]);

    // IntersectionObserver登録
    useEffect(() => {
      const option = { root: null, rootMargin: '0px', threshold: 1.0 };
      const observer = new window.IntersectionObserver(handleObserver, option);
      if (loader.current) observer.observe(loader.current);
      return () => { if (loader.current) observer.unobserve(loader.current); };
    }, [handleObserver]);

    // 親から呼び出せるscrollToDate
    useImperativeHandle(ref, () => ({
      scrollToDate: (date: string) => {
        // Note付きのみの場合、refが存在しない日付は「ない」扱い
        if (showOnlyWithNote && !dateRefs.current[date]) {
          console.log('[Timeline.scrollToDate] (Note付きのみ) element not found for', date);
          return;
        }
        const el = dateRefs.current[date];
        if (el) {
          console.log('[Timeline.scrollToDate] called for', date, 'el:', el);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // まだpagedEntriesに含まれていない場合はpageを進めて再試行
          const idx = filteredEntries.findIndex(e => e.date.slice(0, 10) === date);
          if (idx !== -1 && idx >= page * pageSize) {
            const newPage = Math.ceil((idx + 1) / pageSize);
            console.log('[Timeline.scrollToDate] paging up to', newPage, 'for', date);
            setPage(newPage);
            // 再レンダリング後に再度scrollToDateを呼ぶため、少し遅延して再呼び出し
            setTimeout(() => {
              if (ref && typeof ref !== 'function' && ref.current) {
                ref.current.scrollToDate(date);
              }
            }, 100);
          } else {
            console.log('[Timeline.scrollToDate] element not found for', date);
          }
        }
      }
    }), [showOnlyWithNote, filteredEntries, page, pageSize]);

    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 0' }}>
        <div style={{
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
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: 12, marginTop: 0 }}>Mood Timeline</h2>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            justifyContent: 'center', padding: '4px 10px', boxShadow: 'none',
            fontSize: 15, cursor: 'pointer', marginBottom: 0,
            background: 'none',
          }}>
            <input
              type="checkbox"
              checked={showOnlyWithNote}
              onChange={e => { setShowOnlyWithNote(e.target.checked); setPage(1); }}
              style={{ accentColor: '#646cff', width: 18, height: 18, marginRight: 4 }}
            />
            <span style={{ userSelect: 'none', color: '#666' }}>Note 付きのみ</span>
          </label>
        </div>
        {pagedEntries.map((entry, i) => (
          <div
            key={entry.date + '-' + i}
            ref={el => {
              // その日付の一番新しい投稿だけrefにセット（既にあればスキップ）
              const dateKey = entry.date.slice(0, 10);
              if (el && !dateRefs.current[dateKey]) {
                dateRefs.current[dateKey] = el;
              }
            }}
          >
            <TimelineCard entry={entry} />
          </div>
        ))}
        <div ref={loader} />
        {!hasMore && pagedEntries.length > 0 && <p style={{ textAlign: 'center', color: '#aaa' }}>これ以上ありません</p>}
        {pagedEntries.length === 0 && <p style={{ textAlign: 'center', color: '#aaa' }}>データがありません</p>}
      </div>
    );
  }
);
