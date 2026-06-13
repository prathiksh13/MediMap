import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { formatAnalysisSummary, generateReportAnalysis } from '@/services/llamaService'

// GET /api/reports — fetch all reports for logged-in user
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('id')

  if (reportId) {
    // Get single report with its values
    const { data: report, error } = await supabase
      .from('reports')
      .select('*, report_values(*)')
      .eq('id', reportId)
      .eq('user_id', user.id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json({ report })
  }

  // Get all reports
  const { data: reports, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports })
}

// PATCH /api/reports — update report values (user edits extracted values)
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { report_id, values } = await request.json()

  const adminSupabase = createAdminSupabaseClient()

  // Upsert each value
  for (const v of values) {
    if (v.id) {
      // Update existing
      await adminSupabase
        .from('report_values')
        .update({
          parameter_name: v.parameter_name,
          value: v.value,
          unit: v.unit,
          ref_range_text: v.ref_range_text,
          status: v.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', v.id)
        .eq('user_id', user.id)
    } else {
      // Insert new value added by user
      await adminSupabase
        .from('report_values')
        .insert({
          report_id,
          user_id: user.id,
          parameter_name: v.parameter_name,
          value: v.value,
          unit: v.unit,
          ref_range_text: v.ref_range_text,
          status: v.status || 'Normal',
        })
    }
  }

  const { data: report } = await adminSupabase
    .from('reports')
    .select('report_type')
    .eq('id', report_id)
    .eq('user_id', user.id)
    .single()

  const analysis = await generateReportAnalysis({
    reportType: report?.report_type || 'Other',
    parameters: values.map((v: {
      parameter_name: string
      value?: number
      value_text?: string
      unit?: string
      ref_range_low?: number
      ref_range_high?: number
      ref_range_text?: string
      status: 'Normal' | 'High' | 'Low' | 'Critical High' | 'Critical Low' | 'Watch'
    }) => ({
      parameter_name: v.parameter_name,
      value: v.value ?? null,
      value_text: v.value_text ?? null,
      unit: v.unit ?? null,
      ref_range_low: v.ref_range_low ?? null,
      ref_range_high: v.ref_range_high ?? null,
      ref_range_text: v.ref_range_text ?? null,
      status: v.status,
    })),
  })

  const aiSummary = formatAnalysisSummary(analysis)

  const abnormalCount = values.filter((v: { status?: string }) => v.status && v.status !== 'Normal').length
  const nextTestName = analysis.recommendations[0] || null

  await adminSupabase
    .from('reports')
    .update({
      upload_status: 'complete',
      ai_summary: aiSummary,
      abnormal_count: abnormalCount,
      total_parameters: values.length,
      overall_status: abnormalCount > 0 ? 'Abnormal' : 'Normal',
      next_test_name: nextTestName,
    })
    .eq('id', report_id)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}

// DELETE /api/reports
export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const reportId = searchParams.get('id')

  if (!reportId) return NextResponse.json({ error: 'Report ID required' }, { status: 400 })

  const adminSupabase = createAdminSupabaseClient()

  // Delete values first (cascade should handle this but being explicit)
  await adminSupabase.from('report_values').delete().eq('report_id', reportId).eq('user_id', user.id)

  const { error } = await adminSupabase
    .from('reports')
    .delete()
    .eq('id', reportId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
