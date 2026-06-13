'use client'

import { useState } from 'react'

export default function TimeRangeSelector() {
  const [active, setActive] = useState('1Y')
  return (
    <div className="flex gap-1 border border-border rounded-md overflow-hidden">
      {['3M', '6M', '1Y'].map(r => (
        <button
          key={r}
          onClick={() => setActive(r)}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${active === r ? 'bg-primary text-white' : 'text-muted hover:text-primary'}`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
