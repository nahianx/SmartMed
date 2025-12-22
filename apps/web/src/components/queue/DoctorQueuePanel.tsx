'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, PhoneCall, RefreshCw } from 'lucide-react'
import { apiClient } from '@/services/apiClient'
import { socketService } from '@/services/socketService'
import { SOCKET_EVENTS } from '@/services/socketConstants'

interface QueueEntry {
  id: string
  serialNumber: string
  status: string
  position: number
  estimatedWaitTime?: number | null
  queueType: string
  patient?: {
    firstName?: string
    lastName?: string
  }
}

interface DoctorStatus {
  availabilityStatus?: string
  isAvailable?: boolean
  currentQueueEntryId?: string | null
}

const STATUS_OPTIONS = ['AVAILABLE', 'BUSY', 'BREAK', 'OFF_DUTY'] as const

export function DoctorQueuePanel({ doctorId }: { doctorId: string }) {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [doctorStatus, setDoctorStatus] = useState<DoctorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const inProgress = useMemo(
    () => queue.find((entry) => entry.status === 'IN_PROGRESS'),
    [queue]
  )
  const waiting = useMemo(
    () => queue.filter((entry) => entry.status === 'WAITING'),
    [queue]
  )

  const fetchState = async () => {
    try {
      const res = await apiClient.get(`/queue/doctor/${doctorId}`)
      setQueue(res.data.queue || [])
      setDoctorStatus(res.data.doctorStatus || null)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load queue state')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!doctorId) return
    setLoading(true)
    socketService.connect()
    socketService.joinDoctorQueue(doctorId, (response) => {
      if (response?.ok) {
        setQueue(response.queue || [])
        setDoctorStatus(response.doctorStatus || null)
        setLoading(false)
      } else {
        fetchState()
      }
    })

    const handleQueueUpdated = (payload: any) => {
      setQueue(payload.queue || [])
      if (payload.doctorStatus) {
        setDoctorStatus(payload.doctorStatus)
      }
    }

    const handleDoctorStatus = (status: DoctorStatus) => {
      setDoctorStatus(status)
    }

    const handlePatientCalled = () => {
      toast('Patient called. Queue updated.')
    }

    socketService.on(SOCKET_EVENTS.QUEUE_UPDATED, handleQueueUpdated)
    socketService.on(SOCKET_EVENTS.DOCTOR_STATUS_CHANGED, handleDoctorStatus)
    socketService.on(SOCKET_EVENTS.PATIENT_CALLED, handlePatientCalled)

    return () => {
      socketService.off(SOCKET_EVENTS.QUEUE_UPDATED, handleQueueUpdated)
      socketService.off(SOCKET_EVENTS.DOCTOR_STATUS_CHANGED, handleDoctorStatus)
      socketService.off(SOCKET_EVENTS.PATIENT_CALLED, handlePatientCalled)
      socketService.leaveDoctorQueue(doctorId)
    }
  }, [doctorId])

  const handleCallNext = async () => {
    try {
      setUpdating(true)
      await apiClient.post(`/queue/doctor/${doctorId}/call`)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to call next patient')
    } finally {
      setUpdating(false)
    }
  }

  const handleComplete = async (queueId: string) => {
    try {
      setUpdating(true)
      await apiClient.post(`/queue/${queueId}/complete`, {})
      toast.success('Consultation completed')
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to complete consultation')
    } finally {
      setUpdating(false)
    }
  }

  const handleNoShow = async (queueId: string) => {
    try {
      setUpdating(true)
      await apiClient.patch(`/queue/${queueId}/status`, { status: 'NO_SHOW' })
      toast('Marked as no-show')
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    try {
      setUpdating(true)
      await apiClient.patch(`/doctor/${doctorId}/status`, {
        status,
        isAvailable: status === 'AVAILABLE',
      })
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        Loading queue...
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Live Queue</h2>
          <p className="text-sm text-slate-600">
            Manage walk-ins and checked-in appointments in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={doctorStatus?.availabilityStatus || 'OFF_DUTY'}
            onChange={(event) => handleStatusChange(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            disabled={updating}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={fetchState}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {inProgress ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-700">
              In Progress
            </p>
            <p className="text-lg font-semibold text-emerald-900">
              {inProgress.patient?.firstName} {inProgress.patient?.lastName}
            </p>
            <p className="text-sm text-emerald-700">{inProgress.serialNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleComplete(inProgress.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              disabled={updating}
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </button>
            <button
              type="button"
              onClick={() => handleNoShow(inProgress.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              disabled={updating}
            >
              <AlertTriangle className="h-4 w-4" />
              No-show
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-600">
          No patient currently in progress.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Waiting ({waiting.length})</h3>
        <button
          type="button"
          onClick={handleCallNext}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          disabled={updating || waiting.length === 0 || Boolean(inProgress)}
        >
          <PhoneCall className="h-4 w-4" />
          Call next
        </button>
      </div>

      {waiting.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          No patients in the waiting queue yet.
        </div>
      ) : (
        <div className="space-y-2">
          {waiting.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {entry.patient?.firstName} {entry.patient?.lastName}
                </p>
                <p className="text-sm text-slate-500">
                  {entry.serialNumber} · {entry.queueType.replace('_', ' ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-700">
                  Position {entry.position}
                </p>
                <p className="text-xs text-slate-500">
                  Est. wait {entry.estimatedWaitTime ?? '--'} min
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
