import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import ReportCharts from './ReportCharts'

const CONDITION_DOCTORS: Record<string, { name: string; specialty: string; hospital: string }[]> = {
  'Diabetes Type 1': [
    { name: 'Dr. Somnath Gupta', specialty: 'Diabetologist / General Physician', hospital: 'Pace Hospital, Begumpet & Hitech City' },
    { name: 'Dr. Meka Satyanarayana', specialty: 'Diabetologist / General Physician', hospital: 'Aswini Clinics, Pragathi Enclave, Kukatpally' },
    { name: 'Dr. Shyam Kalavalapalli', specialty: 'Endocrinologist & Diabetologist', hospital: 'Idea Clinic, Triveni Towers, KPHB Colony' },
    { name: 'Dr. Shalini Patlolla', specialty: 'Endocrinologist & Diabetologist', hospital: "Dr Shalini's Super Speciality Centre, KPHB Phase I, Kukatpally" },
    { name: 'Dr. Dilip Kumar Kandar', specialty: 'Diabetologist', hospital: 'Kandar Diabetes Centre, Tarnaka, Secunderabad' },
  ],
  'Diabetes Type 2': [
    { name: 'Dr. Somnath Gupta', specialty: 'Diabetologist / General Physician', hospital: 'Pace Hospital, Begumpet & Hitech City' },
    { name: 'Dr. Meka Satyanarayana', specialty: 'Diabetologist / General Physician', hospital: 'Aswini Clinics, Pragathi Enclave, Kukatpally' },
    { name: 'Dr. Shyam Kalavalapalli', specialty: 'Endocrinologist & Diabetologist', hospital: 'Idea Clinic, Triveni Towers, KPHB Colony' },
    { name: 'Dr. Shalini Patlolla', specialty: 'Endocrinologist & Diabetologist', hospital: "Dr Shalini's Super Speciality Centre, KPHB Phase I, Kukatpally" },
    { name: 'Dr. Dilip Kumar Kandar', specialty: 'Diabetologist', hospital: 'Kandar Diabetes Centre, Tarnaka, Secunderabad' },
  ],
  'Hypothyroidism': [
    { name: 'Dr. Kalyan Chakravarthy Gurazada', specialty: 'Endocrinologist (Thyroid Specialist)', hospital: 'Triveni Towers, Rd No. 1, KPHB Phase 1' },
    { name: 'Dr. Prudwiraj Sanamandra', specialty: 'Endocrinologist', hospital: 'Clinic near Biodiversity Park, Gachibowli' },
    { name: 'Dr. Shyam Kalavalapalli', specialty: 'Endocrinologist', hospital: 'Idea Clinic, Triveni Towers, KPHB Colony' },
    { name: 'Dr. Aradhana Addepalli', specialty: 'Endocrinologist', hospital: 'Virinchi Hospitals, Road No. 1, Banjara Hills' },
    { name: 'Dr. Aashish Reddy Bande', specialty: 'Endocrinologist', hospital: 'Clinic on Alexander Road, Patny Circle, Secunderabad' },
  ],
  'Hyperthyroidism': [
    { name: 'Dr. Kalyan Chakravarthy Gurazada', specialty: 'Endocrinologist (Thyroid Specialist)', hospital: 'Triveni Towers, Rd No. 1, KPHB Phase 1' },
    { name: 'Dr. Prudwiraj Sanamandra', specialty: 'Endocrinologist', hospital: 'Clinic near Biodiversity Park, Gachibowli' },
    { name: 'Dr. Shyam Kalavalapalli', specialty: 'Endocrinologist', hospital: 'Idea Clinic, Triveni Towers, KPHB Colony' },
    { name: 'Dr. Aradhana Addepalli', specialty: 'Endocrinologist', hospital: 'Virinchi Hospitals, Road No. 1, Banjara Hills' },
    { name: 'Dr. Aashish Reddy Bande', specialty: 'Endocrinologist', hospital: 'Clinic on Alexander Road, Patny Circle, Secunderabad' },
  ],
  'Hypertension': [
    { name: 'Dr. Ravi Srinivas', specialty: 'Cardiologist', hospital: 'Clinic at Raj Bhavan Road, Somajiguda' },
    { name: 'Dr. Ramakrishna Janapati', specialty: 'Cardiologist', hospital: 'Clinic on Road No. 4, KPHB Colony' },
    { name: 'Dr. T. Pramod Kumar Rao', specialty: 'Cardiologist', hospital: 'Clinic at Balaji Nagar, Kukatpally' },
    { name: 'Dr. Pramod Kumar Dhar', specialty: 'Cardiologist', hospital: 'Virinchi Hospitals, Road No. 1, Banjara Hills' },
    { name: 'Dr. Guru Prakash', specialty: 'Cardiologist', hospital: 'Clinic on Rajbhavan Road, Somajiguda' },
  ],
  'Cardiac Disease': [
    { name: 'Dr. Ravi Srinivas', specialty: 'Cardiologist', hospital: 'Raj Bhavan Road, Somajiguda' },
    { name: 'Dr. Ramakrishna Janapati', specialty: 'Cardiologist', hospital: 'Road No. 4, KPHB Colony' },
    { name: 'Dr. Pramod Kumar Dhar', specialty: 'Cardiologist', hospital: 'Virinchi Hospitals, Road No. 1, Banjara Hills' },
    { name: 'Dr. Sudheer Kumar Dasari', specialty: 'Cardiologist', hospital: 'Virinchi Hospitals, Road No. 1, Banjara Hills' },
    { name: 'Dr. G. Ramesh', specialty: 'Cardiologist', hospital: 'Alexander Road, Patny Circle, Secunderabad' },
  ],
  'Asthma': [
    { name: 'Dr. Gopi Arrolla', specialty: 'Pulmonologist', hospital: 'Manikya Nagar, KMG Garden Road, Chintal' },
    { name: 'Dr. Viswesvaran Balasubramanian', specialty: 'Pulmonologist', hospital: 'Rajbhavan Road, Matha Nagar, Somajiguda' },
    { name: 'Dr. V. Nagarjuna Maturu', specialty: 'Pulmonologist', hospital: 'JNTU to Hitec City Road, Hitec City' },
    { name: 'Dr. Hari Kishan Gonuguntla', specialty: 'Pulmonologist', hospital: 'Alexander Road, Patny Circle, Secunderabad' },
    { name: 'Dr. Kanishka Kavuri', specialty: 'Pulmonologist', hospital: 'Plot No. 3, Road No. 2, IT & Financial District, Gachibowli' },
  ],
  'Anaemia': [
    { name: 'Dr. K. Karuna Kumar', specialty: 'Haematologist', hospital: 'Clinic on Alexander Road, Patny Circle, Secunderabad' },
    { name: 'Dr. Gudala Stitha Pragna', specialty: 'Haematologist', hospital: 'JNTU to Hitec City Road, Hitec City' },
    { name: 'Dr. Ganesh Jaishetwar', specialty: 'Haematologist', hospital: 'JNTU to Hitec City Road, Hitec City' },
    { name: 'Dr. Padmaja Lokireddy', specialty: 'Haematologist', hospital: 'Lanco Hills Road, Manikonda & Jubilee Hills' },
    { name: 'Dr. S. Yoga Lakshmi', specialty: 'Haematologist', hospital: 'Financial District, Nanakramguda' },
  ],
  'High Cholesterol': [
    { name: 'Dr. Ravi Srinivas', specialty: 'Cardiologist', hospital: 'Raj Bhavan Road, Somajiguda' },
    { name: 'Dr. Ramakrishna Janapati', specialty: 'Cardiologist', hospital: 'Road No. 4, KPHB Colony' },
    { name: 'Dr. T. Pramod Kumar Rao', specialty: 'Cardiologist', hospital: 'Balaji Nagar, Kukatpally' },
    { name: 'Dr. Naveen Chandra Tej', specialty: 'Cardiologist', hospital: 'Near Pillar No. 147, Attapur' },
    { name: 'Dr. Guru Prakash', specialty: 'Cardiologist', hospital: 'Rajbhavan Road, Matha Nagar, Somajiguda' },
  ],
  'PCOD/PCOS': [
    { name: 'Dr. Vandana Hegde', specialty: 'Gynecologist & Infertility Specialist', hospital: 'Hegde Hospital, Vittalrao Nagar, Madhapur' },
    { name: 'Dr. Nirmala Agarwal', specialty: 'Gynecologist', hospital: 'Clinic at Masab Tank, near Khaja Mansion' },
    { name: 'Dr. Madhulatha Rani', specialty: 'Gynecologist & Infertility Specialist', hospital: 'Navjeevan Hospital, RB Nagar, Shamshabad' },
    { name: 'Dr. Babitha Maturi', specialty: 'Gynecologist & IVF Specialist', hospital: 'West World, above Karachi Bakery, Shaikpet' },
    { name: 'Dr. Srilatha Gorthi', specialty: 'Gynecologist & Infertility Specialist', hospital: 'Revive Clinics, Nallagandla HUDA Trade Center' },
  ],
  'Kidney Disease': [
    { name: 'Dr. Pradeep Deshpande', specialty: 'Nephrologist', hospital: 'Sathya Kidney Centre, Domalguda, Himayat Nagar' },
    { name: 'Dr. Girish Narayan', specialty: 'Nephrologist', hospital: 'Udai Omni Hospital, Nampally' },
    { name: 'Dr. Manisha Sahay', specialty: 'Nephrologist', hospital: 'Sahay Clinics, near LAL Bungalow' },
    { name: 'Dr. Srinivas', specialty: 'Nephrologist', hospital: 'Omni Hospitals, Kothapet X Road, Dilsukh Nagar' },
    { name: 'Dr. K. G. Raja Ram', specialty: 'Nephrologist', hospital: 'Hyderabad Kidney & Laparoscopic Center, Judges Colony' },
  ],
}

