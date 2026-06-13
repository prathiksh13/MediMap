import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import HealthCharts from './HealthCharts'
import { buildParameterTrends, buildAllParameterTrends, buildTestRecommendations, formatLastDone } from '@/lib/healthRecommendations'

interface InsurancePlan {
  name: string
  description: string
  premium: string
  highlight?: string
  conditionKeys: string[]  // which condition buckets this plan is relevant for
}

// Extended pool — plans are scored against the user's actual conditions at render time
const ALL_INSURANCE_PLANS: InsurancePlan[] = [
  {
    name: 'Star Health Diabetes Safe',
    description: 'Covers regular HbA1c testing and related endocrinology consultations without waiting periods.',
    premium: '~₹8,200',
    conditionKeys: ['diabetes'],
  },
  {
    name: 'Niva Bupa ReAssure 2.0',
    description: 'Unlimited restoration of sum insured and a dedicated chronic disease management programme.',
    premium: '~₹11,000',
    conditionKeys: ['diabetes', 'hypertension', 'cardiac'],
  },
  {
    name: 'HDFC ERGO Optima Restore',
    description: 'Full 100% restore benefit for chronic condition management, with no sub-limits on room rent.',
    premium: '~₹10,500',
    conditionKeys: ['diabetes', 'hypertension', 'cardiac', 'kidney'],
  },
  {
    name: 'Care Health Supreme',
    description: 'OPD cover for specialist visits and diagnostic tests across endocrinology and internal medicine.',
    premium: '~₹9,800',
    conditionKeys: ['thyroid', 'diabetes', 'pcos'],
  },
  {
    name: 'Star Health Cardiac Care',
    description: 'Designed for cardiac patients — covers bypass, angioplasty, and regular cardiac monitoring.',
    premium: '~₹15,500',
    conditionKeys: ['cardiac', 'hypertension'],
  },
  {
    name: 'Aditya Birla Activ Health Platinum',
    description: 'Chronic management programme with premium discounts for maintaining health benchmarks.',
    premium: '~₹12,800',
    conditionKeys: ['diabetes', 'hypertension', 'cholesterol'],
  },
  {
    name: 'ManipalCigna ProHealth Plus',
    description: 'Covers pre-existing diseases from day one after a short waiting period, including kidney conditions.',
    premium: '~₹9,200',
    conditionKeys: ['kidney', 'hypertension'],
  },
  {
    name: 'Star Women Care',
    description: 'Comprehensive cover including PCOS/PCOD treatment, fertility consultations, and OPD diagnostics.',
    premium: '~₹7,400',
    conditionKeys: ['pcos'],
  },
  {
    name: 'SBI Arogya Premier',
    description: 'General comprehensive cover with good OPD benefits for anaemia monitoring and specialist visits.',
    premium: '~₹8,900',
    conditionKeys: ['anaemia', 'thyroid'],
  },
  {
    name: 'Bajaj Allianz Health Guard',
    description: 'Broad-spectrum cover with add-on riders for respiratory illnesses including asthma management.',
    premium: '~₹7,600',
    conditionKeys: ['asthma'],
  },
]

function normalizeConditionKey(name: string): string {
  const n = name.toLowerCase()
  if (/diabetes|diabetic|type\s*1|type\s*2/.test(n)) return 'diabetes'
  if (/hypertension|high blood pressure/.test(n)) return 'hypertension'
  if (/cardiac|heart/.test(n)) return 'cardiac'
  if (/thyroid|hypothyroid|hyperthyroid|tsh/.test(n)) return 'thyroid'
  if (/kidney|renal|nephro/.test(n)) return 'kidney'
  if (/cholesterol|lipid/.test(n)) return 'cholesterol'
  if (/pcos|pcod/.test(n)) return 'pcos'
  if (/anaemia|anemia/.test(n)) return 'anaemia'
  if (/asthma/.test(n)) return 'asthma'
  return 'general'
}

function getMatchedInsurancePlans(
  conditions: { condition_name: string }[]
): (InsurancePlan & { score: number })[] {
  const userKeys = new Set(conditions.map(c => normalizeConditionKey(c.condition_name)))

  const scored = ALL_INSURANCE_PLANS.map(plan => ({
    ...plan,
    score: plan.conditionKeys.filter(k => userKeys.has(k)).length,
  }))

  scored.sort((a, b) => b.score - a.score)

  // Top 3; mark the highest-scoring one as "High Match" if it covers at least one condition
  const top3 = scored.slice(0, 3)
  if (top3[0].score > 0) {
    top3[0] = { ...top3[0], highlight: 'High Match' }
  }
  return top3
}

