import {
  prisma,
  Prisma,
  QueueStatus,
  QueueType,
  DoctorAvailabilityStatus,
  AuditAction,
} from '@smartmed/database'
import { getIO } from '../socket/io'
import { SOCKET_EVENTS } from '../socket/constants'
import { getDateKeyForTimezone, isWithinWindow } from '../utils/time'
import { logAuditEvent } from '../utils/audit'

const CHECKIN_EARLY_MINUTES = Number(
  process.env.CHECKIN_EARLY_MINUTES || 30
)
const CHECKIN_LATE_MINUTES = Number(process.env.CHECKIN_LATE_MINUTES || 15)
const WAIT_TIME_BUFFER = Number(process.env.QUEUE_WAIT_BUFFER || 1.2)

export interface QueueActor {
  id: string
  role: string
}

const STAFF_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE'])

function isStaff(role: string) {
  return STAFF_ROLES.has(role.toUpperCase())
}

function getDoctorQueueRoom(doctorId: string) {
  return `doctor:${doctorId}:queue`
}

function getUserRoom(userId: string) {
  return `user:${userId}`
}

function getPriorityForEntry({
  queueType,
  scheduledTime,
  checkInTime,
}: {
  queueType: QueueType
  scheduledTime?: Date | null
  checkInTime: Date
}) {
  if (queueType !== QueueType.ONLINE_BOOKING || !scheduledTime) {
    return 2
  }
  const withinWindow = isWithinWindow(
    checkInTime,
    scheduledTime,
    CHECKIN_EARLY_MINUTES,
    CHECKIN_LATE_MINUTES
  )
  return withinWindow ? 1 : 2
}

async function ensureDoctorStatsDate(
  tx: Prisma.TransactionClient,
  doctorId: string
) {
  const doctor = await tx.doctor.findUnique({ where: { id: doctorId } })
  if (!doctor) {
    throw new Error('Doctor not found')
  }
  const dateKey = getDateKeyForTimezone(new Date(), doctor.timezone)
  if (doctor.statsDate !== dateKey) {
    return tx.doctor.update({
      where: { id: doctorId },
      data: {
        todayServed: 0,
        todayNoShows: 0,
        statsDate: dateKey,
      },
    })
  }
  return doctor
}

async function assertDoctorAccess(
  tx: Prisma.TransactionClient,
  actor: QueueActor,
  doctorId: string
) {
  if (actor.role.toUpperCase() !== 'DOCTOR') {
    return
  }
  const doctor = await tx.doctor.findUnique({ where: { userId: actor.id } })
  if (!doctor || doctor.id !== doctorId) {
    const error: any = new Error('Unauthorized doctor access')
    error.status = 403
    throw error
  }
}

async function generateSerialNumber(
  tx: Prisma.TransactionClient,
  doctorId: string,
  timeZone: string
) {
  const dateKey = getDateKeyForTimezone(new Date(), timeZone)
  const counter = await tx.queueCounter.upsert({
    where: { doctorId_queueDate: { doctorId, queueDate: dateKey } },
    update: { nextSerial: { increment: 1 } },
    create: { doctorId, queueDate: dateKey, nextSerial: 1 },
  })
  const serial = String(counter.nextSerial).padStart(3, '0')
  return {
    serialNumber: `DOC-${doctorId}-${dateKey}-${serial}`,
    queueDate: dateKey,
  }
}

function sortQueueEntries(
  entries: Array<{
    priority: number
    scheduledTime: Date | null
    checkInTime: Date
  }>
) {
  return [...entries].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    const aScheduled = a.scheduledTime?.getTime() ?? Number.POSITIVE_INFINITY
    const bScheduled = b.scheduledTime?.getTime() ?? Number.POSITIVE_INFINITY
    if (aScheduled !== bScheduled) {
      return aScheduled - bScheduled
    }
    return a.checkInTime.getTime() - b.checkInTime.getTime()
  })
}

