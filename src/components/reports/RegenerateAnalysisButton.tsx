'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegenerateAnalysisButton({ reportId }: { reportId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleRegenerate() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/reports/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRegenerate}
        disabled={loading}
        className="btn-outline text-sm disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Regenerating…
          </span>
        ) : (
          'Regenerate Analysis'
        )}
      </button>
      {error && <p className="text-xs text-status-red">{error}</p>}
    </div>
  )
}
