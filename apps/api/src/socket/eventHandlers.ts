import type { Server, Socket } from 'socket.io'
import { z } from 'zod'
import { prisma } from '@smartmed/database'
import { SOCKET_EVENTS } from './constants'
import {
  addWalkIn,
  callNextPatient,
  checkInAppointment,
  completeConsultation,
  getQueueState,
  updateQueuePosition,
  updateQueueStatus,
} from '../services/queue.service'

const joinSchema = z.object({ doctorId: z.string().uuid() })
const walkInSchema = z.object({
  doctorId: z.string().uuid(),
  patientId: z.string().uuid(),
  priority: z.number().int().min(1).max(2).optional(),
})
const checkInSchema = z.object({ appointmentId: z.string().uuid() })
const callNextSchema = z.object({ doctorId: z.string().uuid() })
const completeSchema = z.object({
  queueId: z.string().uuid(),
  notes: z.string().optional(),
})
const positionSchema = z.object({
  queueId: z.string().uuid(),
  newPosition: z.number().int().min(1),
})
const statusSchema = z.object({
  queueId: z.string().uuid(),
  status: z.enum(['CANCELLED', 'NO_SHOW']),
})

function isDoctor(role: string) {
  return role.toUpperCase() === 'DOCTOR'
}

export function registerEventHandlers(_io: Server, socket: Socket) {
  const actor = socket.data.user as { id: string; role: string }

  const bootstrapRooms = async () => {
    socket.join(`user:${actor.id}`)
    if (isDoctor(actor.role)) {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: actor.id },
        select: { id: true },
      })
      if (doctor) {
        socket.data.doctorId = doctor.id
        socket.join(`doctor:${doctor.id}`)
      }
    }
  }

  bootstrapRooms().catch((err) => {
    console.error('Socket bootstrap error:', err)
  })

  socket.on(SOCKET_EVENTS.QUEUE_JOIN, async (payload, ack) => {
    try {
      const { doctorId } = joinSchema.parse(payload)
      if (isDoctor(actor.role)) {
        const doctorIdForUser = socket.data.doctorId
        if (!doctorIdForUser || doctorIdForUser !== doctorId) {
          return ack?.({ ok: false, error: 'Unauthorized' })
        }
      }

      socket.join(`doctor:${doctorId}:queue`)
      const state = await getQueueState(doctorId)
      return ack?.({ ok: true, ...state })
    } catch (error: any) {
      return ack?.({ ok: false, error: error.message })
    }
  })

  socket.on(SOCKET_EVENTS.QUEUE_LEAVE, (payload) => {
    const parsed = joinSchema.safeParse(payload)
    if (!parsed.success) return
    socket.leave(`doctor:${parsed.data.doctorId}:queue`)
  })

  socket.on(SOCKET_EVENTS.ADD_WALKIN, async (payload, ack) => {
    try {
      const data = walkInSchema.parse(payload)
      const entry = await addWalkIn(data, actor)
      return ack?.({ ok: true, entry })
    } catch (error: any) {
      return ack?.({ ok: false, error: error.message })
    }
  })

  socket.on(SOCKET_EVENTS.CHECK_IN, async (payload, ack) => {
    try {
      const data = checkInSchema.parse(payload)
      const entry = await checkInAppointment(data, actor)
      return ack?.({ ok: true, entry })
    } catch (error: any) {
      return ack?.({ ok: false, error: error.message })
    }
  })

  socket.on(SOCKET_EVENTS.CALL_NEXT, async (payload, ack) => {
    try {
      const data = callNextSchema.parse(payload)
      const entry = await callNextPatient(data.doctorId, actor)
      return ack?.({ ok: true, entry })
    } catch (error: any) {
      return ack?.({ ok: false, error: error.message })
    }
  })

  socket.on(SOCKET_EVENTS.COMPLETE_CONSULTATION, async (payload, ack) => {
    try {
      const data = completeSchema.parse(payload)
      const entry = await completeConsultation(data.queueId, data.notes, actor)
      return ack?.({ ok: true, entry })
    } catch (error: any) {
      return ack?.({ ok: false, error: error.message })
    }
  })

  socket.on(SOCKET_EVENTS.UPDATE_POSITION, async (payload, ack) => {
    try {
      const data = positionSchema.parse(payload)
      const entry = await updateQueuePosition(
        data.queueId,
        data.newPosition,
        actor
      )
      return ack?.({ ok: true, entry })
    } catch (error: any) {
      return ack?.({ ok: false, error: error.message })
    }
  })

  socket.on(SOCKET_EVENTS.QUEUE_ENTRY_STATUS_CHANGED, async (payload, ack) => {
    try {
      const data = statusSchema.parse(payload)
      const entry = await updateQueueStatus(data.queueId, data.status, actor)
      return ack?.({ ok: true, entry })
    } catch (error: any) {
      return ack?.({ ok: false, error: error.message })
    }
  })

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    // No-op for now; room cleanup handled by socket.io
  })
}
