'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, User, ArrowLeft, Filter } from 'lucide-react'
import { useAuthContext } from '../../../../context/AuthContext'
import {
  appointmentService,
  Appointment,
} from '../../../../services/appointmentService'

export default function AppointmentsPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'accepted' | 'past'
  >('all')
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(
    null
  )

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'DOCTOR') {
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

  const handleDecision = async (
    appointmentId: string,
    decision: 'accept' | 'reject'
  ) => {
    try {
      setDecisionLoadingId(appointmentId)
      if (decision === 'accept') {
        await appointmentService.acceptAppointment(appointmentId)
      } else {
        await appointmentService.rejectAppointment(appointmentId)
      }
      await loadAppointments()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update appointment')
    } finally {
      setDecisionLoadingId(null)
    }
  }

  useEffect(() => {
    const acceptedStatuses = ['ACCEPTED', 'CONFIRMED', 'SCHEDULED']
    if (filter === 'all') {
      setFilteredAppointments(appointments)
    } else if (filter === 'pending') {
      setFilteredAppointments(
        appointments.filter((apt) => apt.status === 'PENDING')
      )
    } else if (filter === 'accepted') {
      setFilteredAppointments(
        appointments.filter((apt) => acceptedStatuses.includes(apt.status))
      )
    } else if (filter === 'past') {
      setFilteredAppointments(
        appointments.filter((apt) =>
          ['COMPLETED', 'NO_SHOW', 'CANCELLED', 'REJECTED'].includes(apt.status)
        )
      )
    }
  }, [filter, appointments])

  if (loading || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-gray-600">Loading...</div>
      </main>
    )
  }

  if (!user) return null

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
      ACCEPTED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-rose-100 text-rose-700 border-rose-200',
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

  const acceptedStatuses = ['ACCEPTED', 'CONFIRMED', 'SCHEDULED']
  const pendingCount = appointments.filter(
    (apt) => apt.status === 'PENDING'
  ).length
  const upcomingCount = appointments.filter(
    (apt) =>
      acceptedStatuses.includes(apt.status) &&
      new Date(apt.dateTime) > new Date()
  ).length

  const todayCount = appointments.filter((apt) => {
    const aptDate = new Date(apt.dateTime)
    const today = new Date()
    return (
      aptDate.toDateString() === today.toDateString() &&
      acceptedStatuses.includes(apt.status)
    )
  }).length

  const completedCount = appointments.filter(
    (apt) => apt.status === 'COMPLETED'
  ).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/doctor')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Appointments
                </h1>
                <p className="text-sm text-muted-foreground">
                  View and manage patient appointments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 via-background to-cyan-50 dark:from-blue-950/20 dark:via-background dark:to-cyan-950/20 min-h-[calc(100vh-4rem)]">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {appointments.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Appointments</div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
              <div className="text-3xl font-bold text-amber-600 mb-1">
                {pendingCount}
              </div>
              <div className="text-sm text-muted-foreground">Pending Requests</div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {upcomingCount}
              </div>
              <div className="text-sm text-muted-foreground">Upcoming Accepted</div>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
              <div className="text-3xl font-bold text-muted-foreground mb-1">
                {completedCount}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-card rounded-lg border border-border shadow-sm mb-6">
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Appointments
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'pending'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter('accepted')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'accepted'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Accepted
                </button>
                <button
                  onClick={() => setFilter('past')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'past'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Past
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
                        `/dashboard/doctor/appointments/${appointment.id}`
                      )
                    }
                    className="px-6 py-4 hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-blue-100 dark:bg-blue-950/50 rounded-full p-3">
                          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-foreground">
                              {appointment.patient?.firstName}{' '}
                              {appointment.patient?.lastName}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusBadge(appointment.status)}`}
                            >
                              {appointment.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Reason:</span>{' '}
                            {appointment.reason}
                          </p>
                        </div>
                      </div>
                      {appointment.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDecision(appointment.id, 'accept')
                            }}
                            disabled={decisionLoadingId === appointment.id}
                            className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDecision(appointment.id, 'reject')
                            }}
                            disabled={decisionLoadingId === appointment.id}
                            className="rounded-md border border-rose-200 dark:border-rose-800 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                          View Details
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
