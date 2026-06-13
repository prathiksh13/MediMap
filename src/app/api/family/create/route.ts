import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // avoid ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Family name is required' }, { status: 400 })
  }

  // Check user isn't already in a family
  const { data: existing } = await supabase
    .from('family_members')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['accepted', 'pending'])
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You are already part of a family or have a pending request' }, { status: 400 })
  }

  // Generate a unique code
  let code = generateCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase.from('families').select('id').eq('code', code).maybeSingle()
    if (!clash) break
    code = generateCode()
  }

  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({ name: name.trim(), code, head_id: user.id })
    .select()
    .single()

  if (familyError) {
    return NextResponse.json({ error: familyError.message }, { status: 400 })
  }

  const { error: memberError } = await supabase
    .from('family_members')
    .insert({ family_id: family.id, user_id: user.id, status: 'accepted', role: 'head' })

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 })
  }

  return NextResponse.json({ family })
}
