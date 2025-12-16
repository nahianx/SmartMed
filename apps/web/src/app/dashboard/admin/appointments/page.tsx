'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, Filter, Plus } from 'lucide-react'
import { Badge, Button } from '@smartmed/ui'
import { useAuthContext } from '../../../../context/AuthContext'
import {
  appointmentService,
  Appointment,
} from '../../../../services/appointmentService'
import CreateAppointmentModal from '../../../../components/CreateAppointmentModal'

export default function AdminAppointmentsPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<
    'all' | 'scheduled' | 'completed' | 'no_show'
  >('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'ADMIN') {
        router.replace('/')
      } else {
        loadAppointments()
      }
    }
  }, [user, loading, router])

  const loadAppointments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await appointmentService.getAllAppointments()
      setAppointments(data)
      setFilteredAppointments(data)
    } catch (err) {
      setError('Failed to load appointments')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (filter === 'all') {
      setFilteredAppointments(appointments)
    } else if (filter === 'scheduled') {
      setFilteredAppointments(
        appointments.filter(
          (apt) => apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED'
        )
      )
    } else if (filter === 'completed') {
      setFilteredAppointments(
        appointments.filter((apt) => apt.status === 'COMPLETED')
      )
    } else if (filter === 'no_show') {
      setFilteredAppointments(
        appointments.filter((apt) => apt.status === 'NO_SHOW')
      )
    }
  }, [filter, appointments])

  if (loading || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="text-gray-600">Loading...</div>
      </main>
    )
  }

  if (!user) return null

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      SCHEDULED: 'bg-blue-100 text-blue-700 border-blue-200',
      CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
      COMPLETED: 'bg-gray-100 text-gray-700 border-gray-200',
      CANCELLED: 'bg-red-100 text-red-700 border-red-200',
      NO_SHOW: 'bg-orange-100 text-orange-700 border-orange-200',
    }
    return (
      statusStyles[status as keyof typeof statusStyles] ||
      'bg-gray-100 text-gray-700'
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const upcomingCount = appointments.filter(
    (apt) =>
      (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') &&
      new Date(apt.dateTime) > new Date()
  ).length

  const todayCount = appointments.filter((apt) => {
    const aptDate = new Date(apt.dateTime)
    const today = new Date()
    return (
      aptDate.toDateString() === today.toDateString() &&
      (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED')
    )
  }).length

  const completedCount = appointments.filter(
    (apt) => apt.status === 'COMPLETED'
  ).length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Appointment Management</h1>
              <Badge variant="outline" className="text-xs">
                Administrator
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/admin')}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 min-h-[calc(100vh-4rem)]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Appointment Management
            </h2>
            <p className="text-gray-600">
              View and manage all system appointments
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-red-600 mb-1">
                {appointments.length}
              </div>
              <div className="text-sm text-slate-600">Total Appointments</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {upcomingCount}
              </div>
              <div className="text-sm text-slate-600">Upcoming</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {todayCount}
              </div>
              <div className="text-sm text-slate-600">Today</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="text-3xl font-bold text-gray-600 mb-1">
                {completedCount}
              </div>
              <div className="text-sm text-slate-600">Completed</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
            <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-200">
              <Filter className="h-5 w-5 text-slate-600" />
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-red-100 text-red-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Appointments
                </button>
                <button
                  onClick={() => setFilter('scheduled')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'scheduled'
                      ? 'bg-red-100 text-red-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Scheduled
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'completed'
                      ? 'bg-red-100 text-red-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilter('no_show')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'no_show'
                      ? 'bg-red-100 text-red-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  No Show
                </button>
              </div>
            </div>

            {/* Appointments List */}
            <div className="divide-y divide-slate-200">
              {filteredAppointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No appointments found</p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    onClick={() =>
                      router.push(
                        `/dashboard/admin/appointments/${appointment.id}`
                      )
                    }
                    className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-red-100 rounded-full p-3">
                          <User className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-slate-900">
                              {appointment.patient?.firstName}{' '}
                              {appointment.patient?.lastName}
                            </h3>
                            <span className="text-sm text-slate-600">
                              → Dr. {appointment.doctor?.firstName}{' '}
                              {appointment.doctor?.lastName}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusBadge(appointment.status)}`}
                            >
                              {appointment.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(appointment.dateTime)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(appointment.dateTime)} (
                                {appointment.duration} min)
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            <span className="font-medium">Reason:</span>{' '}
                            {appointment.reason}
                          </p>
                        </div>
                      </div>
                      <div className="text-red-600 font-medium text-sm">
                        View Details →
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadAppointments}
      />
    </div>
  )
}
