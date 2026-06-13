import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { medicines } = await request.json()

  if (!Array.isArray(medicines) || medicines.length === 0) {
    return NextResponse.json({ error: 'No medicines to save' }, { status: 400 })
  }

  const adminSupabase = createAdminSupabaseClient()

  const toInsert = medicines.map((medicine: {
    medicine_name: string
    strength?: string
    frequency?: string
    notes?: string
  }) => ({
    user_id: user.id,
    medicine_name: medicine.medicine_name?.trim(),
    strength: medicine.strength?.trim() || null,
    frequency: medicine.frequency?.trim() || null,
    notes: medicine.notes?.trim() || null,
  })).filter((medicine: { medicine_name: string }) => medicine.medicine_name)

  if (toInsert.length === 0) {
    return NextResponse.json({ error: 'No valid medicines to save' }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('prescription_medicines')
    .insert(toInsert)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, medicines: data })
}
