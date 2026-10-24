import { memo } from 'react'
import type { YearMonth } from '../domain/month'
import styles from './MonthSelector.module.css'

type Props = {
  months: readonly YearMonth[]
  value: YearMonth
  onChange: (month: YearMonth) => void
}

export const MonthSelector = memo(function MonthSelector({
  months,
  value,
  onChange,
}: Props) {
  return (
    <select
      aria-label="表示する月"
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {months.map((month) => (
        <option key={month} value={month}>
          {month}
        </option>
      ))}
    </select>
  )
})
