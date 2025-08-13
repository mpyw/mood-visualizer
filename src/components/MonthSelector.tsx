import React from 'react'

type MonthSelectorProps = {
  months: string[]
  value: string
  onChange: (month: string) => void
}

const MonthSelector: React.FC<MonthSelectorProps> = ({
  months,
  value,
  onChange,
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      fontSize: 16,
      padding: '8px 18px 8px 10px',
      borderRadius: 8,
      border: '1.5px solid #bfc6e0',
      background: 'linear-gradient(90deg, #f3f6fd 80%, #e0e7ff 100%)',
      color: '#333',
      boxShadow: '0 1px 4px #0001',
      outline: 'none',
      appearance: 'none',
      cursor: 'pointer',
      fontWeight: 500,
      minWidth: 120,
    }}
  >
    {months.map((month) => (
      <option key={month} value={month}>
        {month}
      </option>
    ))}
  </select>
)

export default React.memo(MonthSelector)
