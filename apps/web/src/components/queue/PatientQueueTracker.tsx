'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BellRing, Clock, XCircle } from 'lucide-react'
import { apiClient } from '@/services/apiClient'
import { socketService } from '@/services/socketService'
import { SOCKET_EVENTS } from '@/services/socketConstants'

interface QueueEntry {
  id: string
  doctorId: string
  status: string
  position: number
  estimatedWaitTime?: number | null
  serialNumber: string
  queueType: string
  scheduledTime?: string | null
  doctor?: {
    firstName?: string
    lastName?: string
    specialization?: string
  }
}

export function PatientQueueTracker({ patientId }: { patientId: string }) {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)

  const activeEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.status === 'WAITING' || entry.status === 'IN_PROGRESS'
      ),
    [entries]
  )

  useEffect(() => {
    if (!patientId) return
    const load = async () => {
      try {
        const res = await apiClient.get(`/queue/patient/${patientId}`)
        setEntries(res.data.activeQueues || [])
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to load queue')
      } finally {
        setLoading(false)
      }
    }
    load()

    socketService.connect()

    const handleQueueUpdate = (payload: any) => {
      if (!payload?.id) return
      setEntries((prev) => {
        const existing = prev.find((entry) => entry.id === payload.id)
        if (!existing) {
          return [...prev, payload]
        }
        if (
          payload.status &&
          !['WAITING', 'IN_PROGRESS'].includes(payload.status)
        ) {
          return prev.filter((entry) => entry.id !== payload.id)
        }
        return prev.map((entry) =>
          entry.id === payload.id ? { ...entry, ...payload } : entry
        )
      })
    }

    const handleNotification = (payload: any) => {
      if (!payload?.message) return
      toast(payload.message, {
        icon: <BellRing className="h-4 w-4" />,
      })
    }

    socketService.on(SOCKET_EVENTS.QUEUE_ENTRY_UPDATED, handleQueueUpdate)
    socketService.on(SOCKET_EVENTS.NOTIFY_PATIENT, handleNotification)

    return () => {
      socketService.off(SOCKET_EVENTS.QUEUE_ENTRY_UPDATED, handleQueueUpdate)
      socketService.off(SOCKET_EVENTS.NOTIFY_PATIENT, handleNotification)
    }
  }, [patientId])

  const handleCancel = async (queueId: string) => {
    try {
      await apiClient.delete(`/queue/${queueId}`)
      toast('Queue entry cancelled')
      setEntries((prev) => prev.filter((entry) => entry.id !== queueId))
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to cancel')
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        Loading your queue status...
      </div>
    )
  }

  if (activeEntries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-600">
        You are not currently in any active queues.
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Your live queue</h2>
        <p className="text-sm text-slate-600">
          Real-time position updates and estimated wait times.
        </p>
      </div>

      {activeEntries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {entry.queueType.replace('_', ' ')}
            </p>
            <p className="text-lg font-semibold text-slate-900">
              Dr. {entry.doctor?.firstName || 'Doctor'}{' '}
              {entry.doctor?.lastName || ''}
            </p>
            <p className="text-sm text-slate-600">
              {entry.doctor?.specialization || 'General'}
            </p>
            <p className="text-xs text-slate-500">Serial {entry.serialNumber}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-sm font-semibold text-slate-700">
              Position {entry.position}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
              <Clock className="h-3.5 w-3.5" />
              {entry.estimatedWaitTime ?? '--'} min
            </p>
            {entry.status === 'WAITING' && (
              <button
                type="button"
                onClick={() => handleCancel(entry.id)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