const DEFAULT_DOCTORS = [
  { name: 'Dr. Ravi Srinivas', specialty: 'Cardiologist', hospital: 'Raj Bhavan Road, Somajiguda' },
  { name: 'Dr. Shyam Kalavalapalli', specialty: 'Endocrinologist', hospital: 'Idea Clinic, KPHB Colony' },
  { name: 'Dr. Padmaja Lokireddy', specialty: 'Haematologist', hospital: 'Lanco Hills Road, Manikonda' },
  { name: 'Dr. Pradeep Deshpande', specialty: 'Nephrologist', hospital: 'Sathya Kidney Centre, Himayat Nagar' },
]

function getNextTestDate(reportType: string, testDate: string | null): { date: string; label: string } | null {
  if (!testDate) return null
  const base = new Date(testDate)
  const type = (reportType || '').toLowerCase()
  let days = 180
  let label = 'every 6 months'
  if (type.includes('hba1c') || type.includes('diabetes')) { days = 90; label = 'every 3 months' }
  else if (type.includes('tsh') || type.includes('thyroid')) { days = 90; label = 'every 3 months' }
  else if (type.includes('lipid') || type.includes('cholesterol')) { days = 180; label = 'every 6 months' }
  else if (type.includes('kidney') || type.includes('creatinine')) { days = 180; label = 'every 6 months' }
  else if (type.includes('cbc') || type.includes('blood count')) { days = 365; label = 'every year' }
  base.setDate(base.getDate() + days)
  return {
    date: base.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    label,
  }
}

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!report) notFound()

  const ownerId = report.user_id

  const { data: values } = await supabase
    .from('report_values')
    .select('*')
    .eq('report_id', params.id)
    .order('created_at')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, date_of_birth, weight_kg, height_cm')
    .eq('id', ownerId)
    .single()

  const { data: conditions } = await supabase
    .from('user_conditions')
    .select('condition_name')
    .eq('user_id', ownerId)

  // All previous reports for history
  const { data: allReports } = await supabase
    .from('reports')
    .select('id, report_name, created_at, test_date, abnormal_count, overall_status')
    .eq('user_id', ownerId)
    .neq('id', params.id)
    .order('created_at', { ascending: false })

  // Historical values for trend charts — same parameters across all reports
  const { data: allValues } = await supabase
    .from('report_values')
    .select('parameter_name, value, unit, test_date, report_id')
    .eq('user_id', ownerId)
    .neq('report_id', params.id)
    .order('test_date', { ascending: true })

  // Build parameter history map
  const parameterHistory: Record<string, { date: string; value: number; report_name: string }[]> = {}
  for (const v of (allValues || [])) {
    if (v.value !== null) {
      if (!parameterHistory[v.parameter_name]) parameterHistory[v.parameter_name] = []
      const matchingReport = allReports?.find(r => r.id === v.report_id)
      parameterHistory[v.parameter_name].push({
        date: v.test_date || '',
        value: v.value,
        report_name: matchingReport?.report_name || 'Past Report',
      })
    }
  }

  const abnormalValues = values?.filter(v => v.status !== 'Normal') || []
  const userConditions = conditions?.map(c => c.condition_name) || []

  // Doctors relevant to user's conditions
  let doctors = DEFAULT_DOCTORS
  if (userConditions.length > 0) {
    const conditionDocs = userConditions.flatMap(c => CONDITION_DOCTORS[c] || [])
    const unique = conditionDocs.filter((d, i, arr) => arr.findIndex(x => x.name === d.name) === i)
    if (unique.length > 0) doctors = unique.slice(0, 4)
  }

  const nextTest = getNextTestDate(report.report_type, report.test_date)

  // Extract doctor name from AI summary or values
  const doctorName = report.ai_summary?.match(/Dr\.?\s[A-Z][a-z]+/)?.[0] || null

  // Compute age from profile
  let age: string | null = null
  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth)
    const now = new Date()
    age = String(now.getFullYear() - dob.getFullYear())
  }

  const statusClass = (s: string) =>
    s === 'Normal' ? 'status-normal' : s === 'High' || s === 'Critical High' ? 'status-high' : 'status-low'

  const borderClass = (s: string) =>
    s === 'High' || s === 'Critical High' ? 'border-l-4 border-l-status-red' :
    s === 'Low' || s === 'Critical Low' ? 'border-l-4 border-l-status-amber' :
    s === 'Watch' ? 'border-l-4 border-l-status-amber' : ''

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userName={profile?.full_name || undefined} />
      <main className="ml-60 flex-1 p-8">
        <Link href="/reports" className="text-sm text-accent hover:underline mb-6 inline-block">← My Reports</Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-primary">{report.report_name}</h1>
            <p className="text-muted text-sm mt-1">
              {report.lab_name || 'Unknown lab'} · {report.test_date ? new Date(report.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unknown'}
            </p>
          </div>
        </div>

        {/* Patient info strip */}
        {(doctorName || age || profile?.weight_kg || profile?.height_cm) && (
          <div className="card mb-6 flex gap-8">
            {doctorName && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-bold mb-0.5">Doctor</p>
                <p className="text-sm font-medium text-primary">{doctorName}</p>
              </div>
            )}
            {profile?.full_name && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-bold mb-0.5">Patient</p>
                <p className="text-sm font-medium text-primary">{profile.full_name}</p>
              </div>
            )}
            {age && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-bold mb-0.5">Age</p>
                <p className="text-sm font-medium text-primary">{age} yrs</p>
              </div>
            )}
            {profile?.weight_kg && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-bold mb-0.5">Weight</p>
                <p className="text-sm font-medium text-primary">{profile.weight_kg} kg</p>
              </div>
            )}
            {profile?.height_cm && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-bold mb-0.5">Height</p>
                <p className="text-sm font-medium text-primary">{profile.height_cm} cm</p>
              </div>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1">Total Parameters</p>
            <p className="font-playfair text-3xl font-bold text-primary">{values?.length || 0}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1">Abnormal Values</p>
            <p className={`font-playfair text-3xl font-bold ${report.abnormal_count > 0 ? 'text-status-red' : 'text-primary'}`}>{report.abnormal_count}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1">Overall Status</p>
            <p className="font-playfair text-2xl font-bold">
              <span className={report.overall_status === 'Normal' ? 'text-status-green' : report.overall_status === 'Abnormal' ? 'text-status-red' : 'text-status-amber'}>
                {report.overall_status || 'Pending'}
              </span>
            </p>
          </div>
        </div>

        {/* AI Analysis + Values needing attention */}
        <div className="grid grid-cols-5 gap-6 mb-8">
          <div className="col-span-3 card border-t-4 border-t-accent">
            <p className="text-xs font-bold uppercase tracking-widest text-accent mb-2">MediMap Analysis</p>
            <h2 className="font-playfair text-xl font-bold text-primary mb-4">What your report is telling you</h2>
            {report.ai_summary ? (
              <p className="text-sm text-primary leading-relaxed">{report.ai_summary}</p>
            ) : (
              <p className="text-sm text-muted">Analysis not available for this report.</p>
            )}
            <div className="mt-4 p-3 bg-accent/5 border border-accent/20 rounded-md">
              <p className="text-xs text-accent">⚠ AI-generated summary for informational purposes only. Consult your doctor before making any medical decisions.</p>
            </div>
          </div>

          <div className="col-span-2 card">
            <h2 className="font-playfair font-semibold text-primary mb-4">Values Needing Attention</h2>
            {abnormalValues.length === 0 ? (
              <p className="text-sm text-status-green">All values are within normal range. ✓</p>
            ) : (
              <div className="space-y-3">
                {abnormalValues.map(v => (
                  <div key={v.id} className={`p-3 rounded-md bg-surface-low ${borderClass(v.status || '')}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary">{v.parameter_name}</p>
                      <span className={statusClass(v.status || '')}>{v.status}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">{v.value} {v.unit} · Ref: {v.ref_range_text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Parameter Graphs */}
        <ReportCharts values={values || []} parameterHistory={parameterHistory} />

        {/* All Parameters Table */}
        <div className="card mb-8">
          <h2 className="font-playfair font-semibold text-primary mb-4">All Parameters</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="text-left py-2 pr-4">Parameter</th>
                  <th className="text-left py-2 pr-4">Method</th>
                  <th className="text-left py-2 pr-4">Value</th>
                  <th className="text-left py-2 pr-4">Unit</th>
                  <th className="text-left py-2 pr-4">Reference Range</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(values || []).map(v => (
                  <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface-low">
                    <td className="py-2 pr-4 font-medium text-primary">{v.parameter_name}</td>
                    <td className="py-2 pr-4 text-muted text-xs">{v.method || '—'}</td>
                    <td className="py-2 pr-4 font-medium">{v.value ?? v.value_text ?? '—'}</td>
                    <td className="py-2 pr-4 text-muted">{v.unit || '—'}</td>
                    <td className="py-2 pr-4 text-muted">{v.ref_range_text || '—'}</td>
                    <td className="py-2"><span className={statusClass(v.status || 'Normal')}>{v.status || 'Normal'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Next test date + recommended tests */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h2 className="font-playfair font-semibold text-primary mb-3">Recommended Future Test Date</h2>
            {nextTest ? (
              <>
                <p className="font-playfair text-2xl font-bold text-accent mb-1">{nextTest.date}</p>
                <p className="text-xs text-muted">Based on {report.report_type} testing cadence ({nextTest.label})</p>
                {report.next_test_name && (
                  <p className="text-sm text-primary mt-3">Recommended test: <span className="font-medium">{report.next_test_name}</span></p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">No test date found — add a test date when uploading to get a recommendation.</p>
            )}
          </div>
          <div className="card">
            <h2 className="font-playfair font-semibold text-primary mb-3">Recommended Tests</h2>
            <div className="space-y-2">
              {report.next_test_name && (
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <p className="text-sm text-primary">Repeat <span className="font-medium">{report.next_test_name}</span> on the recommended date to monitor trends.</p>
                </div>
              )}
              {abnormalValues.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-status-red text-white text-xs flex items-center justify-center shrink-0 mt-0.5">!</span>
                  <p className="text-sm text-primary">Follow up on abnormal values: <span className="font-medium">{abnormalValues.map(v => v.parameter_name).join(', ')}</span></p>
                </div>
              )}
              {!report.next_test_name && abnormalValues.length === 0 && (
                <p className="text-sm text-muted">No specific recommendations — all values are normal.</p>
              )}
            </div>
          </div>
        </div>

        {/* Previous Reports History */}
        {allReports && allReports.length > 0 && (
          <div className="card mb-8">
            <h2 className="font-playfair font-semibold text-primary mb-4">Previous Reports</h2>
            <div className="space-y-2">
              {allReports.map(r => (
                <Link
                  key={r.id}
                  href={`/reports/${r.id}`}
                  className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-surface-low transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-primary group-hover:text-accent transition-colors">{r.report_name}</p>
                    <p className="text-xs text-muted">
                      {r.test_date
                        ? new Date(r.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                        : new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={r.abnormal_count > 0 ? 'status-high' : 'status-normal'}>
                      {r.abnormal_count > 0 ? `${r.abnormal_count} Abnormal` : 'All Normal'}
                    </span>
                    <span className="text-accent text-sm">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Doctors in Hyderabad */}
        <div className="card">
          <h2 className="font-playfair font-semibold text-primary mb-1">Doctors in Hyderabad</h2>
          <p className="text-xs text-muted mb-1">Specialists relevant to your health conditions.</p>
          <p className="text-xs text-muted/70 mb-5 italic">Always verify availability, timings and address before booking.</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {doctors.map(doc => (
              <div key={doc.name} className="border border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-playfair font-bold text-sm mb-3">
                  {doc.name.split(' ').filter((_: string, i: number) => i > 0).map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <p className="font-playfair font-semibold text-primary text-sm">{doc.name}</p>
                <p className="text-xs text-accent font-medium mt-0.5">{doc.specialty}</p>
                <p className="text-xs text-muted mt-1.5 leading-snug">📍 {doc.hospital}, Hyderabad</p>
                <button className="w-full mt-3 border border-accent text-accent text-xs py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors">
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
