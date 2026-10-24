import type { ReactNode } from 'react'
import styles from './Checkbox.module.css'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  className?: string
}

export function Checkbox({ checked, onChange, children, className }: Props) {
  return (
    <label className={[styles.label, className].filter(Boolean).join(' ')}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.text}>{children}</span>
    </label>
  )
}
