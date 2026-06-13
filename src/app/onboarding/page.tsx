'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CONDITIONS = [
  'Diabetes Type 1', 'Diabetes Type 2', 'Hypertension', 'Hypothyroidism',
  'Hyperthyroidism', 'Cardiac Disease', 'Asthma', 'Anaemia',
  'High Cholesterol', 'PCOD/PCOS', 'Kidney Disease', 'None of the above',
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', gender: '', height_cm: '', weight_kg: '', blood_group: '',
    city: '', occupation: '', emergency_contact: '',
    conditions: [] as string[],
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleCondition(condition: string) {
    setForm(prev => {
      const has = prev.conditions.includes(condition)
      return {
        ...prev,
        conditions: has
          ? prev.conditions.filter(c => c !== condition)
          : [...prev.conditions, condition],
      }
    })
  }

  async function handleFinish() {
    setLoading(true)
    setError('')

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('No user session:', userError)
      router.push('/login')
      return
    }

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: form.full_name,
      date_of_birth: form.date_of_birth || null,
      gender: (form.gender as 'Male' | 'Female' | 'Other') || null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      blood_group: form.blood_group || null,
      city: form.city || null,
      occupation: form.occupation || null,
      emergency_contact: form.emergency_contact || null,
      onboarding_complete: true,
    })

    if (upsertError) {
      console.error('Profile upsert error:', upsertError)
      setError('Failed to save profile: ' + upsertError.message)
      setLoading(false)
      return
    }

    if (form.conditions.length > 0 && !form.conditions.includes('None of the above')) {
      const { error: condError } = await supabase.from('user_conditions').insert(
        form.conditions.map(c => ({ user_id: user.id, condition_name: c }))
      )
      if (condError) console.error('Conditions insert error:', condError)
    }

    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="font-playfair text-2xl font-bold text-primary">MediMap</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {['Basic Info', 'Health Profile', 'Conditions'].map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i + 1 < step ? 'bg-primary text-white' :
                i + 1 === step ? 'bg-accent text-white' :
                'bg-border text-muted'
              }`}>{i + 1}</div>
              <div className={`h-1 w-full rounded-full ${i + 1 <= step ? (i + 1 < step ? 'bg-primary' : 'bg-accent') : 'bg-border'}`} />
              <span className="text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>

        <div className="card">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-playfair text-2xl font-bold text-primary">Let's get to know you</h2>
              <p className="text-sm text-muted">This helps us personalise your health insights</p>

              <div><label className="block text-sm font-medium text-primary mb-1.5">Full Name</label>
                <input className="input" value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Your full name" /></div>

              <div><label className="block text-sm font-medium text-primary mb-1.5">Date of Birth</label>
                <input className="input" type="date" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} /></div>

              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Gender</label>
                <div className="flex gap-2">
                  {['Male', 'Female', 'Other'].map(g => (
                    <button key={g} onClick={() => update('gender', g)}
                      className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${form.gender === g ? 'bg-accent border-accent text-white' : 'border-border text-primary hover:border-primary'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-primary mb-1.5">Height</label>
                  <div className="relative"><input className="input pr-10" type="number" value={form.height_cm} onChange={e => update('height_cm', e.target.value)} placeholder="170" />
                    <span className="absolute right-3 top-2.5 text-sm text-muted">cm</span></div></div>
                <div><label className="block text-sm font-medium text-primary mb-1.5">Weight</label>
                  <div className="relative"><input className="input pr-10" type="number" value={form.weight_kg} onChange={e => update('weight_kg', e.target.value)} placeholder="65" />
                    <span className="absolute right-3 top-2.5 text-sm text-muted">kg</span></div></div>
              </div>

              <div><label className="block text-sm font-medium text-primary mb-1.5">Blood Group</label>
                <select className="input" value={form.blood_group} onChange={e => update('blood_group', e.target.value)}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                </select></div>

              <button onClick={() => setStep(2)} className="btn-primary w-full">Continue →</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-playfair text-2xl font-bold text-primary">A bit more about you</h2>

              <div><label className="block text-sm font-medium text-primary mb-1.5">City</label>
                <input className="input" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Hyderabad" /></div>

              <div><label className="block text-sm font-medium text-primary mb-1.5">Occupation</label>
                <input className="input" value={form.occupation} onChange={e => update('occupation', e.target.value)} placeholder="Student / Engineer / etc." /></div>

              <div><label className="block text-sm font-medium text-primary mb-1.5">Emergency Contact Number</label>
                <input className="input" value={form.emergency_contact} onChange={e => update('emergency_contact', e.target.value)} placeholder="+91 98765 43210" /></div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-outline flex-1">← Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-playfair text-2xl font-bold text-primary">Any existing conditions?</h2>
              <p className="text-sm text-muted">Select all that apply. This helps us recommend the right tests.</p>

              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(c => (
                  <button key={c} onClick={() => toggleCondition(c)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.conditions.includes(c) ? 'bg-primary text-white border-primary' : 'bg-surface text-primary border-border hover:border-primary'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-status-red bg-status-red/5 border border-status-red/20 rounded-md px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="btn-outline flex-1">← Back</button>
                <button onClick={handleFinish} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                  {loading ? 'Saving...' : 'Finish Setup →'}
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted text-center mt-4">Your data is encrypted and never shared with third parties.</p>
        </div>
      </div>
    </div>
  )
}