async function recalculateQueuePositions(
  tx: Prisma.TransactionClient,
  doctorId: string
) {
  const doctor = await tx.doctor.findUnique({ where: { id: doctorId } })
  if (!doctor) {
    throw new Error('Doctor not found')
  }
  const waitingEntries = await tx.queueEntry.findMany({
    where: { doctorId, status: QueueStatus.WAITING },
  })
  const sorted = sortQueueEntries(waitingEntries)
  const averageMinutes = doctor.averageConsultationTime || 15

  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index]
    const position = index + 1
    const wait = Math.round((position - 1) * averageMinutes * WAIT_TIME_BUFFER)
    await tx.queueEntry.update({
      where: { id: entry.id },
      data: { position, estimatedWaitTime: wait },
    })
  }
}

async function refreshWaitTimesByPosition(
  tx: Prisma.TransactionClient,
  doctorId: string
) {
  const doctor = await tx.doctor.findUnique({ where: { id: doctorId } })
  if (!doctor) {
    return
  }
  const waitingEntries = await tx.queueEntry.findMany({
    where: { doctorId, status: QueueStatus.WAITING },
    orderBy: { position: 'asc' },
  })
  const averageMinutes = doctor.averageConsultationTime || 15

  for (let index = 0; index < waitingEntries.length; index += 1) {
    const entry = waitingEntries[index]
    const position = index + 1
    const wait = Math.round((position - 1) * averageMinutes * WAIT_TIME_BUFFER)
    await tx.queueEntry.update({
      where: { id: entry.id },
      data: { position, estimatedWaitTime: wait },
    })
  }
}

async function emitQueueState(doctorId: string) {
  const io = getIO()
  if (!io) return
  const state = await getQueueState(doctorId)
  io.to(getDoctorQueueRoom(doctorId)).emit(SOCKET_EVENTS.QUEUE_UPDATED, state)

  const activeEntries = await prisma.queueEntry.findMany({
    where: {
      doctorId,
      status: { in: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS] },
    },
    include: { patient: { select: { userId: true } } },
  })
  for (const entry of activeEntries) {
    if (!entry.patient) continue
    io.to(getUserRoom(entry.patient.userId)).emit(
      SOCKET_EVENTS.QUEUE_ENTRY_UPDATED,
      {
        id: entry.id,
        doctorId: entry.doctorId,
        status: entry.status,
        position: entry.position,
        estimatedWaitTime: entry.estimatedWaitTime,
        serialNumber: entry.serialNumber,
        queueType: entry.queueType,
        scheduledTime: entry.scheduledTime,
        calledTime: entry.calledTime,
      }
    )
  }
}

export async function broadcastDoctorStatus(doctorId: string) {
  const io = getIO()
  if (!io) return
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      id: true,
      availabilityStatus: true,
      isAvailable: true,
      currentPatientId: true,
      currentQueueEntryId: true,
      lastStatusChange: true,
      averageConsultationTime: true,
      todayServed: true,
      todayNoShows: true,
      totalServed: true,
      allowWalkIns: true,
      allowOnlineBooking: true,
      autoCallNext: true,
      noShowTimeout: true,
      timezone: true,
    },
  })
  if (!doctor) return
  io.to(getDoctorQueueRoom(doctorId)).emit(
    SOCKET_EVENTS.DOCTOR_STATUS_CHANGED,
    doctor
  )
  io.to(`doctor:${doctorId}`).emit(
    SOCKET_EVENTS.DOCTOR_STATUS_CHANGED,
    doctor
  )
  io.emit(SOCKET_EVENTS.DOCTOR_STATUS_CHANGED, doctor)
}

async function notifyPatient(patientId: string, payload: unknown) {
  const io = getIO()
  if (!io) return
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  })
  if (!patient) return
  io.to(getUserRoom(patient.userId)).emit(
    SOCKET_EVENTS.NOTIFY_PATIENT,
    payload
  )
}

