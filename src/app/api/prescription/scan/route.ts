import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const SCAN_ERROR =
  'Unable to read prescription. Please upload a clearer image.'

function generateMedicineLinks(medicineName: string) {
  const encoded = encodeURIComponent(medicineName)
  return {
    tata1mg: `https://www.1mg.com/search/all?name=${encoded}`,
    pharmeasy: `https://pharmeasy.in/search/all?name=${encoded}`,
    apollo: `https://www.apollopharmacy.in/search-medicines/${encoded}`,
  }
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get uploaded image
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    // Validate image type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            'Invalid file type. Please upload JPG, JPEG, or PNG.',
        },
        { status: 400 }
      )
    }

    // Max 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: 'File too large. Maximum size is 10MB.',
        },
        { status: 400 }
      )
    }

    // Convert image to base64
    const arrayBuffer = await file.arrayBuffer()

    const base64Image = Buffer.from(arrayBuffer).toString(
      'base64'
    )

    // Gemini Vision
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: file.type,
            data: base64Image,
          },
        },
        {
          text: `
You are a medical prescription assistant.

Extract all readable text from this prescription image.

Return ONLY valid JSON in this exact format:

{
  "text": "full extracted prescription text",
  "medicines": [
    {
      "medicine_name": "",
      "strength": "",
      "frequency": "",
      "notes": ""
    }
  ]
}

Rules:
- Do not invent medicines.
- Preserve original spellings.
- If handwriting is unclear, leave fields blank.
- Return JSON only.
          `,
        },
      ],
    })

    const raw = response.text ?? ''

    console.log('Gemini Response:', raw)

    if (!raw.trim()) {
      return NextResponse.json(
        { error: SCAN_ERROR },
        { status: 422 }
      )
    }

    // Remove markdown if Gemini wraps JSON
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    try {
      const parsed = JSON.parse(cleaned)

      const medicines = (parsed.medicines ?? []).map((m: any) => ({
        ...m,
        links: generateMedicineLinks(m.medicine_name ?? ''),
      }))

      return NextResponse.json({
        success: true,
        text: parsed.text ?? '',
        medicines,
      })
    } catch (jsonError) {
      console.error(
        'JSON Parse Error:',
        jsonError
      )
      console.error(
        'Gemini Raw Response:',
        cleaned
      )

      return NextResponse.json(
        { error: SCAN_ERROR },
        { status: 422 }
      )
    }
  } catch (error) {
    console.error(
      'Prescription Scan Error:',
      error
    )

    return NextResponse.json(
      { error: SCAN_ERROR },
      { status: 422 }
    )
  }
}