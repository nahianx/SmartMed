import { prisma, DoctorAvailabilityStatus, AppointmentStatus } from '@smartmed/database'
import { DoctorAvailability } from '@smartmed/types'
import { randomUUID } from 'crypto'
import { getDefaultTimezone } from '../utils/time'

export async function getOrCreateDoctor(userId: string) {
  const existing = await prisma.doctor.findUnique({ where: { userId } })
  if (existing) return existing

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    const error: any = new Error('User not found')
    error.status = 404
    throw error
  }

  const [firstName, ...rest] = (user.fullName || 'Doctor Unknown').split(' ')
  const lastName = rest.join(' ') || 'Unknown'

  return prisma.doctor.create({
    data: {
      userId,
      firstName,
      lastName,
      specialization: 'General Medicine',
      qualification: 'MD',
      experience: 0,
      phoneNumber: user.phoneNumber || 'N/A',
      licenseNumber: `TMP-${userId.slice(0, 8)}-${randomUUID().slice(0, 6)}`,
      consultationFee: 0,
      availableDays: [],
      availableTimeSlots: [],
      timezone: getDefaultTimezone(),
      availabilityStatus: DoctorAvailabilityStatus.OFF_DUTY,
      isAvailable: false,
      averageConsultationTime: 15,
      todayServed: 0,
      todayNoShows: 0,
      totalServed: 0,
      allowWalkIns: true,
      allowOnlineBooking: true,
      autoCallNext: false,
      noShowTimeout: 30,
      statsDate: '',
    },
  })
}

export async function getDoctorProfileByUserId(userId: string) {
  const doctor = await getOrCreateDoctor(userId)
  return prisma.doctor.findUnique({
    where: { id: doctor.id },
    include: {
      clinic: true,
      specializations: {
        include: { specialization: true },
      },
    },
  })
}

export async function updateDoctorSpecializations(
  userId: string,
  names: string[]
) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) {
    throw Object.assign(new Error('Doctor not found'), { status: 404 })
  }

  const specs = await Promise.all(
    names.map((name) =>
      prisma.specialization.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  )

  // Remove existing links and recreate
  await prisma.doctorSpecialization.deleteMany({
    where: { doctorId: doctor.id },
  })

  // Create new links one by one (SQLite doesn't support skipDuplicates in createMany)
  for (const s of specs) {
    await prisma.doctorSpecialization.create({
      data: { doctorId: doctor.id, specializationId: s.id },
    })
  }

  return getDoctorProfileByUserId(userId)
}

interface ClinicInput {
  name: string
  address: string
  phone: string
  consultationFee: number
}

export async function upsertClinicForDoctor(userId: string, data: ClinicInput) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) {
    throw Object.assign(new Error('Doctor not found'), { status: 404 })
  }

  const clinic = await prisma.clinic.upsert({
    where: { id: doctor.clinicId ?? '' },
    update: {
      name: data.name,
      address: data.address,
      phone: data.phone,
      consultationFee: data.consultationFee,
    },
    create: {
      name: data.name,
      address: data.address,
      phone: data.phone,
      consultationFee: data.consultationFee,
    },
  })

  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { clinicId: clinic.id },
  })

  return clinic
}

