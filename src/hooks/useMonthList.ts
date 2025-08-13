import { useEffect, useState } from 'react'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const BASE_PATH = import.meta.env.VITE_BASE_PATH || ''

export function useMonthList() {
  const [months, setMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`${BASE_PATH}/data/history-list.jsonl`)
        if (!res.ok) throw new Error()
        const text = await res.text()
        const months = text
          .split('\n')
          .map((line) => {
            try {
              return JSON.parse(line).date
            } catch {
              return null
            }
          })
          .filter((d): d is string => !!d)
        setMonths(months.reverse())
      } catch {
        setMonths([getCurrentMonth()])
        setError('月リストの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return { months, loading, error }
}
