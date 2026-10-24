import { memo } from 'react'
import { avatarFileOf, hasNote, type MoodRecord } from '../domain/mood'
import { formatJstDateTime } from '../domain/time'
import styles from './TimelineCard.module.css'

const USERNAME = '@mpyw'

export const TimelineCard = memo(function TimelineCard({
  record,
}: {
  record: MoodRecord
}) {
  return (
    <article className={styles.card}>
      <img
        className={styles.avatar}
        src={`${import.meta.env.BASE_URL}${avatarFileOf(record.score)}`}
        alt=""
      />
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.user}>{USERNAME}</span>
          <time className={styles.time} dateTime={record.date}>
            {formatJstDateTime(record.date)}
          </time>
        </div>
        <div className={styles.score}>Score: {record.score}</div>
        {hasNote(record) && <p className={styles.note}>{record.note}</p>}
      </div>
    </article>
  )
})
