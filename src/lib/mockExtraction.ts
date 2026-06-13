import type { ReportExtractionResult } from '@/types'

/** Temporary mock CBC data — set USE_MOCK_EXTRACTION=true to verify frontend rendering */
export const MOCK_CBC_EXTRACTION: ReportExtractionResult = {
  report_type: 'Complete Blood Count (CBC)',
  lab_name: 'Quest Diagnostics',
  overall_status: 'Abnormal',
  abnormal_count: 2,
  next_test_suggestion: {
    test_name: 'CBC with Differential',
    days_from_now: 30,
    reason: 'Repeat CBC to review white blood cell and differential changes.',
  },
  values: [
    { parameter_name: 'Hemoglobin', method: 'Colorimetric', value: 14.5, unit: 'g/dL', ref_range_low: 13.0, ref_range_high: 16.5, ref_range_text: '13.0–16.5', status: 'Normal' },
    { parameter_name: 'WBC Count', method: 'SF Cube', value: 10570, unit: '/cmm', ref_range_low: 4000, ref_range_high: 10000, ref_range_text: '4000–10000', status: 'High' },
    { parameter_name: 'RBC Count', method: 'Electrical Impedance', value: 4.79, unit: 'mil/cmm', ref_range_low: 4.5, ref_range_high: 5.5, ref_range_text: '4.5–5.5', status: 'Normal' },
    { parameter_name: 'Hematocrit', method: 'Calculated', value: 43.3, unit: '%', ref_range_low: 40, ref_range_high: 49, ref_range_text: '40–49', status: 'Normal' },
    { parameter_name: 'MCV', method: 'Derived', value: 90.3, unit: 'fL', ref_range_low: 83, ref_range_high: 101, ref_range_text: '83–101', status: 'Normal' },
    { parameter_name: 'Neutrophils', method: 'Microscopy', value: 73, unit: '%', ref_range_low: 40, ref_range_high: 80, ref_range_text: '40–80', status: 'Normal' },
    { parameter_name: 'Lymphocytes', method: 'Microscopy', value: 19, unit: '%', ref_range_low: 20, ref_range_high: 40, ref_range_text: '20–40', status: 'Low' },
    { parameter_name: 'Platelets', method: 'Impedance', value: 210000, unit: '/cmm', ref_range_low: 150000, ref_range_high: 400000, ref_range_text: '150000–400000', status: 'Normal' },
  ],
}
