'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Activity, User, LogOut, Pill, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'My Reports', icon: FileText },
  { href: '/prescription', label: 'Prescription Scanner', icon: Pill },
  { href: '/health-overview', label: 'Health Overview', icon: Activity },
  { href: '/family', label: 'Family', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export default function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="w-60 min-h-screen bg-white/60 backdrop-blur-md border-r border-white/40 flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-border">
        <span className="font-playfair text-xl font-bold text-primary">MediMap</span>
      </div>

      {userName && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-playfair text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-primary">{userName}</p>
              <Link href="/profile" className="text-xs text-accent hover:underline">View Profile</Link>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent/10 text-accent border-l-2 border-accent'
                  : 'text-muted hover:text-primary hover:bg-surface-low'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted hover:text-status-red hover:bg-status-red/5 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
