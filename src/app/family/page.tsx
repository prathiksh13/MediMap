import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import FamilyClient from './FamilyClient'

export default async function FamilyPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile && !profile.onboarding_complete) redirect('/onboarding')

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar userName={profile?.full_name || undefined} />
      <main className="ml-60 flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold text-primary">Family</h1>
          <p className="text-muted text-sm mt-1">Create a family group or join one to keep everyone's health records in one place.</p>
        </div>

        <FamilyClient currentUserId={user.id} />
      </main>
    </div>
  )
}