export default async function HealthOverviewPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const { data: conditions } = await supabase.from('user_conditions').select('*').eq('user_id', user.id)

  const { data: allValues } = await supabase
    .from('report_values')
    .select('parameter_name, value, unit, test_date')
    .eq('user_id', user.id)
    .order('test_date', { ascending: true })

  const { data: reports } = await supabase
    .from('reports')
    .select('test_date, report_name, report_type')
    .eq('user_id', user.id)
    .order('test_date', { ascending: false })

  const matchedInsurancePlans = getMatchedInsurancePlans(conditions || [])
  const parameterTrends = buildParameterTrends(allValues || [])
  const allParameterTrends = buildAllParameterTrends(allValues || [])
  const testRecommendations = buildTestRecommendations(conditions || [], allValues || [], reports || [])

  const statusClass = (status: string) => {
    if (status === 'On Track') return 'text-status-green'
    if (status === 'Due Soon') return 'text-accent'
    return 'text-status-red'
  }

  const statusDot = (status: string) => {
    if (status === 'On Track') return 'bg-status-green'
    if (status === 'Due Soon') return 'bg-accent'
    return 'bg-status-red'
  }

  const conditionSummary = conditions?.length
    ? conditions.map(c => c.condition_name).join(', ')
    : 'your health'

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar userName={profile?.full_name || undefined} />
      <main className="ml-60 flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-primary">Health Overview</h1>
            <p className="text-muted text-sm mt-1">Your complete health picture across all reports.</p>
          </div>
        </div>

        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Longitudinal Tracking</p>
          <h2 className="font-playfair text-xl font-bold text-primary mb-2">How your values are changing over time</h2>
          <HealthCharts parameterTrends={parameterTrends} allParameterTrends={allParameterTrends} />
        </div>

        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Test Gap Analysis</p>
          <h2 className="font-playfair text-xl font-bold text-primary mb-2">Tests you should be taking</h2>
          <p className="text-sm text-muted mb-6">Based on your {conditionSummary} profile and recent reports.</p>

          {testRecommendations.length === 0 ? (
            <div className="card text-center py-8 text-muted text-sm">
              Add health conditions in your profile to see recommended tests.
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-muted bg-surface-low">
                      <th className="text-left px-6 py-3">Test Name</th>
                      <th className="text-left px-6 py-3">Why Recommended</th>
                      <th className="text-left px-6 py-3">Frequency</th>
                      <th className="text-left px-6 py-3">Last Done</th>
                      <th className="text-left px-6 py-3">Status</th>
                      <th className="text-right px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testRecommendations.map(test => (
                      <tr key={test.test_name} className="border-b border-border last:border-0 hover:bg-surface-low">
                        <td className="px-6 py-3 font-medium text-primary">{test.test_name}</td>
                        <td className="px-6 py-3 text-muted">{test.reason}</td>
                        <td className="px-6 py-3 text-muted">{test.frequency_label}</td>
                        <td className="px-6 py-3 text-muted">{formatLastDone(test.last_done_date)}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center ${statusClass(test.status)}`}>
                            <span className={`w-2 h-2 rounded-full mr-2 ${statusDot(test.status)}`} />
                            {test.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {test.action === '—' ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <button type="button" className={`text-sm font-medium hover:underline ${test.status === 'Due Soon' ? 'text-accent' : 'text-muted'}`}>
                              {test.action}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
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
                      {doc.name.split(' ').map(n => n[0]).join('')}
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

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted mb-1">Coverage Matching</p>
            <h2 className="font-playfair text-xl font-bold text-primary mb-6">Insurance Recommendations</h2>
            <div className="space-y-4">
              {matchedInsurancePlans.map(plan => (
                <div key={plan.name} className="card hover:border-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-playfair font-semibold text-primary">{plan.name}</h3>
                    {plan.highlight && (
                      <span className="bg-status-amber/10 text-accent text-[10px] font-bold uppercase px-2 py-1 rounded">
                        {plan.highlight}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted mb-4 border-l-2 border-accent pl-3">{plan.description}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <div className="font-medium text-primary">
                      {plan.premium} <span className="text-muted font-normal text-xs">/ year</span>
                    </div>
                    <button type="button" className="text-sm text-accent font-medium hover:underline">
                      View Plan →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
