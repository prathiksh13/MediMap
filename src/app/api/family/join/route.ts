import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await request.json()
  if (!code || !code.trim()) {
    return NextResponse.json({ error: 'Family code is required' }, { status: 400 })
  }

  // Check user isn't already in a family or awaiting approval
  const { data: existing } = await supabase
    .from('family_members')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['accepted', 'pending'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You are already part of a family or have a pending request' }, { status: 400 })
  }

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('id, name, code, head_id')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle()

  if (familyError || !family) {
    return NextResponse.json({ error: 'No family found with that code' }, { status: 404 })
  }

  if (family.head_id === user.id) {
    return NextResponse.json({ error: 'You are the head of this family already' }, { status: 400 })
  }

  const { error: memberError } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: user.id, status: 'pending', role: 'member' })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, familyName: family.name })
}
