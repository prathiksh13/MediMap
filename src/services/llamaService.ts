import OpenAI from 'openai'
// pdf-parse v2 relies on pdfjs-dist's worker setup, which breaks under Next.js
// server bundling ("Cannot find module './pdf.worker.mjs'"). We use the
// pdfjs-dist legacy build directly with the worker disabled instead.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
// tesseract.js removed — causes worker thread crash on Windows/Next.js 14
// Images are handled via Groq vision API instead
import type {
  ExtractedValue,
  HealthAnalysisResult,
  ReportAnalysisInputValue,
  ReportExtractionResult,
  StructuredReportParameter,
} from '@/types'

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
})

const GROQ_MODEL = 'llama-3.3-70b-versatile'
const CONSULT_PHYSICIAN_TEXT = 'Consult your physician before making medical decisions.'

const FALLBACK_ANALYSIS: HealthAnalysisResult = {
  summary: 'AI insights are temporarily unavailable.',
  flags: [],
  recommendations: [],
}

const COMMON_REFERENCE_RANGES: Array<{
  testType: RegExp
  parameter: RegExp
  low: number
  high: number
  unit?: string
  refRangeText: string
}> = [
  {
    testType: /cbc|blood count|complete blood count/i,
    parameter: /\bwbc\b|white blood cell/i,
    low: 4.0,
    high: 11.0,
    unit: '10^3/uL',
    refRangeText: '4.0 - 11.0',
  },
  {
    testType: /cbc|blood count|complete blood count/i,
    parameter: /lymphocyte/i,
    low: 20,
    high: 40,
    unit: '%',
    refRangeText: '20 - 40',
  },
  {
    testType: /thyroid|tsh/i,
    parameter: /\btsh\b|thyroid stimulating hormone/i,
    low: 0.4,
    high: 4.5,
    unit: 'uIU/mL',
    refRangeText: '0.4 - 4.5',
  },
  {
    testType: /diabetes|hba1c|a1c/i,
    parameter: /hba1c|a1c|glycated hemoglobin/i,
    low: 4.0,
    high: 5.6,
    unit: '%',
    refRangeText: '4.0 - 5.6',
  },
  {
    testType: /lipid|cholesterol/i,
    parameter: /\bldl\b|low density lipoprotein/i,
    low: 0,
    high: 100,
    unit: 'mg/dL',
    refRangeText: '< 100',
  },
  {
    testType: /lipid|cholesterol/i,
    parameter: /cholesterol|total cholesterol/i,
    low: 0,
    high: 200,
    unit: 'mg/dL',
    refRangeText: '< 200',
  },
  {
    testType: /lipid/i,
    parameter: /triglycerides?/i,
    low: 0,
    high: 150,
    unit: 'mg/dL',
    refRangeText: '< 150',
  },
]

function stripCodeFences(text: string) {
  return text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
}

function safeParseJson<T>(text: string, fallback: T): T {
  const cleaned = stripCodeFences(text)

  try {
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim()
}

function isNumericToken(token: string) {
  return /^[<>]=?\s*-?\d+(?:\.\d+)?%?$/.test(token) || /^-?\d+(?:\.\d+)?%?$/.test(token)
}

function parseNumericToken(token: string) {
  const match = token.match(/[<>]=?\s*(-?\d+(?:\.\d+)?)/)

  if (!match) return null
  return Number(match[1])
}

function extractRangeFromText(text: string) {
  const cleaned = text.replace(/[\[\]()]/g, ' ')
  const rangeMatch = cleaned.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i)

  if (rangeMatch) {
    return {
      low: Number(rangeMatch[1]),
      high: Number(rangeMatch[2]),
      text: `${rangeMatch[1]} - ${rangeMatch[2]}`,
    }
  }

  const lessThanMatch = cleaned.match(/<=?\s*(-?\d+(?:\.\d+)?)/)
  if (lessThanMatch) {
    const high = Number(lessThanMatch[1])
    return {
      low: 0,
      high,
      text: `< ${high}`,
    }
  }

  const greaterThanMatch = cleaned.match(/>=?\s*(-?\d+(?:\.\d+)?)/)
  if (greaterThanMatch) {
    const low = Number(greaterThanMatch[1])
    return {
      low,
      high: Number.POSITIVE_INFINITY,
      text: `> ${low}`,
    }
  }

  return null
}

