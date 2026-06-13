import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find the user's membership row (accepted or pending)
  const { data: membership } = await supabase
    .from('family_members')
    .select('*, families(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const accepted = membership?.find(m => m.status === 'accepted')
  const pending = membership?.find(m => m.status === 'pending')

  if (!accepted) {
    return NextResponse.json({ family: null, pendingRequest: pending ? { code: (pending as any).families?.code } : null })
  }

  const family = (accepted as any).families
  const admin = createAdminSupabaseClient()

  // All membership rows for this family (accepted + pending), with profile info
  const { data: memberRows } = await admin
    .from('family_members')
    .select('*')
    .eq('family_id', family.id)

  const userIds = (memberRows || []).map((m: any) => m.user_id)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, gender, date_of_birth, blood_group, city')
    .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  const members = (memberRows || [])
    .filter((m: any) => m.status === 'accepted')
    .map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) }))

  const pendingRequests = family.head_id === user.id
    ? (memberRows || [])
        .filter((m: any) => m.status === 'pending')
        .map((m: any) => ({ ...m, profile: profileMap.get(m.user_id) }))
    : []

  return NextResponse.json({
    family,
    isHead: family.head_id === user.id,
    members,
    pendingRequests,
  })
}
