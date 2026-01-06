'use client'

import { useEffect, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/services/apiClient'
import { socketService } from '@/services/socketService'
import { SOCKET_EVENTS } from '@/services/socketConstants'

interface DoctorAvailability {
  id: string
  firstName?: string
  lastName?: string
  specialization?: string
  availabilityStatus?: string
  isAvailable?: boolean
  queueLength?: number
  estimatedWaitTime?: number
}

export function DoctorAvailabilityList() {
  const [doctors, setDoctors] = useState<DoctorAvailability[]>([])
  const [loading, setLoading] = useState(true)

  const loadAvailable = async () => {
    try {
      const res = await apiClient.get('/doctor/available')
      setDoctors(res.data.doctors || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAvailable()
    socketService.connect()

    const handleStatusChange = (payload: DoctorAvailability) => {
      if (!payload?.id) return
      setDoctors((prev) =>
        prev.map((doc) =>
          doc.id === payload.id
            ? {
                ...doc,
                availabilityStatus: payload.availabilityStatus,
                isAvailable: payload.isAvailable,
              }
            : doc
        )
      )
    }

    socketService.on(SOCKET_EVENTS.DOCTOR_STATUS_PUBLIC, handleStatusChange)
    return () => {
      socketService.off(SOCKET_EVENTS.DOCTOR_STATUS_PUBLIC, handleStatusChange)
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        Loading available doctors...
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Available doctors</h2>
          <p className="text-sm text-muted-foreground">
            Live availability and queue estimates.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAvailable}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No doctors are available right now.
        </div>
      ) : (
        <div className="space-y-2">
          {doctors.slice(0, 6).map((doctor) => (
            <div
              key={doctor.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3"
            >
              <div>
                <p className="font-semibold text-foreground">
                  Dr. {doctor.firstName} {doctor.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {doctor.specialization || 'General'}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="flex items-center justify-end gap-1">
                  <Activity className="h-4 w-4" />
                  <span>{doctor.availabilityStatus || 'UNKNOWN'}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Queue {doctor.queueLength ?? 0} · Est {doctor.estimatedWaitTime ?? '--'} min
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