function getKnownReference(parameterName: string, reportType: string) {
  const normalizedParameter = parameterName.toLowerCase()
  const normalizedReportType = reportType.toLowerCase()

  for (const candidate of COMMON_REFERENCE_RANGES) {
    if (!candidate.testType.test(normalizedReportType)) continue
    if (candidate.parameter.test(normalizedParameter)) {
      return candidate
    }
  }

  for (const candidate of COMMON_REFERENCE_RANGES) {
    if (candidate.parameter.test(normalizedParameter)) {
      return candidate
    }
  }

  return null
}

function inferStatus(value: number | null, low: number | null, high: number | null, rawValue: string | null) {
  if (rawValue) {
    if (rawValue.startsWith('>')) return 'High' as const
    if (rawValue.startsWith('<')) return 'Low' as const
  }

  if (value === null || low === null || high === null) {
    return 'Normal' as const
  }

  if (value < low) {
    if (low > 0 && value <= low * 0.5) return 'Critical Low' as const
    return 'Low' as const
  }

  if (value > high) {
    if (high > 0 && value >= high * 1.5) return 'Critical High' as const
    return 'High' as const
  }

  const rangeSpan = high - low
  if (rangeSpan > 0) {
    const lowWatchThreshold = low + rangeSpan * 0.1
    const highWatchThreshold = high - rangeSpan * 0.1

    if (value <= lowWatchThreshold || value >= highWatchThreshold) {
      return 'Watch' as const
    }
  }

  return 'Normal' as const
}

function parseValueFromLine(line: string, reportType: string): ExtractedValue | null {
  const normalized = line.replace(/\s+/g, ' ').trim()
  if (!normalized) return null

  const tokens = normalized.split(' ')
  const numericIndex = tokens.findIndex(token => /(?:[<>]=?\s*)?-?\d+(?:\.\d+)?%?/.test(token))
  if (numericIndex === -1) return null

  const numericToken = tokens[numericIndex]
  const parameterName = tokens.slice(0, numericIndex).join(' ').replace(/[:\-–]+$/g, '').trim()
  if (!parameterName) return null

  const value = parseNumericToken(numericToken)
  const valueText = value === null || /[<>]/.test(numericToken) ? numericToken : undefined
  const afterValue = tokens.slice(numericIndex + 1).join(' ').trim()

  const explicitRange = extractRangeFromText(afterValue) || extractRangeFromText(normalized)
  const knownReference = getKnownReference(parameterName, reportType)

  const referenceLow = explicitRange?.low ?? knownReference?.low ?? null
  const referenceHigh = explicitRange?.high ?? knownReference?.high ?? null
  const refRangeText = explicitRange?.text ?? knownReference?.refRangeText ?? undefined

  const unit = (() => {
    const candidateTokens = afterValue.split(' ').filter(Boolean)
    const firstToken = candidateTokens[0]

    if (!firstToken) return knownReference?.unit
    if (extractRangeFromText(firstToken) || isNumericToken(firstToken)) return knownReference?.unit
    if (/^(normal|positive|negative|trace|present|absent)$/i.test(firstToken)) return knownReference?.unit
    return firstToken
  })()

  const status = inferStatus(value, referenceLow, referenceHigh, valueText ?? null)

  return {
    parameter_name: parameterName,
    method: undefined,
    value: value ?? undefined,
    value_text: valueText,
    unit,
    ref_range_low: referenceLow ?? undefined,
    ref_range_high: referenceHigh ?? undefined,
    ref_range_text: refRangeText,
    status,
  }
}

