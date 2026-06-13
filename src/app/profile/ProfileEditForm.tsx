'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export default function ProfileEditForm({ profile, bmi, bmiLabel }: { profile: Profile | null, bmi: string | null, bmiLabel: string | null }) {
  const [editing, setEditing] = useState<'personal' | 'health' | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
    blood_group: profile?.blood_group || '',
    city: profile?.city || '',
    occupation: profile?.occupation || '',
    emergency_contact: profile?.emergency_contact || '',
    height_cm: profile?.height_cm?.toString() || '',
    weight_kg: profile?.weight_kg?.toString() || '',
  })

  const supabase = createClient()

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function save(section: 'personal' | 'health') {
    setSaving(true)
    const payload: any = {}

    if (section === 'personal') {
      Object.assign(payload, {
        full_name: form.full_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        city: form.city || null,
        occupation: form.occupation || null,
        emergency_contact: form.emergency_contact || null,
      })
    } else {
      Object.assign(payload, {
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update(payload).eq('id', user.id)

    setSaving(false)
    setEditing(null)
  }

  const bmiColor = bmiLabel === 'Normal' ? 'text-status-green' : bmiLabel === 'Underweight' ? 'text-status-amber' : 'text-status-red'

  return (
    <>
      {/* Personal Info */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-playfair font-semibold text-primary">Personal Information</h2>
          {editing !== 'personal'
            ? <button onClick={() => setEditing('personal')} className="text-sm text-accent hover:underline">Edit</button>
            : <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="text-sm text-muted hover:text-primary">Cancel</button>
                <button onClick={() => save('personal')} disabled={saving} className="btn-primary text-sm py-1.5 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
          }
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Full Name', field: 'full_name', type: 'text' },
            { label: 'Date of Birth', field: 'date_of_birth', type: 'date' },
            { label: 'City', field: 'city', type: 'text' },
            { label: 'Occupation', field: 'occupation', type: 'text' },
            { label: 'Emergency Contact', field: 'emergency_contact', type: 'text' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <p className="text-xs text-muted mb-0.5 uppercase tracking-wide">{label}</p>
              {editing === 'personal'
                ? <input className="input text-sm" type={type} value={(form as any)[field]} onChange={e => update(field, e.target.value)} />
                : <p className="text-sm font-medium text-primary">{(form as any)[field] || '—'}</p>
              }
            </div>
          ))}

          <div>
            <p className="text-xs text-muted mb-0.5 uppercase tracking-wide">Gender</p>
            {editing === 'personal'
              ? <select className="input text-sm" value={form.gender} onChange={e => update('gender', e.target.value)}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              : <p className="text-sm font-medium text-primary">{form.gender || '—'}</p>
            }
          </div>

          <div>
            <p className="text-xs text-muted mb-0.5 uppercase tracking-wide">Blood Group</p>
            {editing === 'personal'
              ? <select className="input text-sm" value={form.blood_group} onChange={e => update('blood_group', e.target.value)}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                </select>
              : <p className="text-sm font-medium text-primary">{form.blood_group || '—'}</p>
            }
          </div>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-playfair font-semibold text-primary">Health Metrics</h2>
          {editing !== 'health'
            ? <button onClick={() => setEditing('health')} className="text-sm text-accent hover:underline">Edit</button>
            : <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="text-sm text-muted hover:text-primary">Cancel</button>
                <button onClick={() => save('health')} disabled={saving} className="btn-primary text-sm py-1.5 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
          }
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { label: 'Height', field: 'height_cm', suffix: 'cm' },
            { label: 'Weight', field: 'weight_kg', suffix: 'kg' },
          ].map(({ label, field, suffix }) => (
            <div key={field}>
              <p className="text-xs text-muted mb-0.5 uppercase tracking-wide">{label}</p>
              {editing === 'health'
                ? <div className="relative"><input className="input text-sm pr-10" type="number" value={(form as any)[field]} onChange={e => update(field, e.target.value)} />
                    <span className="absolute right-3 top-2.5 text-xs text-muted">{suffix}</span></div>
                : <p className="text-sm font-medium text-primary">{(form as any)[field] ? `${(form as any)[field]} ${suffix}` : '—'}</p>
              }
            </div>
          ))}
          <div>
            <p className="text-xs text-muted mb-0.5 uppercase tracking-wide">BMI</p>
            <p className="text-sm font-medium text-primary">
              {bmi ? <><span className={bmiColor}>{bmi}</span> <span className="text-xs text-muted">({bmiLabel})</span></> : '—'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-accent/5 border border-accent/20 rounded-md">
          <p className="text-xs text-accent">Your BMI and age are used to personalise your health insights and risk assessments.</p>
        </div>
      </div>
    </>
  )
}
