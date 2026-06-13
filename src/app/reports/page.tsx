import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'

const CONDITION_TESTS: Record<string, { name: string; shortName: string }[]> = {
  'Diabetes Type 1': [
    { name: 'HbA1c', shortName: 'HbA1c' },
    { name: 'Fasting Plasma Glucose', shortName: 'FPG' },
    { name: 'Random Blood Glucose', shortName: 'RBG' },
    { name: 'Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides)', shortName: 'Lipid Profile' },
    { name: 'Kidney Function – Serum Creatinine with eGFR', shortName: 'Kidney Function' },
    { name: 'Complete Blood Count (CBC)', shortName: 'CBC' },
  ],
  'Diabetes Type 2': [
    { name: 'HbA1c', shortName: 'HbA1c' },
    { name: 'Fasting Blood Glucose', shortName: 'FBG' },
    { name: 'Post-Prandial Blood Glucose', shortName: 'PPBG' },
    { name: 'Oral Glucose Tolerance Test (OGTT)', shortName: 'OGTT' },
    { name: 'Lipid Profile', shortName: 'Lipid Profile' },
    { name: 'Serum Creatinine with eGFR', shortName: 'Creatinine / eGFR' },
    { name: 'Complete Blood Count (CBC)', shortName: 'CBC' },
  ],
  'Hypertension': [
    { name: 'Fasting Blood Glucose', shortName: 'FBG' },
    { name: 'Complete Blood Count (CBC)', shortName: 'CBC' },
    { name: 'Serum Creatinine with eGFR', shortName: 'Creatinine / eGFR' },
    { name: 'Serum Electrolytes (Sodium, Potassium)', shortName: 'Electrolytes' },
    { name: 'Lipid Profile', shortName: 'Lipid Profile' },
    { name: 'Thyroid-Stimulating Hormone (TSH)', shortName: 'TSH' },
  ],
  'Hypothyroidism': [
    { name: 'Thyroid-Stimulating Hormone (TSH)', shortName: 'TSH' },
    { name: 'Free T4', shortName: 'Free T4' },
    { name: 'Free T3', shortName: 'Free T3' },
    { name: 'Thyroid Peroxidase Antibodies (TPOAb)', shortName: 'TPOAb' },
  ],
  'Hyperthyroidism': [
    { name: 'Thyroid-Stimulating Hormone (TSH)', shortName: 'TSH' },
    { name: 'Free T4', shortName: 'Free T4' },
    { name: 'Free T3', shortName: 'Free T3' },
    { name: 'TSH-Receptor Antibodies (TRAb / TSI)', shortName: 'TRAb / TSI' },
    { name: 'Thyroid Peroxidase Antibodies (TPOAb)', shortName: 'TPOAb' },
  ],
  'Cardiac Disease': [
    { name: 'Cardiac Troponin (cTnI or cTnT)', shortName: 'Troponin' },
    { name: 'B-Type Natriuretic Peptide (BNP / NT-proBNP)', shortName: 'BNP' },
    { name: 'Lipid Profile', shortName: 'Lipid Profile' },
    { name: 'Fasting Glucose / HbA1c', shortName: 'Glucose / HbA1c' },
    { name: 'Kidney Function – Serum Creatinine', shortName: 'Creatinine' },
    { name: 'High-Sensitivity CRP (hs-CRP)', shortName: 'hs-CRP' },
  ],
  'Asthma': [
    { name: 'CBC with Differential (Eosinophil Count)', shortName: 'CBC + Eosinophils' },
    { name: 'Total IgE', shortName: 'Total IgE' },
    { name: 'Allergen-Specific IgE', shortName: 'Allergen IgE' },
  ],
  'Anaemia': [
    { name: 'Complete Blood Count (CBC)', shortName: 'CBC' },
    { name: 'Serum Ferritin', shortName: 'Ferritin' },
    { name: 'Serum Iron with Transferrin Saturation / TIBC', shortName: 'Iron / TIBC' },
    { name: 'Vitamin B12', shortName: 'B12' },
    { name: 'Folate', shortName: 'Folate' },
  ],
  'High Cholesterol': [
    { name: 'Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides)', shortName: 'Lipid Profile' },
    { name: 'Liver Enzymes (ALT, AST, ALP, GGT)', shortName: 'Liver Enzymes' },
    { name: 'Fasting Glucose / HbA1c', shortName: 'Glucose / HbA1c' },
  ],
  'PCOD/PCOS': [
    { name: 'Total / Free Testosterone', shortName: 'Testosterone' },
    { name: 'Luteinizing Hormone (LH)', shortName: 'LH' },
    { name: 'Follicle-Stimulating Hormone (FSH)', shortName: 'FSH' },
    { name: 'Prolactin', shortName: 'Prolactin' },
    { name: 'DHEAS', shortName: 'DHEAS' },
    { name: 'Estradiol', shortName: 'Estradiol' },
    { name: 'Fasting Glucose / 2-Hour OGTT', shortName: 'Glucose / OGTT' },
    { name: 'Fasting Insulin', shortName: 'Fasting Insulin' },
    { name: 'Lipid Profile', shortName: 'Lipid Profile' },
    { name: 'TSH (with Thyroid Antibodies)', shortName: 'TSH' },
  ],
  'Kidney Disease': [
    { name: 'Serum Creatinine (eGFR)', shortName: 'Creatinine / eGFR' },
    { name: 'Blood Urea Nitrogen (BUN)', shortName: 'BUN' },
    { name: 'Electrolytes (Sodium, Potassium, Bicarbonate)', shortName: 'Electrolytes' },
    { name: 'Complete Blood Count (CBC)', shortName: 'CBC' },
    { name: 'Calcium, Phosphorus, Albumin', shortName: 'Ca / Phos / Albumin' },
  ],
}