function parseFallbackColumns(line: string, reportType: string): ExtractedValue | null {
  const normalized = line.replace(/\s+/g, ' ').trim()
  if (!normalized) return null

  const rangeMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i)
  const valueMatch = normalized.match(/(?:[<>]=?\s*)?-?\d+(?:\.\d+)?%?/) 
  if (!valueMatch || valueMatch.index === undefined) return null

  const rawValue = valueMatch[0]
  const value = parseNumericToken(rawValue)
  const prefix = normalized.slice(0, valueMatch.index).replace(/[:\-–]+$/g, '').trim()
  const suffix = normalized.slice(valueMatch.index + rawValue.length).trim()

  const parameterName = prefix || normalized
  const knownReference = getKnownReference(parameterName, reportType)
  const explicitRange = rangeMatch
    ? {
        low: Number(rangeMatch[1]),
        high: Number(rangeMatch[2]),
        text: `${rangeMatch[1]} - ${rangeMatch[2]}`,
      }
    : extractRangeFromText(suffix) || extractRangeFromText(normalized)

  return {
    parameter_name: parameterName,
    method: undefined,
    value: value ?? undefined,
    value_text: value === null || /[<>]/.test(rawValue) ? rawValue : undefined,
    unit: knownReference?.unit,
    ref_range_low: explicitRange?.low ?? knownReference?.low ?? undefined,
    ref_range_high: explicitRange?.high ?? knownReference?.high ?? undefined,
    ref_range_text: explicitRange?.text ?? knownReference?.refRangeText ?? undefined,
    status: inferStatus(value, explicitRange?.low ?? knownReference?.low ?? null, explicitRange?.high ?? knownReference?.high ?? null, /[<>]/.test(rawValue) ? rawValue : null),
  }
}

function parseExtractedTextToValues(extractedText: string, reportType: string) {
  const lines = extractedText
    .split('\n')
    .map(line => line.replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean)

  const values: ExtractedValue[] = []

  for (const line of lines) {
    const parsed = parseValueFromLine(line, reportType) || parseFallbackColumns(line, reportType)
    if (parsed) {
      values.push(parsed)
      continue
    }

    const inlinePattern = /([^\d|:]+?)\s+(-?\d+(?:\.\d+)?)\s*([a-zA-Z/%µ^\d\-]+)?\s*(?:([<>]=?\s*-?\d+(?:\.\d+)?)|(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?))?/g
    let inlineMatch: RegExpExecArray | null
    while ((inlineMatch = inlinePattern.exec(line)) !== null) {
      const parameterName = inlineMatch[1]?.replace(/[:\-–]+$/g, '').trim()
      if (!parameterName) continue

      const numericToken = inlineMatch[2]
      const value = Number(numericToken)
      const unit = inlineMatch[3]?.trim() || getKnownReference(parameterName, reportType)?.unit
      const refLow = inlineMatch[5] ? Number(inlineMatch[5]) : getKnownReference(parameterName, reportType)?.low ?? null
      const refHigh = inlineMatch[6] ? Number(inlineMatch[6]) : getKnownReference(parameterName, reportType)?.high ?? null
      const refText = inlineMatch[4] || (inlineMatch[5] && inlineMatch[6] ? `${inlineMatch[5]} - ${inlineMatch[6]}` : getKnownReference(parameterName, reportType)?.refRangeText)

      values.push({
        parameter_name: parameterName,
        method: undefined,
        value,
        value_text: undefined,
        unit,
        ref_range_low: refLow ?? undefined,
        ref_range_high: refHigh ?? undefined,
        ref_range_text: refText,
        status: inferStatus(value, refLow, refHigh, null),
      })
    }
  }

  return mergeDuplicateValues(values)
}

function mergeDuplicateValues(values: ExtractedValue[]) {
  const seen = new Map<string, ExtractedValue>()

  for (const value of values) {
    const key = value.parameter_name.toLowerCase().replace(/\s+/g, ' ')

    if (!seen.has(key)) {
      seen.set(key, value)
      continue
    }

    const existing = seen.get(key)!
    const preferred = existing.value === undefined && value.value !== undefined ? value : existing

    seen.set(key, {
      ...preferred,
      value: preferred.value ?? value.value,
      value_text: preferred.value_text ?? value.value_text,
      unit: preferred.unit ?? value.unit,
      ref_range_low: preferred.ref_range_low ?? value.ref_range_low,
      ref_range_high: preferred.ref_range_high ?? value.ref_range_high,
      ref_range_text: preferred.ref_range_text ?? value.ref_range_text,
      status: preferred.status ?? value.status,
    })
  }

  return Array.from(seen.values())
}

