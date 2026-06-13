'use client'

import { useState } from 'react'
import HealthCharts from './HealthCharts'

interface ReportValue {
  id: string
  parameter_name: string
  value: number | null
  unit: string | null
  test_date: string | null
}

interface RecommendedTest {
  id: string
  test_name: string
  reason: string | null
  frequency_days: number | null
  next_due_date: string | null
  status: string
}

interface Condition {
  condition_name: string
}

type Range = '3M' | '6M' | '1Y'

function filterByRange(values: ReportValue[], range: Range): ReportValue[] {
  const now = new Date()
  const months = range === '3M' ? 3 : range === '6M' ? 6 : 12
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
  return values.filter(v => v.test_date && new Date(v.test_date) >= cutoff)
}

const statusBadge = (status: string) => {
  if (status === 'On Track') return 'status-normal'
  if (status === 'Due Soon') return 'status-low'
  return 'status-high'
}

export default function HealthOverviewClient({
  allValues,
  recommendedTests,
  conditions,
}: {
  allValues: ReportValue[]
  recommendedTests: RecommendedTest[]
  conditions: Condition[]
}) {
  const [selectedRange, setSelectedRange] = useState<Range>('1Y')

  const filtered = filterByRange(allValues, selectedRange)

  const parameterTrends: Record<string, { date: string; value: number; unit: string }[]> = {}
  filtered.forEach(v => {
    if (v.value && v.test_date) {
      if (!parameterTrends[v.parameter_name]) parameterTrends[v.parameter_name] = []
      parameterTrends[v.parameter_name].push({ date: v.test_date, value: v.value, unit: v.unit || '' })
    }
  })

  const trendableParams = Object.entries(parameterTrends)
    .filter(([, data]) => data.length >= 2)
    .slice(0, 4)

  return (
    <>
      {/* Range filter */}
      <div className="flex gap-2 justify-end mb-8">
        {(['3M', '6M', '1Y'] as Range[]).map(range => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              selectedRange === range
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted hover:border-primary hover:text-primary'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Trends */}
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Longitudinal Tracking</p>
        <h2 className="font-playfair text-xl font-bold text-primary mb-6">How your values are changing over time</h2>
        {trendableParams.length > 0 ? (
          <HealthCharts parameterTrends={parameterTrends} />
        ) : (
          <div className="card text-center py-10 text-muted">
            <p className="text-sm">No trend data for the selected range.</p>
            <p className="text-xs mt-1">Try a wider range, or upload more reports with the same parameters.</p>
          </div>
        )}
      </div>

      {/* Recommended tests */}
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Test Gap Analysis</p>
        <h2 className="font-playfair text-xl font-bold text-primary mb-2">Tests you should be taking</h2>
        {conditions.length > 0 && (
          <p className="text-sm text-muted mb-6">
            Based on your {conditions.map(c => c.condition_name).join(', ')} profile and recent reports.
          </p>
        )}
        {recommendedTests.length === 0 ? (
          <div className="card text-center py-8 text-muted text-sm">
            No recommended tests yet. Upload a report to generate recommendations.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-muted bg-surface-low">
                  <th className="text-left px-6 py-3">Test Name</th>
                  <th className="text-left px-6 py-3">Why Recommended</th>
                  <th className="text-left px-6 py-3">Frequency</th>
                  <th className="text-left px-6 py-3">Due Date</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recommendedTests.map(test => (
                  <tr key={test.id} className="border-b border-border last:border-0 hover:bg-surface-low">
                    <td className="px-6 py-3 font-medium text-primary">{test.test_name}</td>
                    <td className="px-6 py-3 text-muted">{test.reason || '—'}</td>
                    <td className="px-6 py-3 text-muted">{test.frequency_days ? `Every ${test.frequency_days} days` : '—'}</td>
                    <td className="px-6 py-3 text-muted">
                      {test.next_due_date
                        ? new Date(test.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-6 py-3"><span className={statusBadge(test.status)}>{test.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suggested doctors */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Specialist Discovery</p>
        <h2 className="font-playfair text-xl font-bold text-primary mb-6">Suggested Doctors in Hyderabad</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'Dr. Ramesh Babu', specialty: 'Diabetologist', exp: '18 years', location: 'Jubilee Hills', rating: '4.8' },
            { name: 'Dr. Priya Sharma', specialty: 'Endocrinologist', exp: '14 years', location: 'Banjara Hills', rating: '4.7' },
            { name: 'Dr. Suresh Rao', specialty: 'General Physician', exp: '22 years', location: 'Kukatpally', rating: '4.9' },
          ].map(doc => (
            <div key={doc.name} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-playfair font-bold text-sm">
                  {doc.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <p className="font-playfair font-semibold text-primary text-sm">{doc.name}</p>
                  <p className="text-xs text-muted">{doc.specialty} · {doc.exp}</p>
                </div>
              </div>
              <p className="text-xs text-muted mb-1">📍 {doc.location}, Hyderabad</p>
              <p className="text-xs text-accent mb-3">★ {doc.rating}</p>
              <button className="w-full border border-accent text-accent text-sm py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors">
                Book Appointment
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