export default async function ReportsPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const { data: conditions } = await supabase.from('user_conditions').select('condition_name').eq('user_id', user.id)
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const userConditions = conditions?.map(c => c.condition_name) || []
  const hasConditions = userConditions.length > 0 && !userConditions.includes('None of the above')

  // All test shortNames that are explicitly listed under the user's conditions
  const knownTestNames = new Set(
    userConditions.flatMap(c => (CONDITION_TESTS[c] || []).map(t => t.shortName.toLowerCase()))
  )

  // All condition test long names too (for matching report_type)
  const knownTestLongNames = new Set(
    userConditions.flatMap(c => (CONDITION_TESTS[c] || []).map(t => t.name.toLowerCase()))
  )

  // Reports that don't belong to any known condition test bucket
  const otherReports = (reports || []).filter(r => {
    const rt = (r.report_type || '').toLowerCase()
    return (
      rt === 'other' ||
      rt === '' ||
      (!knownTestNames.has(rt) && !knownTestLongNames.has(rt))
    )
  })

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar userName={profile?.full_name || undefined} />
      <main className="ml-60 flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-primary">My Reports</h1>
            <p className="text-muted text-sm mt-1">Upload your reports and track your health over time.</p>
          </div>
          <Link href="/upload" className="btn-primary">+ Upload New Report</Link>
        </div>

        {/* Condition-based test list */}
        {hasConditions ? (
          <div className="space-y-8 mb-10">
            {userConditions.map(condition => {
              const tests = CONDITION_TESTS[condition]
              if (!tests) return null
              return (
                <div key={condition} className="card">
                  <h2 className="font-playfair text-lg font-bold text-primary mb-1">{condition} Tests</h2>
                  <p className="text-xs text-muted mb-5">Recommended tests for your condition — upload each report as you get it done.</p>
                  <div className="divide-y divide-border">
                    {tests.map(test => (
                      <div key={test.name} className="flex items-center justify-between py-3">
                        <span className="text-sm text-primary font-medium">{test.name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <Link
                            href={`/reports/history/${encodeURIComponent(test.shortName)}`}
                            className="text-sm border border-border text-muted px-4 py-1.5 rounded-md hover:border-accent hover:text-accent transition-colors"
                          >
                            View Previous
                          </Link>
                          <Link
                            href={`/upload?test=${encodeURIComponent(test.shortName)}`}
                            className="text-sm border border-accent text-accent px-4 py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors"
                          >
                            Upload
                          </Link>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4">
                      <Link
                        href="/upload"
                        className="text-sm text-accent hover:underline font-medium"
                      >
                        + Add new test report
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card mb-8 text-center py-8">
            <p className="text-muted text-sm mb-3">No conditions selected. Update your profile to see recommended tests.</p>
            <Link href="/profile" className="text-accent text-sm hover:underline font-medium">Go to Profile →</Link>
          </div>
        )}

        {/* Other / uncategorised reports */}
        {otherReports.length > 0 && (
          <div className="card mb-10">
            <h2 className="font-playfair text-lg font-bold text-primary mb-1">Other Reports</h2>
            <p className="text-xs text-muted mb-5">Reports not linked to a specific condition — view or analyse each one below.</p>
            <div className="space-y-3">
              {otherReports.map(report => (
                <div key={report.id} className="flex items-center gap-4 border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent text-xs font-bold">{report.report_type?.substring(0, 3).toUpperCase() || 'RPT'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary text-sm">{report.report_name}</p>
                    <p className="text-xs text-muted truncate">
                      {report.lab_name || 'Unknown lab'} · {report.test_date ? new Date(report.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={report.abnormal_count > 0 ? 'status-high' : 'status-normal'}>
                      {report.abnormal_count > 0 ? `${report.abnormal_count} Abnormal` : 'All Normal'}
                    </span>
                    <Link href={`/reports/${report.id}`} className="text-sm text-accent hover:underline font-medium">
                      View Analysis →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previously uploaded reports */}
        <div>
          <h2 className="font-playfair text-xl font-bold text-primary mb-4">Uploaded Reports</h2>
          {!reports || reports.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-muted text-sm mb-4">No reports uploaded yet.</p>
              <Link href="/upload" className="btn-primary">Upload Your First Report</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="card flex items-center gap-4 hover:border-accent/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <span className="text-accent text-xs font-bold">{report.report_type?.substring(0, 3).toUpperCase() || 'RPT'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary">{report.report_name}</p>
                    <p className="text-xs text-muted truncate">
                      {report.lab_name || 'Unknown lab'} · {report.test_date ? new Date(report.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unknown'}
                    </p>
                    {report.report_type && (
                      <span className="text-xs border border-border text-muted px-2 py-0.5 rounded-full mt-1 inline-block">{report.report_type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={report.abnormal_count > 0 ? 'status-high' : 'status-normal'}>
                      {report.abnormal_count > 0 ? `${report.abnormal_count} Abnormal` : 'All Normal'}
                    </span>
                    <Link href={`/reports/${report.id}`} className="text-sm text-accent hover:underline font-medium">
                      View Analysis →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
