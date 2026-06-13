'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister() {
    if (!name || !email || !password) {
      setError('All fields are required')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-playfair text-2xl font-bold text-primary">MediMap</Link>
          <p className="text-muted text-sm mt-2">Create your account</p>
        </div>

        <div className="card">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Sathvik R." />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="Min 8 characters"
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
              />
            </div>

            {error && (
              <p className="text-sm text-status-red bg-status-red/5 border border-status-red/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button onClick={handleRegister} disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <p className="text-sm text-center text-muted mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
