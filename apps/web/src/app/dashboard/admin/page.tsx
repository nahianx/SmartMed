'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../../../context/AuthContext'
import { NavigationBar } from '../../../components/NavigationBar'
import { adminService, DashboardStats } from '../../../services/adminService'

export default function AdminDashboardPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'ADMIN') {
        router.replace('/')
      } else {
        loadStats()
      }
    }
  }, [user, loading, router])

  const loadStats = async () => {
    try {
      setError(null)
      const data = await adminService.getDashboardStats()
      setStats(data)
    } catch (err) {
      setError('Failed to load dashboard statistics')
      console.error(err)
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading...
      </main>
    )
  }

  return (
    <>
      <NavigationBar />
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-600">
              Welcome, {user.fullName}. Manage users, roles, and permissions.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatCard
                label="Total Users"
                value={stats.totalUsers}
                color="bg-blue-50"
              />
              <StatCard
                label="Admins"
                value={stats.admins}
                color="bg-purple-50"
              />
              <StatCard
                label="Doctors"
                value={stats.doctors}
                color="bg-green-50"
              />
              <StatCard
                label="Patients"
                value={stats.patients}
                color="bg-amber-50"
              />
              <StatCard
                label="Active Users"
                value={stats.activeUsers}
                color="bg-emerald-50"
              />
              <StatCard
                label="Inactive Users"
                value={stats.inactiveUsers}
                color="bg-red-50"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-slate-200 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Management Options</h2>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => router.push('/dashboard/admin/users')}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Manage All Users & Permissions
              </button>
              <button
                onClick={loadStats}
                className="px-6 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Refresh Statistics
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className={`${color} rounded-lg border border-slate-200 p-6`}>
      <p className="text-slate-600 text-sm font-medium mb-2">{label}</p>
      <p className="text-4xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
