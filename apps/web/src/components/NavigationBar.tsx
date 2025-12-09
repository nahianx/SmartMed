'use client'

import { useAuthContext } from '../context/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function NavigationBar() {
  const { user, logout } = useAuthContext()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
  }

  if (!user) return null

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-blue-600">
            SmartMed
          </Link>

          <div className="flex gap-6">
            {user.role === 'PATIENT' && (
              <>
                <Link
                  href="/profile?role=PATIENT"
                  className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                >
                  Profile
                </Link>
              </>
            )}

            {user.role === 'DOCTOR' && (
              <>
                <Link
                  href="/profile?role=DOCTOR"
                  className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                >
                  Profile
                </Link>
              </>
            )}

            {user.role === 'ADMIN' && (
              <>
                <Link
                  href="/dashboard/admin"
                  className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/admin/users"
                  className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                >
                  User Management
                </Link>
              </>
            )}

            <Link
              href={`/profile${user.role === 'DOCTOR' ? '?role=DOCTOR' : user.role === 'PATIENT' ? '?role=PATIENT' : ''}`}
              className="text-slate-600 hover:text-slate-900 text-sm font-medium"
            >
              Profile
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">{user.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
