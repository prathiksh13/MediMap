import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId } = await request.json().catch(() => ({ memberId: null }))

  if (memberId) {
    // Head removing another member
    const { data: memberRow } = await supabase
      .from('family_members')
      .select('*, families(head_id)')
      .eq('id', memberId)
      .single()

    if (!memberRow) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if ((memberRow as any).families?.head_id !== user.id) {
      return NextResponse.json({ error: 'Only the family head can remove members' }, { status: 403 })
    }
    if ((memberRow as any).role === 'head') {
      return NextResponse.json({ error: 'The head cannot remove themselves this way. Delete the family instead.' }, { status: 400 })
    }

    const { error } = await supabase.from('family_members').delete().eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  // Self leaving / cancelling own request
  const { data: own } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!own) return NextResponse.json({ error: 'You are not part of a family' }, { status: 404 })

  if (own.role === 'head') {
    // Head leaving deletes the whole family
    const { error } = await supabase.from('families').delete().eq('id', own.family_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { error } = await supabase.from('family_members').delete().eq('id', own.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
