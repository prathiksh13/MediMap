import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'

interface PageProps {
  params: { testName: string }
}

function statusClass(s: string) {
  if (s === 'High' || s === 'Critical High') return 'text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-medium'
  if (s === 'Low' || s === 'Critical Low') return 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-medium'
  return 'text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-medium'
}

export default async function TestHistoryPage({ params }: PageProps) {
  const testName = decodeURIComponent(params.testName)
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Fetch all reports that match this test name (report_type or report_name contains testName)
  const { data: allReports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('test_date', { ascending: false })

  // Filter to reports matching the test — loose match so "TSH", "Free T4" etc. all work
  const matchedReports = (allReports || []).filter(r => {
    const rt = (r.report_type || '').toLowerCase()
    const rn = (r.report_name || '').toLowerCase()
    const tn = testName.toLowerCase()
    return rt.includes(tn) || rn.includes(tn) || tn.includes(rt)
  })

  // For each matched report, fetch its values
  const reportIds = matchedReports.map(r => r.id)
  const { data: allValues } = reportIds.length > 0
    ? await supabase
        .from('report_values')
        .select('*')
        .in('report_id', reportIds)
        .order('created_at')
    : { data: [] }

  const valuesByReport: Record<string, any[]> = {}
  for (const v of (allValues || [])) {
    if (!valuesByReport[v.report_id]) valuesByReport[v.report_id] = []
    valuesByReport[v.report_id]!.push(v)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userName={profile?.full_name || undefined} />
      <main className="ml-60 flex-1 p-8">
        {/* Back + header */}
        <div className="mb-8">
          <Link href="/reports" className="text-sm text-accent hover:underline font-medium">
            ← Back to My Reports
          </Link>
          <h1 className="font-playfair text-3xl font-bold text-primary mt-3">{testName} — Report History</h1>
          <p className="text-muted text-sm mt-1">
            {matchedReports.length === 0
              ? 'No reports uploaded for this test yet.'
              : `${matchedReports.length} report${matchedReports.length > 1 ? 's' : ''} found — most recent first.`}
          </p>
        </div>

        {matchedReports.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-muted text-sm mb-4">You haven't uploaded any {testName} reports yet.</p>
            <Link
              href={`/upload?test=${encodeURIComponent(testName)}`}
              className="btn-primary"
            >
              Upload First {testName} Report
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {matchedReports.map((report, idx) => {
              const values = valuesByReport[report.id] || []
              const abnormal = values.filter(v => v.status && v.status !== 'Normal')
              const testDateObj = report.test_date ? new Date(report.test_date) : null
              const uploadDateObj = new Date(report.created_at)

              return (
                <div key={report.id} className="card">
                  {/* Test date header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">
                        {idx === 0 ? 'Latest Report' : `Report ${matchedReports.length - idx}`}
                      </p>
                      <h2 className="font-playfair text-xl font-bold text-primary">
                        {testDateObj
                          ? testDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'Date not recorded'}
                      </h2>
                      <p className="text-xs text-muted mt-0.5">
                        Uploaded on {uploadDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {report.lab_name ? ` · ${report.lab_name}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Download original report */}
                      {report.file_url && (
                        <a
                          href={report.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm border border-border text-muted px-4 py-1.5 rounded-md hover:border-accent hover:text-accent transition-colors"
                        >
                          ↓ Download Report
                        </a>
                      )}
                      <Link
                        href={`/reports/${report.id}`}
                        className="text-sm border border-accent text-accent px-4 py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors"
                      >
                        View Full Analysis →
                      </Link>
                    </div>
                  </div>

                  {/* Status strip */}
                  <div className="flex items-center gap-6 mb-5 p-3 bg-surface-low rounded-lg">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted tracking-wide">Parameters</p>
                      <p className="font-playfair text-lg font-bold text-primary">{values.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted tracking-wide">Abnormal</p>
                      <p className={`font-playfair text-lg font-bold ${abnormal.length > 0 ? 'text-status-red' : 'text-status-green'}`}>
                        {abnormal.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted tracking-wide">Overall</p>
                      <p className={`font-playfair text-lg font-bold ${
                        report.overall_status === 'Normal' ? 'text-status-green'
                        : report.overall_status === 'Abnormal' ? 'text-status-red'
                        : 'text-primary'
                      }`}>
                        {report.overall_status || '—'}
                      </p>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  {report.ai_summary ? (
                    <div className="mb-5 p-4 border-l-4 border-accent bg-accent/5 rounded-r-md">
                      <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">MediMap Analysis</p>
                      <p className="text-sm text-primary leading-relaxed">{report.ai_summary}</p>
                    </div>
                  ) : (
                    <div className="mb-5 p-3 bg-surface-low rounded-md">
                      <p className="text-sm text-muted">No AI analysis available for this report.</p>
                    </div>
                  )}

                  {/* Parameter values table */}
                  {values.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="text-left py-2 pr-4">Parameter</th>
                            <th className="text-left py-2 pr-4">Value</th>
                            <th className="text-left py-2 pr-4">Unit</th>
                            <th className="text-left py-2 pr-4">Reference Range</th>
                            <th className="text-left py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {values.map((v: any) => (
                            <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface-low">
                              <td className="py-2 pr-4 font-medium text-primary">{v.parameter_name}</td>
                              <td className="py-2 pr-4 font-medium text-primary">{v.value ?? v.value_text ?? '—'}</td>
                              <td className="py-2 pr-4 text-muted">{v.unit || '—'}</td>
                              <td className="py-2 pr-4 text-muted">{v.ref_range_text || '—'}</td>
                              <td className="py-2">
                                <span className={statusClass(v.status || 'Normal')}>
                                  {v.status || 'Normal'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Upload another */}
        <div className="mt-10 flex justify-center">
          <Link
            href={`/upload?test=${encodeURIComponent(testName)}`}
            className="btn-primary"
          >
            + Upload New {testName} Report
          </Link>
        </div>
      </main>
    </div>
  )
}
