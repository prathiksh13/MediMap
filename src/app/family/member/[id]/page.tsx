import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { ArrowLeft } from 'lucide-react'

export default async function FamilyMemberPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: viewerProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

  // RLS ensures this only returns data if the viewer and this member are
  // both accepted members of the same family (see family-schema.sql)
  const { data: memberProfile } = await supabase.from('profiles').select('*').eq('id', params.id).single()
  if (!memberProfile) notFound()

  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false })

  const { data: conditions } = await supabase.from('user_conditions').select('condition_name').eq('user_id', params.id)

  const bmi = memberProfile.height_cm && memberProfile.weight_kg
    ? (memberProfile.weight_kg / ((memberProfile.height_cm / 100) ** 2)).toFixed(1)
    : null

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar userName={viewerProfile?.full_name || undefined} />
      <main className="ml-60 flex-1 p-8">
        <Link href="/family" className="flex items-center gap-2 text-sm text-muted hover:text-accent mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to Family
        </Link>

        {/* Member overview */}
        <div className="card mb-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-playfair text-2xl shrink-0">
            {memberProfile.full_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h1 className="font-playfair text-2xl font-bold text-primary">{memberProfile.full_name || 'Family Member'}</h1>
            <p className="text-xs text-muted mt-1">
              {[
                memberProfile.gender,
                memberProfile.date_of_birth ? `${Math.floor((Date.now() - new Date(memberProfile.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} yrs` : null,
                memberProfile.blood_group ? `Blood Group ${memberProfile.blood_group}` : null,
                memberProfile.city,
                bmi ? `BMI ${bmi}` : null,
              ].filter(Boolean).join(' · ') || 'No profile details added yet'}
            </p>
            {conditions && conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {conditions.map((c, i) => (
                  <span key={i} className="text-xs border border-border text-muted px-2 py-0.5 rounded-full">{c.condition_name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reports */}
        <div>
          <h2 className="font-playfair text-xl font-bold text-primary mb-4">Reports</h2>
          {!reports || reports.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-muted text-sm">No reports uploaded yet.</p>
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
