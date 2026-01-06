'use client'

import { useAuthContext } from '../context/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from './theme/ThemeToggle'

export function NavigationBar() {
  const { user, logout } = useAuthContext()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
  }

  if (!user) return null

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-primary">
            SmartMed
          </Link>

          <div className="flex gap-6">
            {user.role === 'PATIENT' && (
              <>
                <Link
                  href="/profile?role=PATIENT"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  Profile
                </Link>
              </>
            )}

            {user.role === 'DOCTOR' && (
              <>
                <Link
                  href="/profile?role=DOCTOR"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  Profile
                </Link>
              </>
            )}

            {user.role === 'ADMIN' && (
              <>
                <Link
                  href="/profile?role=ADMIN"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  Profile
                </Link>
                <Link
                  href="/dashboard/admin"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/admin/users"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  User Management
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle iconOnly />
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-destructive rounded-lg hover:bg-destructive/90 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
