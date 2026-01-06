'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Filter, ArrowLeft, Stethoscope } from 'lucide-react'
import { Badge, Button } from '@smartmed/ui'
import { useAuthContext } from '../../../../context/AuthContext'
import {
  appointmentService,
  Appointment,
} from '../../../../services/appointmentService'

export default function PatientAppointmentsPage() {
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
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'PATIENT') {
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
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
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
      COMPLETED: 'bg-muted text-foreground border-border',
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
  const cancellableStatuses = ['PENDING', ...acceptedStatuses]
  const pendingCount = appointments.filter(
    (apt) => apt.status === 'PENDING'
  ).length
  const upcomingCount = appointments.filter(
    (apt) =>
      acceptedStatuses.includes(apt.status) &&
      new Date(apt.dateTime) > new Date()
  ).length

  const handleCancel = async (appointment: Appointment) => {
    if (!cancellableStatuses.includes(appointment.status)) return
    const confirmed = window.confirm(
      'Cancel this appointment? This cannot be undone.'
    )
    if (!confirmed) return

    try {
      setCancelingId(appointment.id)
      setError(null)
      await appointmentService.cancelAppointment(appointment.id)
      await loadAppointments()
    } catch (err: any) {
      setError(
        err?.response?.data?.error || 'Failed to cancel appointment'
      )
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/patient')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  My Appointments
                </h1>
                <p className="text-sm text-muted-foreground">
                  Track requests, confirmations, and visit history
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/patient/search')}
              >
                Book appointment
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background min-h-[calc(100vh-4rem)]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {upcomingCount}
              </div>
              <div className="text-sm text-muted-foreground">Upcoming Accepted</div>
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
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'pending'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter('accepted')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'accepted'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Accepted
                </button>
                <button
                  onClick={() => setFilter('past')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'past'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Past
                </button>
              </div>
            </div>

            {/* Appointments List */}
            <div className="divide-y divide-border">
              {filteredAppointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No appointments found for this view
                  </p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="px-6 py-4 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-blue-100 rounded-full p-3">
                          <Stethoscope className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-semibold text-foreground">
                              Dr. {appointment.doctor?.firstName}{' '}
                              {appointment.doctor?.lastName}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-md border ${getStatusBadge(appointment.status)}`}
                            >
                              {appointment.status.replace('_', ' ')}
                            </span>
                            {appointment.status === 'PENDING' && (
                              <Badge variant="secondary" className="text-xs">
                                Awaiting approval
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
                            {appointment.doctor?.specialization && (
                              <span className="text-xs text-muted-foreground">
                                {appointment.doctor.specialization}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Reason:</span>{' '}
                            {appointment.reason}
                          </p>
                        </div>
                      </div>
                      {cancellableStatuses.includes(appointment.status) && (
                        <button
                          onClick={() => handleCancel(appointment)}
                          disabled={cancelingId === appointment.id}
                          className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {cancelingId === appointment.id
                            ? 'Cancelling...'
                            : 'Cancel'}
                        </button>
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
