import { GoogleGenerativeAI } from '@google/genai'
import type { ReportExtractionResult } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const EXTRACTION_PROMPT = `You are a medical report parser. Extract ALL test parameters from this medical report PDF.

Return a JSON object with this exact structure:
{
  "report_type": "Blood Test | Thyroid | Lipid | Diabetes | Urine | Other",
  "lab_name": "lab name if visible",
  "test_date": "YYYY-MM-DD if visible",
  "overall_status": "Normal | Borderline | Abnormal",
  "abnormal_count": number,
  "ai_summary": "2-3 sentence plain language explanation of what this report means for the patient. Mention specific abnormal values. Write for a non-medical audience.",
  "next_test_suggestion": {
    "test_name": "name of recommended follow-up test",
    "days_from_now": 30,
    "reason": "why this test is recommended"
  },
  "values": [
    {
      "parameter_name": "exact parameter name from report",
      "method": "method if listed",
      "value": numeric value or null,
      "value_text": "text value if not numeric",
      "unit": "unit of measurement",
      "ref_range_low": numeric lower bound or null,
      "ref_range_high": numeric upper bound or null,
      "ref_range_text": "raw reference range text",
      "status": "Normal | High | Low | Critical High | Critical Low | Watch"
    }
  ]
}

Rules:
- Extract EVERY parameter visible in the report, don't skip any
- Determine status by comparing value to reference range
- "Watch" = within range but close to boundary (within 10%)
- "Critical High/Low" = significantly outside range (>50% beyond boundary)
- If a value is missing a reference range, mark status as "Normal" and leave ref_range fields null
- Return ONLY the JSON object, no markdown, no explanation`

export async function extractReportWithGemini(
  fileBuffer: ArrayBuffer,
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png'
): Promise<ReportExtractionResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const base64Data = Buffer.from(fileBuffer).toString('base64')

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    },
    EXTRACTION_PROMPT,
  ])

  const response = result.response
  const text = response.text()

  // Strip markdown fences and bare "json\n" prefix Gemini sometimes emits
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/^json\n/i, '')
    .trim()

  let originalError: Error
  try {
    return JSON.parse(cleaned) as ReportExtractionResult
  } catch (e) {
    originalError = e as Error
  }

  // Fallback: extract the outermost {...} substring and retry
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1)) as ReportExtractionResult
    } catch {
      // fall through to throw original error
    }
  }

  throw new Error(`Gemini returned invalid JSON: ${text.substring(0, 200)}`)
}

// Generate recommended tests based on user conditions
export async function generateRecommendedTests(
  conditions: string[],
  existingTests: { parameter_name: string; test_date: string }[]
): Promise<{ test_name: string; reason: string; frequency_days: number }[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `A patient has the following conditions: ${conditions.join(', ')}.
Their recent tests include: ${existingTests.map(t => t.parameter_name).join(', ')}.

Return a JSON array of recommended tests they should be doing. Max 8 tests.
Format:
[
  {
    "test_name": "HbA1c",
    "reason": "Diabetes monitoring — tracks average blood sugar over 3 months",
    "frequency_days": 90
  }
]

Only return the JSON array, no other text.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    return []
  }
}

// Generate health analysis summary across all reports
export async function generateHealthOverview(
  conditions: string[],
  recentValues: { parameter_name: string; value: number; unit: string; status: string; test_date: string }[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Patient conditions: ${conditions.join(', ')}
Recent test values: ${JSON.stringify(recentValues.slice(0, 20))}

Write a 3-4 sentence health overview in plain language. Mention specific trends, what's improving, and what needs attention. Do not use medical jargon. Do not give specific medical advice.`

  const result = await model.generateContent(prompt)
  return result.response.text()
}
