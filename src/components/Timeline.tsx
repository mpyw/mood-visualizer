import React, {useState, useRef, useCallback, useEffect} from 'react';
import { TimelineCard, type TimelineEntry } from './TimelineCard';

export const Timeline: React.FC<{ entries: TimelineEntry[] }> = ({ entries }) => {
  const [page, setPage] = useState(1);
  const [showOnlyWithNote, setShowOnlyWithNote] = useState(true);
  const loader = useRef<HTMLDivElement | null>(null);
  const pageSize = 20;

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
        <TimelineCard key={entry.date + '-' + i} entry={entry} />
      ))}
      <div ref={loader} />
      {!hasMore && pagedEntries.length > 0 && <p style={{ textAlign: 'center', color: '#aaa' }}>これ以上ありません</p>}
      {pagedEntries.length === 0 && <p style={{ textAlign: 'center', color: '#aaa' }}>データがありません</p>}
    </div>
  );
};

