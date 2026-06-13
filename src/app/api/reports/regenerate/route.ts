import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { extractReportWithGemini } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { report_id } = await request.json()
  if (!report_id) {
    return NextResponse.json({ error: 'report_id is required' }, { status: 400 })
  }

  // Fetch the report — scoped to the authenticated user
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, file_url, file_name')
    .eq('id', report_id)
    .eq('user_id', user.id)
    .single()

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (!report.file_url) {
    return NextResponse.json({ error: 'No file attached to this report' }, { status: 400 })
  }

  // Download the file from the stored URL
  let fileBuffer: ArrayBuffer
  let mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'

  try {
    const fileRes = await fetch(report.file_url)
    if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`)
    fileBuffer = await fileRes.arrayBuffer()

    const contentType = fileRes.headers.get('content-type') || ''
    if (contentType.includes('pdf')) {
      mimeType = 'application/pdf'
    } else if (contentType.includes('png')) {
      mimeType = 'image/png'
    } else {
      // Fall back to extension sniffing
      mimeType = report.file_name?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    }
  } catch (fetchError) {
    console.error('File download error:', fetchError)
    return NextResponse.json({ error: 'Failed to download report file' }, { status: 500 })
  }

  // Re-run Gemini extraction
  let extraction
  try {
    extraction = await extractReportWithGemini(fileBuffer, mimeType)
  } catch (geminiError) {
    console.error('Gemini re-extraction error:', geminiError)
    return NextResponse.json({ error: 'AI extraction failed. Try again later.' }, { status: 500 })
  }

  // Update only the AI-derived summary fields
  const adminSupabase = createAdminSupabaseClient()
  const { error: updateError } = await adminSupabase
    .from('reports')
    .update({
      ai_summary: extraction.ai_summary || null,
      overall_status: extraction.overall_status || null,
      abnormal_count: extraction.abnormal_count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', report_id)
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Report update error:', updateError)
    return NextResponse.json({ error: 'Failed to save regenerated analysis' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
