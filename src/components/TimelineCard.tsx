import React from 'react'

export type TimelineEntry = {
  date: string
  score: number
  note?: string
}

const BASE_PATH = import.meta.env.VITE_BASE_PATH || ''
const USERNAME = '@mpyw'

const selectAvatarUrl = (score: number): string => {
  if (score >= 10) {
    return `${BASE_PATH}/mpyw-star-struck.png`
  }
  if (score >= 8) {
    return `${BASE_PATH}/mpyw-grinning.png`
  }
  if (score >= 6) {
    return `${BASE_PATH}/mpyw-slightly_smiling_face.png`
  }
  if (score >= 4) {
    return `${BASE_PATH}/mpyw-neutral_face.png`
  }
  if (score >= 2) {
    return `${BASE_PATH}/mpyw-slightly_frowning_face.png`
  }
  return `${BASE_PATH}/mpyw-disappointed.png`
}

export const TimelineCard: React.FC<{ entry: TimelineEntry }> = React.memo(
  ({ entry }) => {
    const date = new Date(entry.date)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 16,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 2px 8px #0001',
          padding: entry.note ? 24 : 12,
          margin: '0 0 18px 0',
          minHeight: entry.note ? 120 : 60,
          maxWidth: 520,
          width: 520,
        }}
      >
        <img
          src={selectAvatarUrl(entry.score)}
          alt="avatar"
          style={{ width: 64, height: 64, borderRadius: '50%' }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: '#222', fontSize: 18 }}>
              {USERNAME}
            </span>
            <span style={{ color: '#888', fontSize: 13 }}>{dateStr}</span>
          </div>
          <div style={{ margin: '6px 0 0 0', fontSize: 15, color: '#333' }}>
            <span style={{ fontWeight: 600, color: '#646cff' }}>
              Score: {entry.score}
            </span>
          </div>
          {entry.note && (
            <div
              style={{
                margin: '14px 0 0 0',
                fontSize: 17,
                color: '#222',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                background: '#f3f6fd',
                borderRadius: 8,
                padding: '12px 16px',
                fontWeight: 500,
              }}
            >
              {entry.note}
            </div>
          )}
        </div>
      </div>
    )
  }
)
