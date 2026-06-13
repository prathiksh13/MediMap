'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Sidebar from '@/components/layout/Sidebar'
import type { ExtractedValue } from '@/types'

const REPORT_TYPES = ['Blood Test', 'Thyroid', 'Lipid Profile', 'Diabetes', 'Urine', 'Liver Function', 'Kidney Function', 'CBC', 'HbA1c', 'TSH', 'Other']

function UploadPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillTest = searchParams.get('test') || ''
  const [file, setFile] = useState<File | null>(null)
  const [reportType, setReportType] = useState(prefillTest)
  const [labName, setLabName] = useState('')
  const [testDate, setTestDate] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedValue[]>([])
  const [reportId, setReportId] = useState('')
  const [error, setError] = useState('')
  const [addingRow, setAddingRow] = useState(false)
  const [newRow, setNewRow] = useState({ parameter_name: '', value: '', unit: '', ref_range_text: '', status: 'Normal' })
  const [saving, setSaving] = useState(false)

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setFile(files[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': [], 'image/jpeg': [], 'image/png': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  async function handleExtract() {
    if (!file) { setError('Please select a file'); return }
    setExtracting(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('report_type', reportType)
      fd.append('lab_name', labName)
      fd.append('test_date', testDate)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      setReportId(data.report_id)

      if (data.extraction_failed) {
        setError('Automatic extraction is temporarily unavailable. Enter values manually using "+ Add Value".')
        setExtracted([])
        return
      }

      const extractedValues = data.extracted_parameters || data.extraction?.values || []
      setExtracted(extractedValues)

      if (extractedValues.length === 0) {
        setError('No values could be extracted from this report. Add them manually using "+ Add Value".')
      }
    } catch (uploadError) {
      setError('Upload failed')
    } finally {
      setExtracting(false)
    }
  }

  function updateValue(index: number, field: string, value: string) {
    setExtracted(prev => prev.map((v, i) => i === index ? { ...v, [field]: field === 'value' ? parseFloat(value) || 0 : value } : v))
  }

  function addNewRow() {
    if (!newRow.parameter_name) return
    setExtracted(prev => [...prev, { parameter_name: newRow.parameter_name, value: parseFloat(newRow.value) || undefined, unit: newRow.unit, ref_range_text: newRow.ref_range_text, status: newRow.status as any }])
    setNewRow({ parameter_name: '', value: '', unit: '', ref_range_text: '', status: 'Normal' })
    setAddingRow(false)
  }

  async function handleSave() {
    if (!reportId) return
    setSaving(true)
    await fetch('/api/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, values: extracted }),
    })
    router.push(`/reports/${reportId}`)
  }

  const statusClass = (s: string) =>
    s === 'Normal' ? 'status-normal' : s === 'High' || s === 'Critical High' ? 'status-high' : 'status-low'

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-playfair text-3xl font-bold text-primary mb-2">Upload Report</h1>
        <p className="text-muted text-sm mb-8">AI extracts report values automatically when possible.</p>

        <div className="grid grid-cols-5 gap-6">
          {/* Left: upload */}
          <div className="col-span-2 space-y-4">
            <div
              {...getRootProps()}
              className={`card border-dashed cursor-pointer text-center py-10 transition-colors ${isDragActive ? 'border-accent bg-accent/5' : 'hover:border-accent'}`}
            >
              <input {...getInputProps()} />
              <span className="text-3xl text-accent block mb-3">↑</span>
              {file ? (
                <div>
                  <p className="font-medium text-primary text-sm">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <>
                  <p className="font-medium text-primary text-sm">Drag & drop your report here</p>
                  <p className="text-xs text-accent mt-1">or browse files</p>
                  <p className="text-xs text-muted mt-2">PDF, JPG, PNG · Max 10MB</p>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Report Type</label>
                <input
                  className="input"
                  value={reportType}
                  onChange={e => setReportType(e.target.value)}
                  list="report-types-list"
                  placeholder="e.g. HbA1c, TSH, CBC..."
                />
                <datalist id="report-types-list">
                  {REPORT_TYPES.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Lab Name</label>
                <input className="input" value={labName} onChange={e => setLabName(e.target.value)} placeholder="e.g. Apollo Diagnostics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Test Date</label>
                <input className="input" type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-status-red bg-status-red/5 border border-status-red/20 rounded-md px-3 py-2">{error}</p>}

            <button onClick={handleExtract} disabled={!file || extracting} className="btn-primary w-full disabled:opacity-50">
              {extracting ? '⏳ Extracting report values...' : 'Extract Values →'}
            </button>
          </div>

          {/* Right: extracted values */}
          <div className="col-span-3 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-playfair font-semibold text-primary">Extracted Values</h2>
                {extracted.length > 0 && (
                  <p className="text-xs text-accent mt-0.5">AI extracted {extracted.length} values — review and edit before saving</p>
                )}
              </div>
              {(extracted.length > 0 || reportId) && (
                <button onClick={() => setAddingRow(true)} className="text-sm border border-accent text-accent px-3 py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors">
                  + Add Value
                </button>
              )}
            </div>

            {extracted.length === 0 && !reportId ? (
              <div className="text-center py-16 text-muted">
                <p className="text-sm">Upload a report and click "Extract Values" to begin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-muted">
                      <th className="text-left py-2 pr-4">Parameter</th>
                      <th className="text-left py-2 pr-4">Value</th>
                      <th className="text-left py-2 pr-4">Unit</th>
                      <th className="text-left py-2 pr-4">Ref Range</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extracted.map((v, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="py-2 pr-4 font-medium text-primary">{v.parameter_name}</td>
                        <td className="py-2 pr-4">
                          <input
                            className="w-20 border border-border rounded px-2 py-1 text-xs text-primary focus:border-accent outline-none"
                            value={v.value ?? ''}
                            onChange={e => updateValue(i, 'value', e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-4 text-muted">{v.unit}</td>
                        <td className="py-2 pr-4 text-muted text-xs">{v.ref_range_text}</td>
                        <td className="py-2">
                          <select
                            className="text-xs border border-border rounded px-1 py-1 outline-none"
                            value={v.status}
                            onChange={e => updateValue(i, 'status', e.target.value)}
                          >
                            {['Normal', 'High', 'Low', 'Critical High', 'Critical Low', 'Watch'].map(s => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}

                    {addingRow && (
                      <tr className="border-b border-border bg-background">
                        <td className="py-2 pr-2"><input className="input text-xs py-1" placeholder="Parameter" value={newRow.parameter_name} onChange={e => setNewRow(p => ({ ...p, parameter_name: e.target.value }))} /></td>
                        <td className="py-2 pr-2"><input className="w-20 border border-border rounded px-2 py-1 text-xs outline-none" placeholder="Value" value={newRow.value} onChange={e => setNewRow(p => ({ ...p, value: e.target.value }))} /></td>
                        <td className="py-2 pr-2"><input className="w-16 border border-border rounded px-2 py-1 text-xs outline-none" placeholder="Unit" value={newRow.unit} onChange={e => setNewRow(p => ({ ...p, unit: e.target.value }))} /></td>
                        <td className="py-2 pr-2"><input className="w-24 border border-border rounded px-2 py-1 text-xs outline-none" placeholder="e.g. 4.5–5.5" value={newRow.ref_range_text} onChange={e => setNewRow(p => ({ ...p, ref_range_text: e.target.value }))} /></td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <button onClick={addNewRow} className="text-xs bg-accent text-white px-2 py-1 rounded">Add</button>
                            <button onClick={() => setAddingRow(false)} className="text-xs text-muted hover:text-primary">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <button onClick={handleSave} disabled={saving} className="btn-primary w-full mt-6 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save & Analyse Report →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={null}>
      <UploadPageContent />
    </Suspense>
  )
}