async function emitQueueEntryUpdate(queueEntryId: string) {
  const io = getIO()
  if (!io) return
  const entry = await prisma.queueEntry.findUnique({
    where: { id: queueEntryId },
    include: { patient: { select: { userId: true } } },
  })
  if (!entry || !entry.patient) return
  io.to(getUserRoom(entry.patient.userId)).emit(
    SOCKET_EVENTS.QUEUE_ENTRY_UPDATED,
    {
      id: entry.id,
      doctorId: entry.doctorId,
      status: entry.status,
      position: entry.position,
      estimatedWaitTime: entry.estimatedWaitTime,
      serialNumber: entry.serialNumber,
      queueType: entry.queueType,
      scheduledTime: entry.scheduledTime,
      calledTime: entry.calledTime,
      completedTime: entry.completedTime,
    }
  )
}

export async function getQueueState(doctorId: string) {
  const [doctor, entries] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        availabilityStatus: true,
        isAvailable: true,
        currentPatientId: true,
        currentQueueEntryId: true,
        lastStatusChange: true,
        averageConsultationTime: true,
        todayServed: true,
        todayNoShows: true,
        totalServed: true,
        allowWalkIns: true,
        allowOnlineBooking: true,
        autoCallNext: true,
        noShowTimeout: true,
        timezone: true,
      },
    }),
    prisma.queueEntry.findMany({
      where: {
        doctorId,
        status: { in: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS] },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
  ])

  const inProgress = entries.filter(
    (entry) => entry.status === QueueStatus.IN_PROGRESS
  )
  const waiting = entries
    .filter((entry) => entry.status === QueueStatus.WAITING)
    .sort((a, b) => a.position - b.position)

  return {
    doctorStatus: doctor,
    queue: [...inProgress, ...waiting],
  }
}

