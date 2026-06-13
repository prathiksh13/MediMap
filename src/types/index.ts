export interface Profile {
  id: string
  full_name: string | null
  date_of_birth: string | null
  gender: 'Male' | 'Female' | 'Other' | null
  height_cm: number | null
  weight_kg: number | null
  blood_group: string | null
  city: string | null
  occupation: string | null
  emergency_contact: string | null
  avatar_url: string | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  name: string
  code: string
  head_id: string
  created_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'rejected'
  role: 'head' | 'member'
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface UserCondition {
  id: string
  user_id: string
  condition_name: string
  created_at: string
}

export interface Report {
  id: string
  user_id: string
  report_name: string
  report_type: string
  lab_name: string | null
  test_date: string | null
  file_url: string | null
  file_name: string | null
  upload_status: 'processing' | 'complete' | 'failed'
  abnormal_count: number
  total_parameters: number
  overall_status: string | null
  ai_summary: string | null
  next_test_date: string | null
  next_test_name: string | null
  created_at: string
  updated_at: string
}

export interface ReportValue {
  id: string
  report_id: string
  user_id: string
  parameter_name: string
  method: string | null
  value: number | null
  value_text: string | null
  unit: string | null
  ref_range_low: number | null
  ref_range_high: number | null
  ref_range_text: string | null
  status: 'Normal' | 'High' | 'Low' | 'Critical High' | 'Critical Low' | 'Watch' | null
  test_date: string | null
  created_at: string
  updated_at: string
}

export interface PrescriptionMedicine {
  id: string
  user_id: string
  medicine_name: string
  strength: string | null
  frequency: string | null
  notes: string | null
  created_at: string
}

export interface RecommendedTest {
  id: string
  user_id: string
  test_name: string
  reason: string | null
  frequency_days: number | null
  last_done_date: string | null
  next_due_date: string | null
  status: 'Due Soon' | 'Missing' | 'On Track' | 'Overdue'
  created_at: string
  updated_at: string
}

// API response types
export interface ExtractedValue {
  parameter_name: string
  method?: string
  value?: number
  value_text?: string
  unit?: string
  ref_range_low?: number
  ref_range_high?: number
  ref_range_text?: string
  status: 'Normal' | 'High' | 'Low' | 'Critical High' | 'Critical Low' | 'Watch'
}

export interface StructuredReportParameter {
  parameter_name: string
  value: number | null
  value_text: string | null
  unit: string | null
  ref_range_low: number | null
  ref_range_high: number | null
  ref_range_text: string | null
  status: 'Normal' | 'High' | 'Low' | 'Critical High' | 'Critical Low' | 'Watch'
}

export interface ReportAnalysisInputValue {
  parameter_name: string
  value: number
  unit: string
  status: 'Normal' | 'High' | 'Low' | 'Critical High' | 'Critical Low' | 'Watch'
  test_date: string
}

export interface HealthAnalysisResult {
  summary: string
  flags: string[]
  recommendations: string[]
}

export interface ReportExtractionResult {
  values: ExtractedValue[]
  report_type: string
  lab_name?: string
  test_date?: string
  overall_status: 'Normal' | 'Borderline' | 'Abnormal'
  abnormal_count: number
  ai_summary?: string
  next_test_suggestion?: {
    test_name: string
    days_from_now: number
    reason: string
  }
}
