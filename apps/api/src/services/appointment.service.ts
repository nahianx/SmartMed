import { prisma, AppointmentStatus } from '@smartmed/database'
import { UserRole } from '@smartmed/types'
import { getOrCreatePatient } from './patient.service'
import { getOrCreateDoctor } from './doctor.service'

export interface AppointmentSearchFilters {
  q?: string
  patientId?: string
  doctorId?: string
  dateFrom?: Date
  dateTo?: Date
  status?: AppointmentStatus[]
  visitType?: string[]
  sortBy: 'dateTime' | 'patient' | 'doctor' | 'status' | 'createdAt'
  sortOrder: 'asc' | 'desc'
  limit: number
  page: number
  userId: string
  userRole: UserRole
}

export async function searchAppointments(filters: AppointmentSearchFilters) {
  const {
    q,
    patientId,
    doctorId,
    dateFrom,
    dateTo,
    status,
    sortBy,
    sortOrder,
    limit,
    page,
    userId,
    userRole,
  } = filters

  const where: any = {}

  // RBAC scoping
  if (userRole === UserRole.PATIENT) {
    const patient = await getOrCreatePatient(userId)
    where.patientId = patient.id
  } else if (userRole === UserRole.DOCTOR) {
    const doctor = await getOrCreateDoctor(userId)
    where.doctorId = doctor.id
  } else if (userRole === UserRole.ADMIN) {
    if (patientId) where.patientId = patientId
    if (doctorId) where.doctorId = doctorId
  }

  // Additional filters
  if (dateFrom || dateTo) {
    where.dateTime = {}
    if (dateFrom) where.dateTime.gte = dateFrom
    if (dateTo) where.dateTime.lte = dateTo
  }

  if (status && status.length > 0) {
    where.status = { in: status }
  }

  if (q) {
    const text = q.trim()
    where.OR = [
      { reason: { contains: text, mode: 'insensitive' } },
      {
        patient: {
          OR: [
            { firstName: { contains: text, mode: 'insensitive' } },
            { lastName: { contains: text, mode: 'insensitive' } },
          ],
        },
      },
      {
        doctor: {
          OR: [
            { firstName: { contains: text, mode: 'insensitive' } },
            { lastName: { contains: text, mode: 'insensitive' } },
            { specialization: { contains: text, mode: 'insensitive' } },
          ],
        },
      },
    ]
  }

  const orderBy: any[] = []
  if (sortBy === 'dateTime') orderBy.push({ dateTime: sortOrder })
  if (sortBy === 'status') orderBy.push({ status: sortOrder })
  if (sortBy === 'createdAt') orderBy.push({ createdAt: sortOrder })
  if (sortBy === 'patient')
    orderBy.push({ patient: { firstName: sortOrder as 'asc' | 'desc' } })
  if (sortBy === 'doctor')
    orderBy.push({ doctor: { firstName: sortOrder as 'asc' | 'desc' } })
  if (orderBy.length === 0) {
    orderBy.push({ dateTime: 'desc' })
  }

  const take = Math.min(limit, 100)
  const skip = Math.max(0, (page - 1) * take)

  const [appointments, totalResults] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy,
      take,
      skip,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        prescriptions: userRole !== UserRole.PATIENT,
        reports: userRole !== UserRole.PATIENT,
      },
    }),
    prisma.appointment.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalResults / take) || 1)
  const currentPage = Math.min(page, totalPages)

  return {
    appointments,
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

interface PatientHistoryFilters {
  startDate?: Date
  endDate?: Date
  doctorId?: string
  includeRecords?: boolean
  limit: number
  page: number
}

export async function getPatientHistory(
  patientId: string,
  filters: PatientHistoryFilters,
) {
  const { startDate, endDate, doctorId, includeRecords = false, limit, page } =
    filters

  const where: any = { patientId }

  if (startDate || endDate) {
    where.dateTime = {}
    if (startDate) where.dateTime.gte = startDate
    if (endDate) where.dateTime.lte = endDate
  }

  if (doctorId) {
    where.doctorId = doctorId
  }

  const take = Math.min(limit, 100)
  const skip = Math.max(0, (page - 1) * take)

  const [appointments, totalResults] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { dateTime: 'desc' },
      take,
      skip,
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        prescriptions: includeRecords,
        reports: includeRecords,
      },
    }),
    prisma.appointment.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalResults / take) || 1)
  const currentPage = Math.min(page, totalPages)

  return {
    appointments,
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

interface DoctorHistoryFilters {
  startDate?: Date
  endDate?: Date
  status?: AppointmentStatus[]
  patientId?: string
  limit: number
  page: number
}

export async function getDoctorHistory(
  doctorId: string,
  filters: DoctorHistoryFilters,
) {
  const { startDate, endDate, status, patientId, limit, page } = filters

  const where: any = { doctorId }

  if (startDate || endDate) {
    where.dateTime = {}
    if (startDate) where.dateTime.gte = startDate
    if (endDate) where.dateTime.lte = endDate
  }

  if (status && status.length > 0) {
    where.status = { in: status }
  }

  if (patientId) {
    where.patientId = patientId
  }

  const take = Math.min(limit, 100)
  const skip = Math.max(0, (page - 1) * take)

  const [appointments, totalResults] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { dateTime: 'desc' },
      take,
      skip,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        prescriptions: true,
        reports: true,
      },
    }),
    prisma.appointment.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalResults / take) || 1)
  const currentPage = Math.min(page, totalPages)

  return {
    appointments,
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
