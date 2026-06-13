import { NextRequest, NextResponse } from 'next/server'
import { MOCK_CBC_EXTRACTION } from '@/lib/mockExtraction'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { extractReportData } from '@/services/llamaService'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const reportType = formData.get('report_type') as string
    const labName = formData.get('lab_name') as string
    const testDate = formData.get('test_date') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PDF, JPG, or PNG.' }, { status: 400 })
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
    }

    const adminSupabase = createAdminSupabaseClient()

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const fileBuffer = await file.arrayBuffer()

    const { data: uploadData, error: uploadError } = await adminSupabase
      .storage
      .from('reports')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    const { data: signedUrlData, error: signedUrlError } = await adminSupabase
      .storage
      .from('reports')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 year expiry

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError)
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 })
    }

    const fileUrl = signedUrlData.signedUrl

    // Create report record with processing status
    const { data: report, error: reportError } = await adminSupabase
      .from('reports')
      .insert({
        user_id: user.id,
        report_name: reportType || 'Medical Report',
        report_type: reportType || 'Other',
        lab_name: labName || null,
        test_date: testDate || null,
        file_url: fileUrl,
        file_name: file.name,
        upload_status: 'processing',
      })
      .select()
      .single()

    if (reportError || !report) {
      console.error('Report insert error:', reportError)
      return NextResponse.json({ error: 'Failed to create report record' }, { status: 500 })
    }

    const useMockExtraction = process.env.USE_MOCK_EXTRACTION === 'true'
    const extraction = useMockExtraction
      ? MOCK_CBC_EXTRACTION
      : await extractReportData(
          fileBuffer,
          file.type as 'application/pdf' | 'image/jpeg' | 'image/png',
          reportType || undefined,
        )

    if (useMockExtraction) {
      console.log('[upload] USE_MOCK_EXTRACTION=true — returning hardcoded CBC values')
    }

    // Insert extracted values
    if (extraction.values && extraction.values.length > 0) {
      const valuesToInsert = extraction.values.map(v => ({
        report_id: report.id,
        user_id: user.id,
        parameter_name: v.parameter_name,
        method: v.method || null,
        value: v.value ?? null,
        value_text: v.value_text || null,
        unit: v.unit || null,
        ref_range_low: v.ref_range_low ?? null,
        ref_range_high: v.ref_range_high ?? null,
        ref_range_text: v.ref_range_text || null,
        status: v.status,
        test_date: testDate || extraction.test_date || null,
      }))

      const { error: valuesError } = await adminSupabase
        .from('report_values')
        .insert(valuesToInsert)

      if (valuesError) {
        console.error('Values insert error:', valuesError)
      }
    }

    // Calculate next test date
    let nextTestDate = null
    if (extraction.next_test_suggestion) {
      const d = new Date()
      d.setDate(d.getDate() + extraction.next_test_suggestion.days_from_now)
      nextTestDate = d.toISOString().split('T')[0]
    }

    // Update report with extraction results
    await adminSupabase
      .from('reports')
      .update({
        upload_status: 'complete',
        report_name: extraction.report_type || reportType || 'Medical Report',
        report_type: extraction.report_type || reportType || 'Other',
        lab_name: extraction.lab_name || labName || null,
        test_date: extraction.test_date || testDate || null,
        abnormal_count: extraction.abnormal_count,
        total_parameters: extraction.values?.length || 0,
        overall_status: extraction.overall_status,
        ai_summary: extraction.ai_summary || null,
        next_test_date: nextTestDate,
        next_test_name: extraction.next_test_suggestion?.test_name || null,
      })
      .eq('id', report.id)

    return NextResponse.json({
      report_id: report.id,
      extracted_parameters: extraction.values,
      extraction,
      success: true,
    })

  } catch (error) {
    console.error('Upload route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