function inferReportType(values: ExtractedValue[], fallbackReportType?: string) {
  if (fallbackReportType?.trim()) return fallbackReportType.trim()

  const names = values.map(value => value.parameter_name.toLowerCase())
  if (names.some(name => /tsh|thyroid|t3|t4/.test(name))) return 'Thyroid'
  if (names.some(name => /hba1c|a1c|glucose|sugar/.test(name))) return 'Diabetes'
  if (names.some(name => /ldl|hdl|cholesterol|triglyceride/.test(name))) return 'Lipid Profile'
  if (names.some(name => /wbc|lymphocyte|hemoglobin|platelet|rbc/.test(name))) return 'CBC'
  return 'Other'
}

function inferNextTestSuggestion(reportType: string, values: ExtractedValue[]) {
  const report = reportType.toLowerCase()
  const abnormalValues = values.filter(value => value.status !== 'Normal')

  if (/diabetes|hba1c|a1c/.test(report) || values.some(value => /hba1c|a1c/.test(value.parameter_name.toLowerCase()) && (value.status === 'High' || value.status === 'Critical High'))) {
    return {
      test_name: 'HbA1c',
      days_from_now: 90,
      reason: 'Repeat HbA1c to track blood sugar control over time.',
    }
  }

  if (/thyroid|tsh/.test(report) || values.some(value => /tsh|thyroid/i.test(value.parameter_name) && value.status !== 'Normal')) {
    return {
      test_name: 'TSH and Free T4',
      days_from_now: 30,
      reason: 'Repeat thyroid testing to confirm the abnormal result and guide follow-up.',
    }
  }

  if (/lipid|cholesterol/.test(report) || values.some(value => /ldl|cholesterol|triglyceride/i.test(value.parameter_name) && value.status !== 'Normal')) {
    return {
      test_name: 'Lipid Profile',
      days_from_now: 90,
      reason: 'Repeat lipid testing to see whether cholesterol levels improve.',
    }
  }

  if (/cbc|blood count/.test(report) || values.some(value => /wbc|lymphocyte|hemoglobin|platelet|rbc/i.test(value.parameter_name) && value.status !== 'Normal')) {
    return {
      test_name: 'CBC with Differential',
      days_from_now: 30,
      reason: 'Repeat CBC to review white blood cell and differential changes.',
    }
  }

  if (abnormalValues.length > 0) {
    return {
      test_name: 'Follow-up Review',
      days_from_now: 30,
      reason: 'Review the abnormal findings with your physician.',
    }
  }

  return undefined
}

function formatAnalysisForStorage(analysis: HealthAnalysisResult) {
  const lines = [`Summary: ${analysis.summary.trim()}`]

  if (analysis.flags.length > 0) {
    lines.push('', 'Flags:')
    for (const flag of analysis.flags) {
      lines.push(`- ${flag}`)
    }
  }

  if (analysis.recommendations.length > 0) {
    lines.push('', 'Recommendations:')
    for (const recommendation of analysis.recommendations) {
      lines.push(`- ${recommendation}`)
    }
  }

  if (!lines.some(line => line.includes(CONSULT_PHYSICIAN_TEXT))) {
    lines.push('', CONSULT_PHYSICIAN_TEXT)
  }

  return lines.join('\n').trim()
}

async function extractTextWithPdfParse(fileBuffer: ArrayBuffer) {
  try {
    const data = new Uint8Array(fileBuffer)
    const doc = await pdfjsLib.getDocument({
      data,
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise

    let text = ''
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: unknown) => (item as { str?: string }).str || '')
        .join(' ')
      text += pageText + '\n'
    }

    const textLength = text.length
    console.log('[pdf-parse] pages:', doc.numPages, 'text length:', textLength)
    if (textLength > 0) {
      console.log('[pdf-parse] text preview:', text.slice(0, 400))
    } else {
      console.warn('[pdf-parse] no text extracted — PDF may be scanned or image-based')
    }
    return normalizeText(text)
  } catch (error) {
    console.error('[pdf-parse] error:', error)
    return ''
  }
}

async function extractTextWithTesseract(fileBuffer: ArrayBuffer) {
  // Tesseract removed — use Groq vision for images instead
  return ''
}

