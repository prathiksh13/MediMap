import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ProfileEditForm from './ProfileEditForm'

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: conditions } = await supabase.from('user_conditions').select('*').eq('user_id', user.id)
  const { data: reports } = await supabase.from('reports').select('id').eq('user_id', user.id)

  const bmi = profile?.height_cm && profile?.weight_kg
    ? (profile.weight_kg / ((profile.height_cm / 100) ** 2)).toFixed(1)
    : null

  const bmiLabel = bmi
    ? parseFloat(bmi) < 18.5 ? 'Underweight' : parseFloat(bmi) < 25 ? 'Normal' : parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'
    : null

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar userName={profile?.full_name || undefined} />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-playfair text-3xl font-bold text-primary mb-2">My Profile</h1>
        <p className="text-muted text-sm mb-8">Manage your personal and health information.</p>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: avatar + stats */}
          <div className="space-y-4">
            <div className="card text-center">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-playfair text-2xl mx-auto mb-4">
                {profile?.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <h2 className="font-playfair text-xl font-bold text-primary">{profile?.full_name || 'Your Name'}</h2>
              <p className="text-xs text-muted mt-1">Member since {new Date(profile?.created_at || '').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>

              <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">Reports</span><span className="font-medium text-primary">{reports?.length || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted">Conditions</span><span className="font-medium text-primary">{conditions?.length || 0}</span></div>
              </div>

              {conditions && conditions.length > 0 && (
                <div className="border-t border-border mt-4 pt-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {conditions.map(c => (
                      <span key={c.id} className="bg-primary text-white text-xs px-3 py-1 rounded-full">{c.condition_name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card bg-status-red/5 border-status-red/30">
              <p className="text-sm font-medium text-status-red mb-2">Danger Zone</p>
              <p className="text-xs text-muted mb-3">This will permanently delete all your reports and data.</p>
              <button className="text-sm border border-status-red text-status-red px-3 py-1.5 rounded-md hover:bg-status-red hover:text-white transition-colors w-full">
                Delete Account
              </button>
            </div>
          </div>

          {/* Right: edit forms */}
          <div className="col-span-2 space-y-6">
            <ProfileEditForm profile={profile} bmi={bmi} bmiLabel={bmiLabel} />
          </div>
        </div>
      </main>
    </div>
  )
}
