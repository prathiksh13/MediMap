import type { ReportValue } from '@/types'

export type TimeRange = '3M' | '6M' | '1Y'

export const TRACKED_PARAMETERS = [
  { key: 'Hemoglobin', matchers: [/hemoglobin/i, /\bhgb\b/i] },
  { key: 'WBC Count', matchers: [/\bwbc\b/i, /white blood cell/i] },
  { key: 'HbA1c', matchers: [/hba1c/i, /\ba1c\b/i, /glycated hemoglobin/i] },
  { key: 'TSH', matchers: [/\btsh\b/i, /thyroid stimulating hormone/i] },
] as const

const INVERT_BETTER = new Set(['HbA1c'])

export interface TrendPoint {
  date: string
  value: number
  unit: string
}

export interface TrendBadge {
  label: 'Stable' | 'Improving' | 'Worsening'
  variant: 'stable' | 'improving' | 'worsening'
}

export interface TestRecommendation {
  test_name: string
  reason: string
  frequency_label: string
  frequency_days: number
  last_done_date: string | null
  status: 'Due Soon' | 'Missing' | 'On Track'
  action: string
}

interface TestRule {
  test_name: string
  reason: string
  frequency_days: number
  frequency_label: string
  matchers: RegExp[]
}

const CONDITION_RULES: Record<string, TestRule[]> = {
  diabetes: [
    { test_name: 'HbA1c', reason: 'Diabetes monitoring', frequency_days: 90, frequency_label: 'Every 3 months', matchers: [/hba1c/i, /\ba1c\b/i] },
    { test_name: 'Microalbuminuria', reason: 'Kidney complication screening', frequency_days: 180, frequency_label: 'Every 6 months', matchers: [/microalbumin/i, /urine albumin/i] },
    { test_name: 'Lipid Panel', reason: 'Cardiovascular risk in diabetics', frequency_days: 180, frequency_label: 'Every 6 months', matchers: [/lipid/i, /cholesterol/i, /\bldl\b/i, /\bhdl\b/i, /triglyceride/i] },
    { test_name: 'Eye Examination', reason: 'Diabetic retinopathy', frequency_days: 365, frequency_label: 'Yearly', matchers: [/eye exam/i, /retinopathy/i, /ophthalmol/i] },
    { test_name: 'Foot Examination', reason: 'Diabetic neuropathy', frequency_days: 365, frequency_label: 'Yearly', matchers: [/foot exam/i, /neuropathy/i] },
  ],
  asthma: [
    { test_name: 'Spirometry', reason: 'Lung function monitoring', frequency_days: 365, frequency_label: 'Yearly', matchers: [/spirometry/i, /pulmonary function/i, /\bpft\b/i] },
    { test_name: 'Allergy Assessment', reason: 'Trigger identification and control', frequency_days: 365, frequency_label: 'Yearly', matchers: [/allergy/i, /ige/i] },
  ],
  hypertension: [
    { test_name: 'Kidney Function Test', reason: 'Renal health monitoring', frequency_days: 365, frequency_label: 'Yearly', matchers: [/kidney function/i, /\bcreatinine\b/i, /\bbun\b/i, /renal/i] },
    { test_name: 'Lipid Profile', reason: 'Cardiovascular risk assessment', frequency_days: 365, frequency_label: 'Yearly', matchers: [/lipid/i, /cholesterol/i, /\bldl\b/i, /\bhdl\b/i, /triglyceride/i] },
  ],
}

function normalizeCondition(name: string) {
  return name.toLowerCase().trim()
}

function matchesCondition(conditionName: string, key: string) {
  const normalized = normalizeCondition(conditionName)
  if (key === 'diabetes') return /diabetes|diabetic|type\s*1|type\s*2/i.test(normalized)
  if (key === 'asthma') return /asthma/i.test(normalized)
  if (key === 'hypertension') return /hypertension|high blood pressure|hbp/i.test(normalized)
  return false
}

export function matchParameterName(name: string, matchers: RegExp[]) {
  return matchers.some(m => m.test(name))
}

