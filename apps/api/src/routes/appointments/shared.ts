/**
 * Shared utilities for appointment routes
 * 
 * Contains helper functions and types used across appointment sub-routers.
 */

import { Prisma, PrismaClient, AppointmentStatus } from '@smartmed/database'

export type DbClient = PrismaClient | Prisma.TransactionClient

export const BLOCKING_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.ACCEPTED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.SCHEDULED,
]

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10))
  return hours * 60 + minutes
}

/**
 * Get minutes since midnight from a Date (UTC)
 */
export function getUtcMinutes(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB
}

/**
 * Check if a time slot allows a given time range
 */
export function slotAllowsTime(
  slot: {
    startTime: string
    endTime: string
    hasBreak: boolean
    breakStart: string | null
    breakEnd: string | null
  },
  startMinutes: number,
  endMinutes: number
): boolean {
  const slotStart = parseTimeToMinutes(slot.startTime)
  const slotEnd = parseTimeToMinutes(slot.endTime)
  if (startMinutes < slotStart || endMinutes > slotEnd) return false

  if (slot.hasBreak && slot.breakStart && slot.breakEnd) {
    const breakStart = parseTimeToMinutes(slot.breakStart)
    const breakEnd = parseTimeToMinutes(slot.breakEnd)
    const overlapsBreak = startMinutes < breakEnd && endMinutes > breakStart
    if (overlapsBreak) return false
  }

  return true
}

/**
 * Check if a doctor is available at a given time
 */
export async function isDoctorAvailable(
  db: DbClient,
  doctorId: string,
  startTime: Date,
  duration: number
): Promise<boolean> {
  const dayOfWeek = startTime.getUTCDay()
  const startMinutes = getUtcMinutes(startTime)
  const endMinutes = startMinutes + duration

  const slots = await db.doctorAvailability.findMany({
    where: { doctorId, dayOfWeek, isAvailable: true },
  })

  return slots.some((slot) =>
    slotAllowsTime(
      {
        startTime: slot.startTime,
        endTime: slot.endTime,
        hasBreak: slot.hasBreak,
        breakStart: slot.breakStart,
        breakEnd: slot.breakEnd,
      },
      startMinutes,
      endMinutes
    )
  )
}

/**
 * Find appointments that conflict with a given time slot
 */
export async function findConflictingAppointments(
  db: DbClient,
  doctorId: string,
  startTime: Date,
  duration: number,
  excludeId?: string
) {
  const endTime = new Date(startTime.getTime() + duration * 60000)
  const conflicts = await db.appointment.findMany({
    where: {
      doctorId,
      status: { in: BLOCKING_STATUSES },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      dateTime: { lt: endTime },
    },
    select: {
      id: true,
      dateTime: true,
      duration: true,
      status: true,
    },
  })

  return conflicts.filter((existing) => {
    const existingStart = existing.dateTime
    const existingEnd = new Date(
      existingStart.getTime() + existing.duration * 60000
    )
    return timeRangesOverlap(startTime, endTime, existingStart, existingEnd)
  })
}
