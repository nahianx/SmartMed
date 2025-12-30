import { z } from 'zod'
import { AppointmentStatus } from '@smartmed/database'

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
})

const coerceStringArray = (schema: z.ZodTypeAny) =>
  z
    .union([schema, z.array(schema)])
    .transform((value) => (Array.isArray(value) ? value : value ? [value] : []))

// Doctor search query parameters
export const doctorSearchSchema = z
  .object({
    q: z.string().max(200).optional(),
    specialty: z.string().optional(),
    clinicId: z.string().uuid().optional(),
    sortBy: z
      .enum(['name', 'specialization', 'availability', 'createdAt'])
      .default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .merge(paginationSchema)

// Appointment search query parameters
export const appointmentSearchSchema = z
  .object({
    q: z.string().max(200).optional(),
    patientId: z.string().uuid().optional(),
    doctorId: z.string().uuid().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    status: coerceStringArray(z.nativeEnum(AppointmentStatus)).optional(),
    visitType: coerceStringArray(z.enum(['telemedicine', 'in-person'])).optional(),
    sortBy: z
      .enum(['dateTime', 'patient', 'doctor', 'status', 'createdAt'])
      .default('dateTime'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .merge(paginationSchema)

// Patient history query parameters
export const patientHistorySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    doctorId: z.string().uuid().optional(),
    includeRecords: z.coerce.boolean().default(false),
  })
  .merge(paginationSchema)

// Doctor history query parameters
export const doctorHistorySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: coerceStringArray(z.nativeEnum(AppointmentStatus)).optional(),
    patientId: z.string().uuid().optional(),
  })
  .merge(paginationSchema)