export async function getAvailability(userId: string) {
  const doctor = await getOrCreateDoctor(userId)

  const slots = await prisma.doctorAvailability.findMany({
    where: { doctorId: doctor.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })

  return slots
}

export async function setAvailability(
  userId: string,
  slots: Omit<
    DoctorAvailability,
    'id' | 'doctorId' | 'createdAt' | 'updatedAt'
  >[]
) {
  const doctor = await getOrCreateDoctor(userId)

  // Basic conflict detection: ensure no overlapping slots per day
  const byDay: Record<number, { start: string; end: string }[]> = {}
  for (const slot of slots) {
    const list = (byDay[slot.dayOfWeek] ||= [])
    for (const existing of list) {
      if (!(slot.endTime <= existing.start || slot.startTime >= existing.end)) {
        const error: any = new Error('Overlapping availability slots detected')
        error.status = 400
        throw error
      }
    }
    list.push({ start: slot.startTime, end: slot.endTime })

    if (slot.hasBreak && slot.breakStart && slot.breakEnd) {
      if (
        !(slot.startTime <= slot.breakStart && slot.breakEnd <= slot.endTime)
      ) {
        const error: any = new Error('Break must be within slot time range')
        error.status = 400
        throw error
      }
    }
  }

  await prisma.doctorAvailability.deleteMany({ where: { doctorId: doctor.id } })

  await prisma.doctorAvailability.createMany({
    data: slots.map((slot) => ({
      doctorId: doctor.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      hasBreak: slot.hasBreak ?? false,
      breakStart: slot.breakStart,
      breakEnd: slot.breakEnd,
      isAvailable: slot.isAvailable,
    })),
  })

  return getAvailability(userId)
}

export async function removeAvailabilitySlot(userId: string, slotId: string) {
  const doctor = await getOrCreateDoctor(userId)

  const slot = await prisma.doctorAvailability.findUnique({
    where: { id: slotId },
  })

  if (!slot || slot.doctorId !== doctor.id) {
    throw Object.assign(new Error('Slot not found'), { status: 404 })
  }

  await prisma.doctorAvailability.delete({ where: { id: slotId } })
}

export async function updateDoctorStatus(
  doctorId: string,
  status: DoctorAvailabilityStatus,
  options?: {
    isAvailable?: boolean
    currentPatientId?: string | null
    currentQueueEntryId?: string | null
  }
) {
  const data = {
    availabilityStatus: status,
    isAvailable:
      typeof options?.isAvailable === 'boolean'
        ? options.isAvailable
        : status === DoctorAvailabilityStatus.AVAILABLE,
    currentPatientId: options?.currentPatientId ?? null,
    currentQueueEntryId: options?.currentQueueEntryId ?? null,
    lastStatusChange: new Date(),
  }

  return prisma.doctor.update({
    where: { id: doctorId },
    data,
  })
}

export async function getDoctorStatus(doctorId: string) {
  return prisma.doctor.findUnique({
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
}

export async function searchDoctors(
  query: string,
  filters?: { specialization?: string; location?: string }
) {
  const text = query.trim()
  const where: any = {}
  const orFilters: any[] = []

  if (text) {
    orFilters.push(
      { firstName: { contains: text, mode: 'insensitive' } },
      { lastName: { contains: text, mode: 'insensitive' } },
      { specialization: { contains: text, mode: 'insensitive' } },
      {
        clinic: {
          name: { contains: text, mode: 'insensitive' },
        },
      },
      {
        clinic: {
          address: { contains: text, mode: 'insensitive' },
        },
      }
    )
  }

  if (filters?.specialization) {
    orFilters.push(
      { specialization: { contains: filters.specialization, mode: 'insensitive' } },
      {
        specializations: {
          some: {
            specialization: {
              name: { contains: filters.specialization, mode: 'insensitive' },
            },
          },
        },
      }
    )
  }

  if (filters?.location) {
    orFilters.push(
      {
        clinic: {
          address: { contains: filters.location, mode: 'insensitive' },
        },
      },
      {
        clinic: {
          name: { contains: filters.location, mode: 'insensitive' },
        },
      }
    )
  }

  if (orFilters.length > 0) {
    where.OR = orFilters
  }

  if (!where.OR) {
    return []
  }

  const doctors = await prisma.doctor.findMany({
    where,
    include: {
      clinic: true,
    },
    take: 20,
  })

  return doctors
}

interface DoctorSearchFilters {
  q?: string
  specialty?: string
  clinicId?: string
  acceptingNew?: boolean
  availableFrom?: Date
  availableTo?: Date
  visitType?: string[]
  sortBy: 'name' | 'specialization' | 'availability' | 'createdAt'
  sortOrder: 'asc' | 'desc'
  limit: number
  page: number
}

export async function searchDoctorsAdvanced(filters: DoctorSearchFilters) {
  const {
    q,
    specialty,
    clinicId,
    // acceptingNew is reserved for future use when field exists
    sortBy,
    sortOrder,
    limit,
    page,
  } = filters

  const where: any = {}

  if (q) {
    const text = q.trim()
    where.OR = [
      { firstName: { contains: text, mode: 'insensitive' } },
      { lastName: { contains: text, mode: 'insensitive' } },
      { specialization: { contains: text, mode: 'insensitive' } },
      {
        clinic: {
          name: { contains: text, mode: 'insensitive' },
        },
      },
    ]
  }

  if (specialty) {
    where.OR = [
      ...(where.OR || []),
      { specialization: { contains: specialty, mode: 'insensitive' } },
      {
        specializations: {
          some: {
            specialization: {
              name: { contains: specialty, mode: 'insensitive' },
            },
          },
        },
      },
    ]
  }

  if (clinicId) {
    where.clinicId = clinicId
  }

  const orderBy: any[] = []
  if (sortBy === 'name') {
    orderBy.push({ firstName: sortOrder }, { lastName: sortOrder })
  } else if (sortBy === 'specialization') {
    orderBy.push({ specialization: sortOrder })
  } else if (sortBy === 'availability') {
    orderBy.push({ updatedAt: sortOrder })
  } else if (sortBy === 'createdAt') {
    orderBy.push({ createdAt: sortOrder })
  }
  if (orderBy.length === 0) {
    orderBy.push({ firstName: 'asc' })
  }

  const take = Math.min(limit, 100)
  const skip = Math.max(0, (page - 1) * take)

  const [doctors, totalResults] = await Promise.all([
    prisma.doctor.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        clinic: {
          select: { id: true, name: true, address: true },
        },
        specializations: {
          include: { specialization: true },
        },
      },
    }),
    prisma.doctor.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalResults / take) || 1)
  const currentPage = Math.min(page, totalPages)

  return {
    doctors,
    pagination: {
      currentPage,
      totalPages,
      totalResults,
      limit: take,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  }
}

const BLOCKING_APPOINTMENT_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.ACCEPTED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.SCHEDULED,
] as const

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10))
  return hours * 60 + minutes
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function timeRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) {
  return startA < endB && endA > startB
}