export function buildParameterTrends(
  values: Array<Pick<ReportValue, 'parameter_name' | 'value' | 'unit' | 'test_date'>>,
): Record<string, TrendPoint[]> {
  const trends: Record<string, TrendPoint[]> = {
    'Hemoglobin': [],
    'WBC Count': [],
    'HbA1c': [],
    'TSH': [],
  }

  for (const row of values) {
    if (row.value == null || !row.test_date) continue
    const tracked = TRACKED_PARAMETERS.find(p => matchParameterName(row.parameter_name, [...p.matchers]))
    if (!tracked) continue
    trends[tracked.key].push({
      date: row.test_date,
      value: row.value,
      unit: row.unit || '',
    })
  }

  for (const key of Object.keys(trends)) {
    trends[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  return trends
}

export function buildAllParameterTrends(
  values: Array<Pick<ReportValue, 'parameter_name' | 'value' | 'unit' | 'test_date'>>,
): Record<string, TrendPoint[]> {
  const trends: Record<string, TrendPoint[]> = {}

  for (const row of values) {
    if (row.value == null || !row.test_date) continue
    const name = (row.parameter_name || '').trim()
    if (!name) continue
    if (!trends[name]) trends[name] = []
    trends[name].push({
      date: row.test_date,
      value: row.value,
      unit: row.unit || '',
    })
  }

  for (const key of Object.keys(trends)) {
    trends[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  return trends
}

export function filterByTimeframe(points: TrendPoint[], range: TimeRange) {
  const months = range === '3M' ? 3 : range === '6M' ? 6 : 12
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  return points.filter(p => new Date(p.date) >= cutoff)
}

export function getTrendBadge(parameter: string, points: TrendPoint[]): TrendBadge | null {
  if (points.length < 2) return null

  const first = points[0].value
  const last = points[points.length - 1].value
  if (first === 0) return { label: 'Stable', variant: 'stable' }

  const pct = ((last - first) / first) * 100
  if (Math.abs(pct) < 5) return { label: 'Stable', variant: 'stable' }

  const invert = INVERT_BETTER.has(parameter)

  if (invert) {
    if (pct < -5) return { label: 'Improving', variant: 'improving' }
    if (pct > 5) return { label: 'Worsening', variant: 'worsening' }
  } else {
    if (pct > 5) return { label: 'Worsening', variant: 'worsening' }
    if (pct < -5) return { label: 'Improving', variant: 'improving' }
  }

  return { label: 'Stable', variant: 'stable' }
}

function findLastDoneDate(
  matchers: RegExp[],
  values: Array<Pick<ReportValue, 'parameter_name' | 'test_date'>>,
  reports: Array<{ test_date: string | null; report_name: string; report_type: string }>,
): string | null {
  let latest: string | null = null

  for (const row of values) {
    if (!row.test_date) continue
    if (!matchParameterName(row.parameter_name, matchers)) continue
    if (!latest || row.test_date > latest) latest = row.test_date
  }

  for (const report of reports) {
    if (!report.test_date) continue
    const haystack = `${report.report_name} ${report.report_type}`
    if (!matchers.some(m => m.test(haystack))) continue
    if (!latest || report.test_date > latest) latest = report.test_date
  }

  return latest
}

function computeTestStatus(lastDoneDate: string | null, frequencyDays: number): TestRecommendation['status'] {
  if (!lastDoneDate) return 'Missing'

  const lastDone = new Date(lastDoneDate)
  const today = new Date()
  const daysSince = Math.floor((today.getTime() - lastDone.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSince >= frequencyDays) return 'Due Soon'
  if (daysSince >= frequencyDays - 30) return 'Due Soon'
  return 'On Track'
}

function actionForStatus(status: TestRecommendation['status']) {
  if (status === 'Due Soon') return 'Schedule'
  if (status === 'Missing') return 'Learn More'
  return '—'
}

export function buildTestRecommendations(
  conditions: Array<{ condition_name: string }>,
  values: Array<Pick<ReportValue, 'parameter_name' | 'test_date'>>,
  reports: Array<{ test_date: string | null; report_name: string; report_type: string }>,
): TestRecommendation[] {
  const seen = new Set<string>()
  const recommendations: TestRecommendation[] = []

  for (const condition of conditions) {
    for (const [key, rules] of Object.entries(CONDITION_RULES)) {
      if (!matchesCondition(condition.condition_name, key)) continue

      for (const rule of rules) {
        if (seen.has(rule.test_name)) continue
        seen.add(rule.test_name)

        const lastDone = findLastDoneDate(rule.matchers, values, reports)
        const status = computeTestStatus(lastDone, rule.frequency_days)

        recommendations.push({
          test_name: rule.test_name,
          reason: rule.reason,
          frequency_label: rule.frequency_label,
          frequency_days: rule.frequency_days,
          last_done_date: lastDone,
          status,
          action: actionForStatus(status),
        })
      }
    }
  }

  return recommendations
}

export function formatLastDone(date: string | null) {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
