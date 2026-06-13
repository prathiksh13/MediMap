import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId, action } = await request.json()
  if (!memberId || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Load the membership row and verify the current user is the head of that family
  const { data: memberRow } = await supabase
    .from('family_members')
    .select('*, families(head_id)')
    .eq('id', memberId)
    .single()

  if (!memberRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if ((memberRow as any).families?.head_id !== user.id) {
    return NextResponse.json({ error: 'Only the family head can respond to requests' }, { status: 403 })
  }

  if (action === 'accept') {
    const { error } = await supabase
      .from('family_members')
      .update({ status: 'accepted' })
      .eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