export async function getDoctorAvailabilityByDateRange(options: {
  doctorId: string
  startDate: Date
  endDate: Date
  durationMinutes?: number
}) {
  const { doctorId, startDate, endDate, durationMinutes } = options

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, averageConsultationTime: true },
  })

  if (!doctor) {
    const error: any = new Error('Doctor not found')
    error.status = 404
    throw error
  }

  const slotDuration = Math.max(15, durationMinutes || doctor.averageConsultationTime || 30)

  const fromDate = startOfUtcDay(startDate)
  const toDate = startOfUtcDay(endDate)
  if (fromDate > toDate) {
    const error: any = new Error('Start date must be before end date')
    error.status = 400
    throw error
  }

  const slots = await prisma.doctorAvailability.findMany({
    where: { doctorId, isAvailable: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })

  const appointmentRangeStart = fromDate
  const appointmentRangeEnd = addUtcDays(toDate, 1)

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: BLOCKING_APPOINTMENT_STATUSES as any },
      dateTime: { gte: appointmentRangeStart, lt: appointmentRangeEnd },
    },
    select: {
      dateTime: true,
      duration: true,
      status: true,
    },
  })

  const now = new Date()
  const results: Array<{
    date: string
    startTime: string
    endTime: string
    isAvailable: boolean
  }> = []

  for (
    let cursor = new Date(fromDate);
    cursor <= toDate;
    cursor = addUtcDays(cursor, 1)
  ) {
    const dayOfWeek = cursor.getUTCDay()
    const daySlots = slots.filter((slot) => slot.dayOfWeek === dayOfWeek)

    for (const slot of daySlots) {
      const slotStart = parseTimeToMinutes(slot.startTime)
      const slotEnd = parseTimeToMinutes(slot.endTime)
      const breakStart = slot.breakStart ? parseTimeToMinutes(slot.breakStart) : null
      const breakEnd = slot.breakEnd ? parseTimeToMinutes(slot.breakEnd) : null

      for (
        let minutes = slotStart;
        minutes + slotDuration <= slotEnd;
        minutes += slotDuration
      ) {
        const endMinutes = minutes + slotDuration
        if (
          slot.hasBreak &&
          breakStart !== null &&
          breakEnd !== null &&
          minutes < breakEnd &&
          endMinutes > breakStart
        ) {
          continue
        }

        const slotStartDate = new Date(cursor)
        slotStartDate.setUTCHours(
          Math.floor(minutes / 60),
          minutes % 60,
          0,
          0
        )
        const slotEndDate = new Date(slotStartDate.getTime() + slotDuration * 60000)

        if (slotStartDate <= now) {
          continue
        }

        const hasConflict = appointments.some((appointment) => {
          const appointmentStart = appointment.dateTime
          const appointmentEnd = new Date(
            appointmentStart.getTime() + appointment.duration * 60000
          )
          return timeRangesOverlap(
            slotStartDate,
            slotEndDate,
            appointmentStart,
            appointmentEnd
          )
        })

        results.push({
          date: slotStartDate.toISOString().slice(0, 10),
          startTime: formatMinutes(minutes),
          endTime: formatMinutes(endMinutes),
          isAvailable: !hasConflict,
        })
      }
    }
  }

  return results
}