export async function addWalkIn(
  input: { doctorId: string; patientId: string; priority?: number },
  actor: QueueActor
) {
  if (!isStaff(actor.role)) {
    const error: any = new Error('Unauthorized')
    error.status = 403
    throw error
  }

  return prisma.$transaction(
    async (tx) => {
      await assertDoctorAccess(tx, actor, input.doctorId)

      const doctor = await ensureDoctorStatsDate(tx, input.doctorId)
      if (!doctor.allowWalkIns) {
        const error: any = new Error('Walk-ins are disabled for this doctor')
        error.status = 400
        throw error
      }

      const patient = await tx.patient.findUnique({
        where: { id: input.patientId },
      })
      if (!patient) {
        const error: any = new Error('Patient not found')
        error.status = 404
        throw error
      }

      const { serialNumber } = await generateSerialNumber(
        tx,
        input.doctorId,
        doctor.timezone
      )
      const checkInTime = new Date()
      const priority =
        typeof input.priority === 'number'
          ? Math.max(1, Math.min(2, input.priority))
          : 2

      const entry = await tx.queueEntry.create({
        data: {
          serialNumber,
          doctorId: input.doctorId,
          patientId: input.patientId,
          queueType: QueueType.WALK_IN,
          status: QueueStatus.WAITING,
          priority,
          position: 0,
          checkInTime,
        },
      })

      await recalculateQueuePositions(tx, input.doctorId)

      await logAuditEvent({
        userId: actor.id,
        userRole: actor.role,
        action: AuditAction.QUEUE_ENTRY_ADDED,
        resourceType: 'QueueEntry',
        resourceId: entry.id,
        metadata: { doctorId: input.doctorId, queueType: QueueType.WALK_IN },
      })

      return entry
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (entry) => {
    await emitQueueState(entry.doctorId)
    const refreshed = await prisma.queueEntry.findUnique({
      where: { id: entry.id },
    })
    return refreshed ?? entry
  })
}

export async function checkInAppointment(
  input: { appointmentId: string },
  actor: QueueActor
) {
  if (!isStaff(actor.role)) {
    const error: any = new Error('Unauthorized')
    error.status = 403
    throw error
  }

  return prisma.$transaction(
    async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: input.appointmentId },
      })
      if (!appointment) {
        const error: any = new Error('Appointment not found')
        error.status = 404
        throw error
      }
      if (
        appointment.status === 'CANCELLED' ||
        appointment.status === 'COMPLETED' ||
        appointment.status === 'NO_SHOW'
      ) {
        const error: any = new Error('Appointment is not eligible for check-in')
        error.status = 400
        throw error
      }

      await assertDoctorAccess(tx, actor, appointment.doctorId)

      const doctor = await ensureDoctorStatsDate(tx, appointment.doctorId)
      if (!doctor.allowOnlineBooking) {
        const error: any = new Error('Online check-in is disabled')
        error.status = 400
        throw error
      }

      const existingEntry = await tx.queueEntry.findUnique({
        where: { appointmentId: input.appointmentId },
      })
      if (existingEntry) {
        const error: any = new Error('Appointment already checked in')
        error.status = 409
        throw error
      }

      const checkInTime = new Date()
      const withinWindow = isWithinWindow(
        checkInTime,
        appointment.dateTime,
        CHECKIN_EARLY_MINUTES,
        CHECKIN_LATE_MINUTES
      )
      if (!withinWindow) {
        const error: any = new Error(
          'Check-in is outside the allowed time window'
        )
        error.status = 400
        throw error
      }

      const { serialNumber } = await generateSerialNumber(
        tx,
        appointment.doctorId,
        doctor.timezone
      )

      const entry = await tx.queueEntry.create({
        data: {
          serialNumber,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          queueType: QueueType.ONLINE_BOOKING,
          status: QueueStatus.WAITING,
          priority: getPriorityForEntry({
            queueType: QueueType.ONLINE_BOOKING,
            scheduledTime: appointment.dateTime,
            checkInTime,
          }),
          position: 0,
          checkInTime,
          scheduledTime: appointment.dateTime,
        },
      })

      await recalculateQueuePositions(tx, appointment.doctorId)

      await logAuditEvent({
        userId: actor.id,
        userRole: actor.role,
        action: AuditAction.QUEUE_CHECK_IN,
        resourceType: 'Appointment',
        resourceId: appointment.id,
        metadata: { doctorId: appointment.doctorId },
      })

      return entry
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (entry) => {
    await emitQueueState(entry.doctorId)
    const refreshed = await prisma.queueEntry.findUnique({
      where: { id: entry.id },
    })
    return refreshed ?? entry
  })
}

