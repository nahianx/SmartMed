'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, RefreshCw, Calendar } from 'lucide-react'
import { Badge, Button } from '@smartmed/ui'
import { useAuthContext } from '../../../context/AuthContext'
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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-gray-600">Loading...</div>
      </main>
    )
  }

  const managementCards = [
    {
      icon: Users,
      title: 'Manage Users',
      description: 'View and manage all users, roles, and permissions',
      color: 'red' as const,
      action: () => router.push('/dashboard/admin/users'),
    },
    {
      icon: Calendar,
      title: 'Manage Appointments',
      description:
        'View all appointments, patient context, and update statuses',
      color: 'blue' as const,
      action: () => router.push('/dashboard/admin/appointments'),
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <Badge variant="outline" className="text-xs">
                Administrator
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/profile?role=ADMIN')}
            >
              Profile Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 min-h-[calc(100vh-4rem)]">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-gray-900 mb-2">Welcome, {user.fullName}!</h2>
            <p className="text-gray-600">
              Manage users, roles, and system settings
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
            {managementCards.map((card, index) => (
              <DashboardCard key={index} {...card} />
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-gray-900 text-lg font-semibold">
              System Statistics
            </h3>
            <button
              onClick={loadStats}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-gray-600 mb-1">Total Users</p>
                <p className="text-gray-900 text-2xl font-semibold">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-gray-600 mb-1">Admins</p>
                <p className="text-gray-900 text-2xl font-semibold">
                  {stats.admins}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-gray-600 mb-1">Doctors</p>
                <p className="text-gray-900 text-2xl font-semibold">
                  {stats.doctors}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-gray-600 mb-1">Patients</p>
                <p className="text-gray-900 text-2xl font-semibold">
                  {stats.patients}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-gray-600 mb-1">Active Users</p>
                <p className="text-gray-900 text-2xl font-semibold">
                  {stats.activeUsers}
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                <p className="text-gray-600 mb-1">Inactive</p>
                <p className="text-gray-900 text-2xl font-semibold">
                  {stats.inactiveUsers}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 bg-white rounded-xl shadow-md border border-gray-100 animate-pulse"
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

interface DashboardCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  color: 'red' | 'orange' | 'purple' | 'blue'
  action: () => void
}

function DashboardCard({
  icon: Icon,
  title,
  description,
  color,
  action,
}: DashboardCardProps) {
  const colorClasses = {
    red: 'bg-red-100 text-red-600 group-hover:bg-red-600',
    orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-600',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600',
    blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600',
  }

  const borderClasses = {
    red: 'hover:border-red-500',
    orange: 'hover:border-orange-500',
    purple: 'hover:border-purple-500',
    blue: 'hover:border-blue-500',
  }

  return (
    <button
      onClick={action}
      className={`group w-full text-left bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent ${borderClasses[color]} hover:scale-105`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all ${colorClasses[color]}`}
        >
          <Icon className="w-7 h-7 group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1">
          <h3 className="text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  )
}
