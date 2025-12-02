import { z } from 'zod'
import { AppointmentStatus } from '@smartmed/database'
import { uuidSchema, notesSchema, paginationQuerySchema, dateRangeQuerySchema, idParamSchema } from './common.schemas'

// Base appointment data that can be used for both create and update
const appointmentBaseSchema = z.object({
  patientId: uuidSchema.optional(),
  doctorId: uuidSchema.optional(),
  dateTime: z.string()
    .datetime('Invalid datetime format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)')
    .refine((date) => new Date(date) > new Date(), {
      message: 'Appointment must be scheduled for a future date and time'
    })
    .optional(),
  duration: z.number()
    .int('Duration must be an integer')
    .min(15, 'Minimum appointment duration is 15 minutes')
    .max(480, 'Maximum appointment duration is 8 hours')
    .optional(),
  reason: z.string()
    .min(3, 'Reason must be at least 3 characters long')
    .max(500, 'Reason must be less than 500 characters')
    .trim()
    .optional(),
  notes: notesSchema,
  status: z.nativeEnum(AppointmentStatus, {
    errorMap: () => ({ message: 'Invalid appointment status' })
  }).optional()
})

// Schema for creating a new appointment
export const createAppointmentSchema = appointmentBaseSchema.extend({
  patientId: uuidSchema,
  doctorId: uuidSchema,
  dateTime: z.string()
    .datetime('Invalid datetime format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)')
    .refine((date) => new Date(date) > new Date(), {
      message: 'Appointment must be scheduled for a future date and time'
    }),
  reason: z.string()
    .min(3, 'Reason must be at least 3 characters long')
    .max(500, 'Reason must be less than 500 characters')
    .trim(),
  duration: z.number()
    .int('Duration must be an integer')
    .min(15, 'Minimum appointment duration is 15 minutes')
    .max(480, 'Maximum appointment duration is 8 hours')
    .default(30)
}).strict()

// Schema for updating an appointment
export const updateAppointmentSchema = appointmentBaseSchema.strict()

// Schema for appointment ID parameter
export const appointmentIdSchema = idParamSchema

// Query parameters for listing appointments
export const appointmentQuerySchema = paginationQuerySchema
  .merge(dateRangeQuerySchema)
  .extend({
    status: z.nativeEnum(AppointmentStatus).optional(),
    doctorId: uuidSchema.optional()
  }).strict().refine((data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to)
    }
    return true
  }, {
    message: 'From date must be before or equal to to date'
  })

export type CreateAppointmentData = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>
export type AppointmentParams = z.infer<typeof appointmentIdSchema>
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>