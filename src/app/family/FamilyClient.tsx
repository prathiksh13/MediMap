'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Copy, Check, UserPlus, Crown, LogOut, X, CheckCircle } from 'lucide-react'

interface MemberProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  gender: string | null
  date_of_birth: string | null
  blood_group: string | null
  city: string | null
}

interface FamilyMemberRow {
  id: string
  user_id: string
  status: string
  role: string
  profile?: MemberProfile
}

interface FamilyData {
  family: { id: string; name: string; code: string; head_id: string } | null
  isHead?: boolean
  members?: FamilyMemberRow[]
  pendingRequests?: FamilyMemberRow[]
  pendingRequest?: { code: string } | null
}

function age(dob: string | null) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function FamilyClient({ currentUserId }: { currentUserId: string }) {
  const [data, setData] = useState<FamilyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form fields
  const [familyName, setFamilyName] = useState('')
  const [joinCode, setJoinCode] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/family')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load family information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      const res = await fetch('/api/family/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create family')
      setSuccess('Family created! Share the code with your family members.')
      setFamilyName('')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      const res = await fetch('/api/family/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send join request')
      setSuccess(`Request sent to join "${json.familyName}". Waiting for the family head to accept.`)
      setJoinCode('')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRespond(memberId: string, action: 'accept' | 'reject') {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/family/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to respond')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave(memberId?: string) {
    const confirmMsg = memberId
      ? 'Remove this member from the family?'
      : data?.isHead
        ? 'You are the head. Leaving will delete the family group for everyone. Continue?'
        : 'Leave this family group?'
    if (!confirm(confirmMsg)) return

    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/family/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberId ? { memberId } : {}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to leave family')
      await load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return <div className="card text-center py-12 text-muted text-sm">Loading family information...</div>
  }

  // ── No family yet ───────────────────────────────────────────
  if (!data?.family) {
    return (
      <div className="space-y-6 max-w-2xl">
        {error && <div className="card border-status-red/30 bg-status-red/5 text-status-red text-sm py-3">{error}</div>}
        {success && <div className="card border-status-green/30 bg-status-green/5 text-status-green text-sm py-3">{success}</div>}

        {data?.pendingRequest && (
          <div className="card border-status-amber/30 bg-status-amber/5">
            <p className="text-sm text-primary font-medium">Your request to join a family is pending approval.</p>
            <p className="text-xs text-muted mt-1">The family head needs to accept your request before you can view shared records.</p>
            <button onClick={() => handleLeave()} disabled={busy} className="text-xs text-status-red hover:underline mt-3 font-medium">
              Cancel request
            </button>
          </div>
        )}

        {!data?.pendingRequest && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <Crown size={18} className="text-accent" />
              </div>
              <h2 className="font-playfair text-lg font-bold text-primary mb-1">Create a Family</h2>
              <p className="text-xs text-muted mb-4">Become the head of a family group and invite others using a unique code.</p>
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  type="text"
                  placeholder="e.g. The Sharma Family"
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  required
                />
                <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
                  Create Family
                </button>
              </form>
            </div>

            <div className="card">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <UserPlus size={18} className="text-accent" />
              </div>
              <h2 className="font-playfair text-lg font-bold text-primary mb-1">Join a Family</h2>
              <p className="text-xs text-muted mb-4">Enter the family code shared by your family head to request access.</p>
              <form onSubmit={handleJoin} className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter family code"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm tracking-widest font-medium focus:outline-none focus:border-accent uppercase"
                  maxLength={6}
                  required
                />
                <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
                  Request to Join
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── In a family ─────────────────────────────────────────────
  const { family, isHead, members = [], pendingRequests = [] } = data

  return (
    <div className="space-y-6">
      {error && <div className="card border-status-red/30 bg-status-red/5 text-status-red text-sm py-3 max-w-2xl">{error}</div>}
      {success && <div className="card border-status-green/30 bg-status-green/5 text-status-green text-sm py-3 max-w-2xl">{success}</div>}

      {/* Family header */}
      <div className="card flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white">
            <Users size={20} />
          </div>
          <div>
            <h2 className="font-playfair text-xl font-bold text-primary">{family.name}</h2>
            <p className="text-xs text-muted">{members.length} member{members.length !== 1 ? 's' : ''}{isHead ? ' · You are the head' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isHead && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Family Code</span>
              <code className="bg-surface-low border border-border rounded-md px-3 py-1.5 text-sm font-mono font-bold tracking-widest text-accent">{family.code}</code>
              <button onClick={() => copyCode(family.code)} className="text-muted hover:text-accent transition-colors" title="Copy code">
                {copied ? <Check size={16} className="text-status-green" /> : <Copy size={16} />}
              </button>
            </div>
          )}
          <button onClick={() => handleLeave()} disabled={busy} className="flex items-center gap-1.5 text-xs text-status-red hover:underline font-medium">
            <LogOut size={14} />
            {isHead ? 'Delete Family' : 'Leave Family'}
          </button>
        </div>
      </div>

      {/* Pending requests (head only) */}
      {isHead && pendingRequests.length > 0 && (
        <div className="card">
          <h3 className="font-playfair text-base font-bold text-primary mb-1">Join Requests</h3>
          <p className="text-xs text-muted mb-4">People waiting to join your family group.</p>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-playfair text-sm">
                    {req.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <p className="text-sm font-medium text-primary">{req.profile?.full_name || 'Unknown user'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespond(req.id, 'accept')}
                    disabled={busy}
                    className="flex items-center gap-1 text-xs bg-status-green/10 text-status-green border border-status-green/20 px-3 py-1.5 rounded-md hover:bg-status-green/20 transition-colors font-medium"
                  >
                    <CheckCircle size={14} /> Accept
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'reject')}
                    disabled={busy}
                    className="flex items-center gap-1 text-xs bg-status-red/10 text-status-red border border-status-red/20 px-3 py-1.5 rounded-md hover:bg-status-red/20 transition-colors font-medium"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="card">
        <h3 className="font-playfair text-base font-bold text-primary mb-1">Family Members</h3>
        <p className="text-xs text-muted mb-4">View health reports and records for everyone in your family.</p>
        <div className="space-y-3">
          {members.map(member => {
            const isSelf = member.user_id === currentUserId
            const memberAge = age(member.profile?.date_of_birth || null)
            return (
              <div key={member.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3 hover:border-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-playfair text-sm">
                    {member.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary flex items-center gap-2">
                      {member.profile?.full_name || 'Unknown'}
                      {member.role === 'head' && <Crown size={12} className="text-accent" />}
                      {isSelf && <span className="text-xs text-muted">(You)</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {[memberAge ? `${memberAge} yrs` : null, member.profile?.gender, member.profile?.blood_group, member.profile?.city].filter(Boolean).join(' · ') || 'No profile details yet'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Link href={`/family/member/${member.user_id}`} className="text-sm text-accent hover:underline font-medium">
                    View Records →
                  </Link>
                  {isHead && !isSelf && (
                    <button onClick={() => handleLeave(member.id)} disabled={busy} className="text-xs text-status-red hover:underline font-medium">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
