'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Sidebar from '@/components/layout/Sidebar'
import type { ParsedMedicine } from '@/lib/prescriptionParser'

const EMPTY_MEDICINE: ParsedMedicine = {
  medicine_name: '',
  strength: '',
  frequency: '',
  notes: '',
}

function generateMedicineLinks(medicineName: string) {
  const encoded = encodeURIComponent(medicineName)
  return {
    tata1mg: `https://www.1mg.com/search/all?name=${encoded}`,
    pharmeasy: `https://pharmeasy.in/search/all?name=${encoded}`,
    apollo: `https://www.apollopharmacy.in/search-medicines/${encoded}`,
  }
}

export default function PrescriptionPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [medicines, setMedicines] = useState<ParsedMedicine[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [addingRow, setAddingRow] = useState(false)
  const [newRow, setNewRow] = useState<ParsedMedicine>(EMPTY_MEDICINE)

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setFile(files[0])
      setExtractedText('')
      setMedicines([])
      setError('')
      setSuccess('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  async function handleScan() {
    if (!file) {
      setError('Please select a prescription image')
      return
    }

    setScanning(true)
    setError('')
    setSuccess('')

    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/prescription/scan', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Unable to read prescription. Please upload a clearer image.')
        return
      }

      setExtractedText(data.text || '')
      setMedicines((data.medicines || []).map((medicine: {
        name?: string
        medicine_name?: string
        strength?: string
        frequency?: string
        notes?: string
      }) => ({
        medicine_name: medicine.name || medicine.medicine_name || '',
        strength: medicine.strength || '',
        frequency: medicine.frequency || '',
        notes: medicine.notes || '',
      })))
    } catch {
      setError('Unable to read prescription. Please upload a clearer image.')
    } finally {
      setScanning(false)
    }
  }

  function updateMedicine(index: number, field: keyof ParsedMedicine, value: string) {
    setMedicines(prev => prev.map((medicine, i) => (
      i === index ? { ...medicine, [field]: value } : medicine
    )))
  }

  function deleteMedicine(index: number) {
    setMedicines(prev => prev.filter((_, i) => i !== index))
  }

  function addMedicine() {
    if (!newRow.medicine_name.trim()) return
    setMedicines(prev => [...prev, { ...newRow }])
    setNewRow(EMPTY_MEDICINE)
    setAddingRow(false)
  }

  async function handleSave() {
    if (medicines.length === 0) {
      setError('Add at least one medicine before saving')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/prescription/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save medicines')
        return
      }

      setSuccess('Medicines saved successfully')
    } catch {
      setError('Failed to save medicines')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-playfair text-3xl font-bold text-primary mb-2">Prescription Scanner</h1>
        <p className="text-muted text-sm mb-8">Upload a handwritten prescription image to extract medicines.</p>

        <div className="grid grid-cols-5 gap-6">
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
                  <p className="font-medium text-primary text-sm">Drag & drop your prescription here</p>
                  <p className="text-xs text-accent mt-1">or browse files</p>
                  <p className="text-xs text-muted mt-2">JPG, JPEG, PNG · Max 10MB</p>
                </>
              )}
            </div>

            {previewUrl && (
              <div className="card p-3">
                <img src={previewUrl} alt="Prescription preview" className="w-full rounded-md border border-border object-contain max-h-80" />
              </div>
            )}

            {error && (
              <p className="text-sm text-status-red bg-status-red/5 border border-status-red/20 rounded-md px-3 py-2">{error}</p>
            )}

            {success && (
              <p className="text-sm text-status-green bg-status-green/5 border border-status-green/20 rounded-md px-3 py-2">{success}</p>
            )}

            <button onClick={handleScan} disabled={!file || scanning} className="btn-primary w-full disabled:opacity-50">
              {scanning ? 'Scanning prescription...' : 'Scan Prescription'}
            </button>
          </div>

          <div className="col-span-3 space-y-6">
            <div className="card">
              <h2 className="font-playfair font-semibold text-primary mb-3">Extracted Prescription Text</h2>
              {extractedText ? (
                <pre className="text-sm text-primary whitespace-pre-wrap font-sans bg-surface-low border border-border rounded-md p-4 max-h-48 overflow-y-auto">
                  {extractedText}
                </pre>
              ) : (
                <p className="text-sm text-muted">Scan a prescription to view extracted text.</p>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-playfair font-semibold text-primary">Extracted Medicines</h2>
                {(extractedText || medicines.length > 0) && (
                  <button
                    onClick={() => setAddingRow(true)}
                    className="text-sm border border-accent text-accent px-3 py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors"
                  >
                    + Add Medicine
                  </button>
                )}
              </div>

              {medicines.length === 0 && !addingRow ? (
                <p className="text-sm text-muted">No medicines extracted yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs font-bold uppercase tracking-wide text-muted">
                        <th className="text-left py-2 pr-4">Medicine Name</th>
                        <th className="text-left py-2 pr-4">Strength</th>
                        <th className="text-left py-2 pr-4">Frequency</th>
                        <th className="text-left py-2 pr-4">Notes</th>
                        <th className="text-left py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((medicine, index) => {
                        const links = generateMedicineLinks(medicine.medicine_name)
                        return (
                        <>
                        <tr key={index} className="border-b border-border">
                          <td className="py-2 pr-4">
                            <input
                              className="w-full border border-border rounded px-2 py-1 text-xs text-primary focus:border-accent outline-none"
                              value={medicine.medicine_name}
                              onChange={e => updateMedicine(index, 'medicine_name', e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <input
                              className="w-24 border border-border rounded px-2 py-1 text-xs text-primary focus:border-accent outline-none"
                              value={medicine.strength}
                              onChange={e => updateMedicine(index, 'strength', e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <input
                              className="w-32 border border-border rounded px-2 py-1 text-xs text-primary focus:border-accent outline-none"
                              value={medicine.frequency}
                              onChange={e => updateMedicine(index, 'frequency', e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <input
                              className="w-full border border-border rounded px-2 py-1 text-xs text-primary focus:border-accent outline-none"
                              value={medicine.notes}
                              onChange={e => updateMedicine(index, 'notes', e.target.value)}
                            />
                          </td>
                          <td className="py-2">
                            <button onClick={() => deleteMedicine(index)} className="text-xs text-status-red hover:underline">
                              Delete
                            </button>
                          </td>
                        </tr>
                        {medicine.medicine_name.trim() && (
                          <tr className="border-b border-border last:border-0">
                            <td colSpan={5} className="pb-3">
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={links.tata1mg}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs border border-accent text-accent px-3 py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors"
                                >
                                  Buy on 1mg
                                </a>
                                <a
                                  href={links.pharmeasy}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs border border-accent text-accent px-3 py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors"
                                >
                                  Buy on PharmEasy
                                </a>
                                <a
                                  href={links.apollo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs border border-accent text-accent px-3 py-1.5 rounded-md hover:bg-accent hover:text-white transition-colors"
                                >
                                  Buy on Apollo
                                </a>
                              </div>
                            </td>
                          </tr>
                        )}
                        </>
                        )
                      })}

                      {addingRow && (
                        <tr className="border-b border-border bg-surface-low">
                          <td className="py-2 pr-2">
                            <input className="input text-xs py-1" placeholder="Medicine name" value={newRow.medicine_name} onChange={e => setNewRow(p => ({ ...p, medicine_name: e.target.value }))} />
                          </td>
                          <td className="py-2 pr-2">
                            <input className="w-24 border border-border rounded px-2 py-1 text-xs outline-none" placeholder="500mg" value={newRow.strength} onChange={e => setNewRow(p => ({ ...p, strength: e.target.value }))} />
                          </td>
                          <td className="py-2 pr-2">
                            <input className="w-32 border border-border rounded px-2 py-1 text-xs outline-none" placeholder="Twice daily" value={newRow.frequency} onChange={e => setNewRow(p => ({ ...p, frequency: e.target.value }))} />
                          </td>
                          <td className="py-2 pr-2">
                            <input className="w-full border border-border rounded px-2 py-1 text-xs outline-none" placeholder="After meals" value={newRow.notes} onChange={e => setNewRow(p => ({ ...p, notes: e.target.value }))} />
                          </td>
                          <td className="py-2">
                            <div className="flex gap-1">
                              <button onClick={addMedicine} className="text-xs bg-accent text-white px-2 py-1 rounded">Add</button>
                              <button onClick={() => setAddingRow(false)} className="text-xs text-muted hover:text-primary">Cancel</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <button onClick={handleSave} disabled={saving || medicines.length === 0} className="btn-primary w-full mt-6 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Medicines'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
