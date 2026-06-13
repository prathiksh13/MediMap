'use client'

interface Value {
  id: string
  parameter_name: string
  value: number | null
  unit: string | null
  status: string | null
  ref_range_low: number | null
  ref_range_high: number | null
  ref_range_text: string | null
}

interface TrendPoint {
  date: string
  value: number
  report_name: string
}

interface Props {
  values: Value[]
  parameterHistory: Record<string, TrendPoint[]>
}

function LineChart({ data }: { data: { value: number; label: string }[] }) {
  if (data.length < 2) return null

  const W = 500
  const H = 140
  const PAD_LEFT = 52
  const PAD_RIGHT = 16
  const PAD_TOP = 16
  const PAD_BOT = 32

  const values = data.map(d => d.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const valueRange = maxV - minV || 1
  const yMin = minV - valueRange * 0.15
  const yMax = maxV + valueRange * 0.15
  const yRange = yMax - yMin

  const toX = (i: number) => PAD_LEFT + (i / (data.length - 1)) * (W - PAD_LEFT - PAD_RIGHT)
  const toY = (v: number) => PAD_TOP + (1 - (v - yMin) / yRange) * (H - PAD_TOP - PAD_BOT)

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value), ...d }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  const yTicks = Array.from({ length: 4 }, (_, i) => {
    const v = yMin + (i / 3) * yRange
    return { y: toY(v), label: Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1) }
  }).reverse()

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', overflow: 'visible' }}>
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
      <path d={linePath} fill="none" stroke="#1A1A2E" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5" fill="#C0392B" stroke="#fff" strokeWidth="1.5" />
          <text x={p.x.toFixed(1)} y={(H - 6).toFixed(1)} textAnchor="middle" fontSize="9" fill="#9E9E9E">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function getVariant(
  status: string | null,
  history: TrendPoint[],
  currentValue: number | null
): 'stable' | 'improving' | 'worsening' {
  if (history.length > 0 && currentValue !== null) {
    const prev = history[history.length - 1].value
    const delta = Math.abs(currentValue - prev) / (prev || 1)
    if (delta > 0.05) {
      if (status === 'High' || status === 'Critical High') return currentValue > prev ? 'worsening' : 'improving'
      if (status === 'Low' || status === 'Critical Low') return currentValue < prev ? 'worsening' : 'improving'
      return currentValue > prev ? 'worsening' : 'improving'
    }
  }
  if (status === 'High' || status === 'Critical High' || status === 'Low' || status === 'Critical Low') return 'worsening'
  return 'stable'
}

function ParameterCard({ v, history }: { v: Value; history: TrendPoint[] }) {
  const allPoints = [
    ...history,
    ...(v.value !== null ? [{ date: 'now', value: v.value, report_name: 'This Report' }] : []),
  ]

  const variant = getVariant(v.status, history, v.value)

  const BADGE_CLASS: Record<string, string> = {
    stable: 'bg-surface-low text-muted',
    improving: 'bg-green-50 text-green-700',
    worsening: 'bg-red-50 text-red-700',
  }
  const BADGE_LABEL: Record<string, string> = {
    stable: 'Stable',
    improving: 'Improving',
    worsening: v.status || 'Worsening',
  }

  const valueColor =
    variant === 'worsening' ? 'text-status-red'
    : variant === 'improving' ? 'text-accent'
    : 'text-primary'

  const chartData = allPoints.map(p => ({
    value: p.value,
    label:
      p.date === 'now'
        ? 'NOW'
        : new Date(p.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }).toUpperCase(),
  }))

  return (
    <div className="card hover:border-muted/50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-medium text-muted">{v.parameter_name}</h3>
        <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded ${BADGE_CLASS[variant]}`}>
          {BADGE_LABEL[variant]}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`font-playfair text-2xl font-bold ${valueColor}`}>{v.value ?? '—'}</span>
        <span className="text-sm text-muted">{v.unit}</span>
      </div>
      {v.ref_range_text && (
        <p className="text-[11px] text-muted mb-3">Ref: {v.ref_range_text}</p>
      )}
      {allPoints.length >= 2 ? (
        <LineChart data={chartData} />
      ) : (
        <p className="text-[11px] text-muted mt-4 pb-2">Upload more reports with this test to see the trend line.</p>
      )}
    </div>
  )
}

export default function ReportCharts({ values, parameterHistory }: Props) {
  const numericValues = values.filter(v => v.value !== null && v.value !== undefined)

  if (numericValues.length === 0) {
    return (
      <div className="card mb-6">
        <h2 className="font-playfair font-semibold text-primary mb-2">Parameter Trends</h2>
        <p className="text-sm text-muted">No numeric values to chart.</p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <h2 className="font-playfair font-semibold text-primary mb-1">Parameter Trends</h2>
      <p className="text-xs text-muted mb-5">
        Each card shows the current value and how it has changed across your reports.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {numericValues.map(v => (
          <ParameterCard
            key={v.id}
            v={v}
            history={parameterHistory[v.parameter_name] || []}
          />
        ))}
      </div>
    </div>
  )
}