export async function updateQueueStatus(
  queueId: string,
  status: 'CANCELLED' | 'NO_SHOW',
  actor: QueueActor
) {
  const actorRole = actor.role.toUpperCase()
  const isPatientCancel = actorRole === 'PATIENT' && status === 'CANCELLED'
  if (!isStaff(actor.role) && !isPatientCancel) {
    const error: any = new Error('Unauthorized')
    error.status = 403
    throw error
  }

  return prisma.$transaction(
    async (tx) => {
      const entry = await tx.queueEntry.findUnique({
        where: { id: queueId },
      })
      if (!entry) {
        const error: any = new Error('Queue entry not found')
        error.status = 404
        throw error
      }
      if (
        entry.status === QueueStatus.COMPLETED ||
        entry.status === QueueStatus.CANCELLED
      ) {
        const error: any = new Error('Queue entry is already closed')
        error.status = 400
        throw error
      }
      if (status === 'NO_SHOW' && entry.status !== QueueStatus.IN_PROGRESS) {
        const error: any = new Error('Only in-progress entries can be no-show')
        error.status = 400
        throw error
      }

      if (actorRole === 'PATIENT') {
        const patient = await tx.patient.findUnique({
          where: { userId: actor.id },
        })
        if (!patient || patient.id !== entry.patientId) {
          const error: any = new Error('Unauthorized')
          error.status = 403
          throw error
        }
      } else {
        await assertDoctorAccess(tx, actor, entry.doctorId)
      }

      const updated = await tx.queueEntry.update({
        where: { id: queueId },
        data: {
          status,
          completedTime: new Date(),
          position: 0,
        },
      })

      if (entry.status === QueueStatus.IN_PROGRESS) {
        await tx.doctor.update({
          where: { id: entry.doctorId },
          data: {
            availabilityStatus: DoctorAvailabilityStatus.AVAILABLE,
            isAvailable: true,
            currentPatientId: null,
            currentQueueEntryId: null,
            lastStatusChange: new Date(),
          },
        })
      }

      if (status === QueueStatus.NO_SHOW) {
        await ensureDoctorStatsDate(tx, entry.doctorId)
        await tx.doctor.update({
          where: { id: entry.doctorId },
          data: { todayNoShows: { increment: 1 } },
        })
      }

      await recalculateQueuePositions(tx, entry.doctorId)

      await logAuditEvent({
        userId: actor.id,
        userRole: actor.role,
        action: AuditAction.QUEUE_ENTRY_STATUS_CHANGED,
        resourceType: 'QueueEntry',
        resourceId: entry.id,
        metadata: { status },
      })

      return updated
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (entry) => {
    await emitQueueState(entry.doctorId)
    await broadcastDoctorStatus(entry.doctorId)
    await emitQueueEntryUpdate(entry.id)
    return entry
  })
}

export async function updateQueuePosition(
  queueId: string,
  newPosition: number,
  actor: QueueActor
) {
  if (!isStaff(actor.role)) {
    const error: any = new Error('Unauthorized')
    error.status = 403
    throw error
  }

  return prisma.$transaction(
    async (tx) => {
      const entry = await tx.queueEntry.findUnique({ where: { id: queueId } })
      if (!entry) {
        const error: any = new Error('Queue entry not found')
        error.status = 404
        throw error
      }
      if (entry.status !== QueueStatus.IN_PROGRESS) {
        const error: any = new Error('Queue entry is not in progress')
        error.status = 400
        throw error
      }
      if (entry.status !== QueueStatus.WAITING) {
        const error: any = new Error('Only waiting entries can be reordered')
        error.status = 400
        throw error
      }

      await assertDoctorAccess(tx, actor, entry.doctorId)

      const waitingEntries = await tx.queueEntry.findMany({
        where: { doctorId: entry.doctorId, status: QueueStatus.WAITING },
      })
      const sorted = sortQueueEntries(waitingEntries)
      const index = sorted.findIndex((item) => item.id === entry.id)
      if (index === -1) {
        const error: any = new Error('Queue entry not found in waiting list')
        error.status = 404
        throw error
      }

      const target = Math.max(1, Math.min(sorted.length, newPosition))
      sorted.splice(index, 1)
      sorted.splice(target - 1, 0, entry)

      const doctor = await tx.doctor.findUnique({
        where: { id: entry.doctorId },
      })
      const averageMinutes = doctor?.averageConsultationTime || 15

      for (let i = 0; i < sorted.length; i += 1) {
        const item = sorted[i]
        const position = i + 1
        const wait = Math.round((position - 1) * averageMinutes * WAIT_TIME_BUFFER)
        await tx.queueEntry.update({
          where: { id: item.id },
          data: { position, estimatedWaitTime: wait },
        })
      }

      await logAuditEvent({
        userId: actor.id,
        userRole: actor.role,
        action: AuditAction.QUEUE_ENTRY_REORDERED,
        resourceType: 'QueueEntry',
        resourceId: entry.id,
        metadata: { newPosition: target },
      })

      return entry
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (entry) => {
    await emitQueueState(entry.doctorId)
    return entry
  })
}

export async function callNextPatient(
  doctorId: string,
  actor: QueueActor
) {
  if (!isStaff(actor.role)) {
    const error: any = new Error('Unauthorized')
    error.status = 403
    throw error
  }

  return prisma.$transaction(
    async (tx) => {
      await assertDoctorAccess(tx, actor, doctorId)
      await ensureDoctorStatsDate(tx, doctorId)

      const existingInProgress = await tx.queueEntry.findFirst({
        where: { doctorId, status: QueueStatus.IN_PROGRESS },
      })
      if (existingInProgress) {
        const error: any = new Error('A patient is already in progress')
        error.status = 409
        throw error
      }

      const next = await tx.queueEntry.findFirst({
        where: { doctorId, status: QueueStatus.WAITING },
        orderBy: { position: 'asc' },
      })
      if (!next) {
        const error: any = new Error('No patients in queue')
        error.status = 404
        throw error
      }

      const updated = await tx.queueEntry.update({
        where: { id: next.id },
        data: {
          status: QueueStatus.IN_PROGRESS,
          calledTime: new Date(),
          position: 0,
        },
      })

      await tx.doctor.update({
        where: { id: doctorId },
        data: {
          availabilityStatus: DoctorAvailabilityStatus.BUSY,
          isAvailable: false,
          currentPatientId: next.patientId,
          currentQueueEntryId: next.id,
          lastStatusChange: new Date(),
        },
      })

      await recalculateQueuePositions(tx, doctorId)

      await logAuditEvent({
        userId: actor.id,
        userRole: actor.role,
        action: AuditAction.QUEUE_CALLED_NEXT,
        resourceType: 'QueueEntry',
        resourceId: next.id,
        metadata: { doctorId },
      })

      return updated
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (entry) => {
    await emitQueueState(entry.doctorId)
    await broadcastDoctorStatus(entry.doctorId)
    await notifyPatient(entry.patientId, {
      queueEntryId: entry.id,
      doctorId: entry.doctorId,
      message: 'Your turn is next. Please be ready.',
    })

    const io = getIO()
    if (io) {
      io.to(getDoctorQueueRoom(entry.doctorId)).emit(
        SOCKET_EVENTS.PATIENT_CALLED,
        entry
      )
    }
    return entry
  })
}

export async function completeConsultation(
  queueId: string,
  notes: string | undefined,
  actor: QueueActor
) {
  if (actor.role.toUpperCase() !== 'DOCTOR') {
    const error: any = new Error('Unauthorized')
    error.status = 403
    throw error
  }

  return prisma.$transaction(
    async (tx) => {
      const entry = await tx.queueEntry.findUnique({ where: { id: queueId } })
      if (!entry) {
        const error: any = new Error('Queue entry not found')
        error.status = 404
        throw error
      }

      await assertDoctorAccess(tx, actor, entry.doctorId)
      const doctor = await ensureDoctorStatsDate(tx, entry.doctorId)

      const completedTime = new Date()
      const completed = await tx.queueEntry.update({
        where: { id: queueId },
        data: {
          status: QueueStatus.COMPLETED,
          completedTime,
          notes: notes?.trim() || undefined,
          position: 0,
        },
      })

      let durationMinutes: number | null = null
      if (entry.calledTime) {
        durationMinutes = Math.max(
          1,
          Math.round(
            (completedTime.getTime() - entry.calledTime.getTime()) / 60000
          )
        )
      }

      const nextTotalServed = doctor.totalServed + 1
      const nextAverage =
        durationMinutes !== null
          ? Math.round(
              (doctor.averageConsultationTime * doctor.totalServed +
                durationMinutes) /
                nextTotalServed
            )
          : doctor.averageConsultationTime

      await tx.doctor.update({
        where: { id: entry.doctorId },
        data: {
          availabilityStatus: DoctorAvailabilityStatus.AVAILABLE,
          isAvailable: true,
          currentPatientId: null,
          currentQueueEntryId: null,
          lastStatusChange: new Date(),
          todayServed: { increment: 1 },
          totalServed: nextTotalServed,
          averageConsultationTime: nextAverage,
        },
      })

      await recalculateQueuePositions(tx, entry.doctorId)

      await logAuditEvent({
        userId: actor.id,
        userRole: actor.role,
        action: AuditAction.QUEUE_ENTRY_STATUS_CHANGED,
        resourceType: 'QueueEntry',
        resourceId: entry.id,
        metadata: { status: QueueStatus.COMPLETED },
      })

      return { entry: completed, autoCallNext: doctor.autoCallNext }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  ).then(async (result) => {
    await emitQueueState(result.entry.doctorId)
    await broadcastDoctorStatus(result.entry.doctorId)
    await emitQueueEntryUpdate(result.entry.id)
    if (result.autoCallNext) {
      try {
        await callNextPatient(result.entry.doctorId, actor)
      } catch (error: any) {
        if (error.status !== 404) {
          throw error
        }
      }
    }
    return result.entry
  })
}

export async function getPatientActiveQueues(patientId: string) {
  return prisma.queueEntry.findMany({
    where: {
      patientId,
      status: { in: [QueueStatus.WAITING, QueueStatus.IN_PROGRESS] },
    },
    include: {
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
        },
      },
    },
    orderBy: { checkInTime: 'asc' },
  })
}

export async function handleNoShows() {
  const entries = await prisma.queueEntry.findMany({
    where: {
      status: QueueStatus.IN_PROGRESS,
      calledTime: { not: null },
    },
  })

  for (const entry of entries) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: entry.doctorId },
    })
    if (!doctor || !entry.calledTime) continue

    const timeoutMs = (doctor.noShowTimeout || 30) * 60 * 1000
    const overdue = entry.calledTime.getTime() + timeoutMs < Date.now()
    if (!overdue) continue

    await prisma.$transaction(
      async (tx) => {
        await tx.queueEntry.update({
          where: { id: entry.id },
          data: {
            status: QueueStatus.NO_SHOW,
            completedTime: new Date(),
            position: 0,
          },
        })

        await ensureDoctorStatsDate(tx, entry.doctorId)
        await tx.doctor.update({
          where: { id: entry.doctorId },
          data: {
            todayNoShows: { increment: 1 },
            availabilityStatus: DoctorAvailabilityStatus.AVAILABLE,
            isAvailable: true,
            currentPatientId: null,
            currentQueueEntryId: null,
            lastStatusChange: new Date(),
          },
        })

        await recalculateQueuePositions(tx, entry.doctorId)
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    await logAuditEvent({
      userRole: 'SYSTEM',
      action: AuditAction.QUEUE_ENTRY_STATUS_CHANGED,
      resourceType: 'QueueEntry',
      resourceId: entry.id,
      metadata: { status: QueueStatus.NO_SHOW, reason: 'timeout' },
    })

    await emitQueueState(entry.doctorId)
    await broadcastDoctorStatus(entry.doctorId)
    await emitQueueEntryUpdate(entry.id)
  }
}

export async function refreshWaitTimes() {
  const doctorIds = await prisma.queueEntry.findMany({
    where: { status: QueueStatus.WAITING },
    select: { doctorId: true },
    distinct: ['doctorId'],
  })

  for (const item of doctorIds) {
    await prisma.$transaction(
      async (tx) => {
        await refreshWaitTimesByPosition(tx, item.doctorId)
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    )
    await emitQueueState(item.doctorId)
  }
}

export async function resetDailyDoctorStats() {
  const doctors = await prisma.doctor.findMany({
    select: { id: true, timezone: true, statsDate: true },
  })
  for (const doctor of doctors) {
    const dateKey = getDateKeyForTimezone(new Date(), doctor.timezone)
    if (doctor.statsDate !== dateKey) {
      await prisma.doctor.update({
        where: { id: doctor.id },
        data: { todayServed: 0, todayNoShows: 0, statsDate: dateKey },
      })
    }
  }
}
