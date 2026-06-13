import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile && !profile.onboarding_complete) redirect('/onboarding')

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const latestReport = reports?.[0]
  const { data: latestValues } = latestReport
    ? await supabase.from('report_values').select('*').eq('report_id', latestReport.id).limit(6)
    : { data: null }

  const { data: upcomingTests } = await supabase
    .from('recommended_tests')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['Due Soon', 'Missing', 'Overdue'])
    .order('next_due_date', { ascending: true })
    .limit(3)

  const totalAbnormal = reports?.reduce((sum, r) => sum + (r.abnormal_count || 0), 0) || 0
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar userName={profile?.full_name || undefined} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold text-primary">{greeting}, {firstName}.</h1>
          <p className="text-muted text-sm mt-1">Here's your health summary.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Reports Uploaded', value: reports?.length || 0, sub: latestReport ? `Last upload ${new Date(latestReport.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No reports yet' },
            { label: 'Abnormal Values', value: latestReport?.abnormal_count || 0, sub: 'From latest report', valueClass: latestReport?.abnormal_count ? 'text-status-red' : 'text-primary' },
            { label: 'Next Test Due', value: latestReport?.next_test_name || '—', sub: latestReport?.next_test_date ? `Due ${new Date(latestReport.next_test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No upcoming tests', valueClass: 'text-accent font-playfair text-xl' },
            { label: 'Reports This Year', value: reports?.filter(r => new Date(r.created_at).getFullYear() === new Date().getFullYear()).length || 0, sub: 'Total uploads' },
          ].map(card => (
            <div key={card.label} className="card">
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{card.label}</p>
              <p className={`font-playfair text-3xl font-bold text-primary ${card.valueClass || ''}`}>{card.value}</p>
              <p className="text-xs text-muted mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6 mb-6">
          {/* Latest report */}
          <div className="col-span-3 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-playfair font-semibold text-primary">Recent Report</h2>
              {latestReport && (
                <Link href={`/reports/${latestReport.id}`} className="text-sm text-accent hover:underline">
                  View Full Analysis →
                </Link>
              )}
            </div>
            {latestReport ? (
              <>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                  <div>
                    <p className="font-medium text-primary">{latestReport.report_name}</p>
                    <p className="text-xs text-muted">{latestReport.lab_name} · {latestReport.test_date ? new Date(latestReport.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unknown'}</p>
                  </div>
                  <span className={latestReport.abnormal_count > 0 ? 'status-high' : 'status-normal'}>
                    {latestReport.abnormal_count > 0 ? `${latestReport.abnormal_count} Abnormal` : 'All Normal'}
                  </span>
                </div>
                <div className="space-y-2">
                  {(latestValues || []).map(v => (
                    <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-sm text-primary">{v.parameter_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{v.value} {v.unit}</span>
                        <span className={v.status === 'Normal' ? 'status-normal' : v.status === 'High' || v.status === 'Critical High' ? 'status-high' : 'status-low'}>
                          {v.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted text-sm mb-4">No reports uploaded yet.</p>
                <Link href="/reports" className="btn-primary text-sm">Upload Your First Report</Link>
              </div>
            )}
          </div>

          {/* Upcoming tests */}
          <div className="col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-playfair font-semibold text-primary">Upcoming Tests</h2>
              <Link href="/health-overview" className="text-sm text-accent hover:underline">View All →</Link>
            </div>
            {upcomingTests && upcomingTests.length > 0 ? (
              <div className="space-y-3">
                {upcomingTests.map(test => (
                  <div key={test.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                    <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-primary">{test.test_name}</p>
                      <p className="text-xs text-muted">{test.next_due_date ? new Date(test.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set'}</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full shrink-0 ${test.status === 'Due Soon' ? 'status-low' : test.status === 'Missing' || test.status === 'Overdue' ? 'status-high' : 'status-normal'}`}>
                      {test.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No upcoming tests. Upload a report to get recommendations.</p>
            )}
          </div>
        </div>

        {/* Quick upload */}
        <Link href="/reports" className="card border-dashed flex flex-col items-center justify-center py-10 hover:border-accent hover:bg-accent/5 transition-colors group block">
          <span className="text-3xl text-accent mb-3">↑</span>
          <p className="font-playfair font-semibold text-primary">Upload a new report</p>
          <p className="text-sm text-muted mt-1">PDF, JPG, or PNG — AI extracts the values automatically</p>
        </Link>
      </main>
    </div>
  )
}