async function extractValuesFromImageWithGroq(fileBuffer: ArrayBuffer, mimeType: 'image/jpeg' | 'image/png', reportType: string): Promise<ExtractedValue[]> {
  if (!process.env.GROQ_API_KEY) return []

  try {
    const base64 = Buffer.from(fileBuffer).toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

    const response = await client.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a medical report parser. Extract ALL test parameters from this lab report image.

Report type hint: ${reportType || 'unknown'}

Return JSON ONLY in this exact shape:
{
  "values": [
    {
      "parameter_name": "exact parameter name",
      "method": null,
      "value": numeric value or null,
      "value_text": "text value if not numeric or null",
      "unit": "unit string",
      "ref_range_low": numeric lower bound or null,
      "ref_range_high": numeric upper bound or null,
      "ref_range_text": "raw reference range text",
      "status": "Normal | High | Low | Critical High | Critical Low | Watch"
    }
  ],
  "lab_name": "lab name or null",
  "test_date": "YYYY-MM-DD or null"
}

Rules:
- Extract EVERY parameter visible
- Determine status by comparing value to the reference range shown
- Return ONLY valid JSON, no markdown`,
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    })

    const content = response.choices[0]?.message?.content ?? ''
    const parsed = safeParseJson<{ values?: ExtractedValue[] }>(content, {})
    if (!Array.isArray(parsed.values)) {
      console.warn('[groq-vision] response missing values array')
      return []
    }
    console.log('[groq-vision] extracted', parsed.values.length, 'parameters')
    return parsed.values.filter(v => v.parameter_name?.trim())
  } catch (error) {
    console.error('[groq-vision] error:', error)
    return []
  }
}

const LLM_EXTRACTION_PROMPT = `You are a medical report parser. Extract ALL test parameters from the report text.

Return JSON in this exact shape:
{
  "report_type": "Blood Test | Thyroid | Lipid Profile | Diabetes | CBC | Other",
  "lab_name": "lab name if visible or null",
  "test_date": "YYYY-MM-DD if visible or null",
  "values": [
    {
      "parameter_name": "exact parameter name",
      "method": "method if listed or null",
      "value": numeric value or null,
      "value_text": "text value if not numeric or null",
      "unit": "unit",
      "ref_range_low": numeric lower bound or null,
      "ref_range_high": numeric upper bound or null,
      "ref_range_text": "raw reference range text",
      "status": "Normal | High | Low | Critical High | Critical Low | Watch"
    }
  ]
}

Rules:
- Extract EVERY parameter visible in the report
- Determine status by comparing value to reference range
- Return ONLY valid JSON`

async function extractValuesWithLLM(extractedText: string, reportType: string): Promise<ExtractedValue[]> {
  if (!process.env.GROQ_API_KEY || extractedText.length < 20) {
    return []
  }

  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: LLM_EXTRACTION_PROMPT },
        {
          role: 'user',
          content: `Report type hint: ${reportType || 'unknown'}\n\nReport text:\n${extractedText.slice(0, 14000)}`,
        },
      ],
    })

    const content = response.choices[0]?.message?.content ?? ''
    const parsed = safeParseJson<{
      values?: ExtractedValue[]
      report_type?: string
      lab_name?: string
      test_date?: string
    }>(content, {})

    if (!Array.isArray(parsed.values)) {
      console.warn('[llm-extraction] response missing values array')
      return []
    }

    console.log('[llm-extraction] extracted', parsed.values.length, 'parameters')
    return parsed.values.filter(v => v.parameter_name?.trim())
  } catch (error) {
    console.error('[llm-extraction] error:', error)
    return []
  }
}

export async function extractReportData(
  fileBuffer: ArrayBuffer,
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png',
  fallbackReportType?: string
): Promise<ReportExtractionResult> {
  let extractedText = ''
  let values: ExtractedValue[] = []

  if (mimeType === 'application/pdf') {
    extractedText = await extractTextWithPdfParse(fileBuffer)
    console.log('[extraction] PDF text length:', extractedText.length)

    // Try regex parse first, fall back to LLM if regex gets nothing
    values = parseExtractedTextToValues(extractedText, fallbackReportType || '')
    if (values.length === 0 && extractedText.length >= 20) {
      console.log('[extraction] regex got 0 — sending to LLM')
      values = await extractValuesWithLLM(extractedText, fallbackReportType || '')
    }
  } else {
    // Images: skip tesseract entirely, go straight to Groq vision
    console.log('[extraction] image upload — using Groq vision')
    values = await extractValuesFromImageWithGroq(
      fileBuffer,
      mimeType as 'image/jpeg' | 'image/png',
      fallbackReportType || ''
    )
  }

  console.log('[extraction] final value count:', values.length)

  const abnormalCount = values.filter(value => value.status !== 'Normal').length
  const overallStatus = abnormalCount > 0
    ? values.some(value => value.status === 'Critical High' || value.status === 'Critical Low' || value.status === 'High' || value.status === 'Low')
      ? 'Abnormal'
      : 'Borderline'
    : 'Normal'

  const reportType = inferReportType(values, fallbackReportType)
  const nextTestSuggestion = inferNextTestSuggestion(reportType, values)

  // Generate plain-language AI verdict inline so it's available on first upload,
  // no manual "Regenerate Analysis" step required.
  let aiSummary: string | undefined
  if (values.length > 0 && process.env.GROQ_API_KEY) {
    try {
      const analysis = await generateReportAnalysis({
        reportType,
        parameters: values.map(v => ({
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
      aiSummary = formatAnalysisForStorage(analysis)
    } catch (err) {
      console.warn('[extraction] ai_summary generation failed — continuing without it:', err)
    }
  }

  return {
    report_type: reportType,
    values,
    overall_status: overallStatus,
    abnormal_count: abnormalCount,
    ai_summary: aiSummary,
    next_test_suggestion: nextTestSuggestion,
  }
}

export async function generateReportAnalysis(input: {
  reportType: string
  parameters: StructuredReportParameter[]
}): Promise<HealthAnalysisResult> {
  if (!process.env.GROQ_API_KEY) {
    return FALLBACK_ANALYSIS
  }

  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are MediMap AI.',
            'Your role is to explain medical reports in simple language.',
            '',
            'Rules:',
            '- Explain abnormal findings clearly.',
            '- Mention values outside reference ranges.',
            '- Suggest possible follow-up tests.',
            '- Suggest when a doctor consultation may be appropriate.',
            '- Use patient-friendly language.',
            '- DO NOT diagnose diseases.',
            '- DO NOT prescribe medications.',
            '- Keep responses concise.',
            '- Use bullet points.',
            '',
            `Always end with: "${CONSULT_PHYSICIAN_TEXT}"`,
            '',
            'Return JSON in this shape:',
            '{"summary":"","flags":[],"recommendations":[]}',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            reportType: input.reportType,
            parameters: input.parameters,
          }),
        },
      ],
    })

    const content = response.choices[0]?.message?.content ?? ''
    const parsed = safeParseJson<HealthAnalysisResult>(content, FALLBACK_ANALYSIS)

    return {
      summary: parsed.summary || FALLBACK_ANALYSIS.summary,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  } catch {
    return FALLBACK_ANALYSIS
  }
}

export async function generateRecommendedTests(
  conditions: string[],
  existingTests: { parameter_name: string; test_date: string }[]
): Promise<{ test_name: string; reason: string; frequency_days: number }[]> {
  if (!process.env.GROQ_API_KEY) {
    return []
  }

  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You recommend follow-up lab tests for a patient. Return only JSON.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            conditions,
            recentTests: existingTests.map(test => test.parameter_name),
            format: [{ test_name: 'HbA1c', reason: 'Diabetes monitoring', frequency_days: 90 }],
          }),
        },
      ],
    })

    const content = response.choices[0]?.message?.content ?? ''
    const parsed = safeParseJson<{ recommendations?: { test_name: string; reason: string; frequency_days: number }[] } | { test_name: string; reason: string; frequency_days: number }[]>(content, [])

    if (Array.isArray(parsed)) {
      return parsed
    }

    return Array.isArray(parsed.recommendations) ? parsed.recommendations : []
  } catch {
    return []
  }
}

export async function generateHealthOverview(
  conditions: string[],
  recentValues: ReportAnalysisInputValue[]
): Promise<string> {
  const analysis = await generateReportAnalysis({
    reportType: conditions.join(', ') || 'General Health Review',
    parameters: recentValues.map(value => ({
      parameter_name: value.parameter_name,
      value: value.value,
      value_text: null,
      unit: value.unit,
      ref_range_low: null,
      ref_range_high: null,
      ref_range_text: null,
      status: value.status,
    })),
  })

  return formatAnalysisForStorage(analysis)
}

export function formatAnalysisSummary(analysis: HealthAnalysisResult) {
  return formatAnalysisForStorage(analysis)
}
