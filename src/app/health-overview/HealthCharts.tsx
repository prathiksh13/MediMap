'use client'

import { useState } from 'react'
import {
  TRACKED_PARAMETERS,
  filterByTimeframe,
  getTrendBadge,
  type TimeRange,
  type TrendPoint,
} from '@/lib/healthRecommendations'

const BADGE_CLASS: Record<string, string> = {
  stable: 'bg-surface-low text-muted',
  improving: 'bg-status-green/10 text-status-green',
  worsening: 'bg-status-red/10 text-status-red',
}

function formatValue(parameter: string, value: number) {
  if (parameter === 'WBC Count' || parameter === 'Platelets') {
    return value.toLocaleString('en-IN')
  }
  return Number.isInteger(value) ? value.toString() : value.toFixed(1)
}

function LineChart({ data }: { data: { value: number; label: string }[] }) {
  if (data.length === 0) return null

  const W = 500
  const H = 140
  const PAD_LEFT = 52
  const PAD_RIGHT = 16
  const PAD_TOP = 16
  const PAD_BOT = 32

  const values = data.map(d => d.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const valueRange = maxV - minV || Math.abs(maxV) || 1
  // Add 15% breathing room top and bottom
  const yMin = minV - valueRange * 0.15
  const yMax = maxV + valueRange * 0.15
  const yRange = yMax - yMin || 1

  const toX = (i: number) => data.length === 1
    ? W / 2
    : PAD_LEFT + (i / (data.length - 1)) * (W - PAD_LEFT - PAD_RIGHT)
  const toY = (v: number) => PAD_TOP + (1 - (v - yMin) / yRange) * (H - PAD_TOP - PAD_BOT)

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value), ...d }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Y axis ticks — 4 evenly spaced
  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const v = yMin + (i / 3) * yRange
    return { y: toY(v), label: Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1) }
  }).reverse()

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
      {/* Y grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_LEFT} y1={t.y.toFixed(1)}
            x2={W - PAD_RIGHT} y2={t.y.toFixed(1)}
            stroke="#E8E4DC" strokeWidth="1"
          />
          <text
            x={(PAD_LEFT - 6).toFixed(1)} y={t.y.toFixed(1)}
            textAnchor="end" dominantBaseline="middle"
            fontSize="9" fill="#9E9E9E"
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* Line */}
      <path d={linePath} fill="none" stroke="#1A1A2E" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Red dots + x labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5" fill="#C0392B" stroke="#fff" strokeWidth="1.5" />
          <text
            x={p.x.toFixed(1)} y={(H - 6).toFixed(1)}
            textAnchor="middle" fontSize="9" fill="#9E9E9E"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function TrendCard({
  parameter,
  points,
  range,
}: {
  parameter: string
  points: TrendPoint[]
  range: TimeRange
}) {
  const filtered = filterByTimeframe(points, range)

  if (filtered.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-medium text-muted mb-1">{parameter}</h3>
        <div className="flex items-center justify-center h-32 text-center text-muted text-sm px-4">
          No data for {parameter} in this time range.
        </div>
      </div>
    )
  }

  const latest = filtered[filtered.length - 1]
  const badge = getTrendBadge(parameter, filtered)
  const variant = badge?.variant ?? 'stable'

  const chartData = filtered.map(d => ({
    value: d.value,
    label: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }).toUpperCase(),
  }))

  const valueColor =
    variant === 'worsening' ? 'text-status-red'
    : variant === 'improving' ? 'text-accent'
    : 'text-primary'

  return (
    <div className="card hover:border-muted/50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-medium text-muted">{parameter}</h3>
        {badge && (
          <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded ${BADGE_CLASS[variant]}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className={`font-playfair text-2xl font-bold ${valueColor}`}>
          {formatValue(parameter, latest.value)}
        </span>
        <span className="text-sm text-muted">{latest.unit}</span>
      </div>
      <LineChart data={chartData} />
    </div>
  )
}

export default function HealthCharts({
  parameterTrends,
  allParameterTrends,
}: {
  parameterTrends: Record<string, TrendPoint[]>
  allParameterTrends?: Record<string, TrendPoint[]>
}) {
  const [range, setRange] = useState<TimeRange>('1Y')
  const [showAll, setShowAll] = useState(false)

  const trackedKeys = new Set(TRACKED_PARAMETERS.map(p => p.key))
  const extraParams = Object.keys(allParameterTrends || {}).filter(k => !trackedKeys.has(k as never))

  return (
    <>
      <div className="flex items-center justify-end mb-6 -mt-2">
        <div className="flex gap-1 bg-surface border border-border p-1 rounded-lg">
          {(['3M', '6M', '1Y'] as TimeRange[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                range === r ? 'bg-primary text-white' : 'text-muted hover:bg-surface-low'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {TRACKED_PARAMETERS.map(({ key }) => (
          <TrendCard
            key={key}
            parameter={key}
            points={parameterTrends[key] || []}
            range={range}
          />
        ))}

        {showAll && extraParams.map(key => (
          <TrendCard
            key={key}
            parameter={key}
            points={(allParameterTrends || {})[key] || []}
            range={range}
          />
        ))}
      </div>

      {extraParams.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(prev => !prev)}
          className="inline-flex items-center text-sm text-accent font-medium hover:underline"
        >
          {showAll ? 'Show Fewer Parameters' : `View All Parameters (${extraParams.length} more)`}
        </button>
      )}
    </>
  )
}
