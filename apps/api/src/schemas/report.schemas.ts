import { z } from 'zod'
import { uuidSchema, notesSchema, paginationQuerySchema, idParamSchema } from './common.schemas'

// Schema for uploading a report
export const uploadReportSchema = z.object({
  patientId: uuidSchema,
  doctorId: uuidSchema.optional(),
  appointmentId: uuidSchema.optional(),
  notes: notesSchema
}).strict()

// Schema for report ID parameter
export const reportIdSchema = idParamSchema

// Schema for updating a report
export const updateReportSchema = z.object({
  notes: notesSchema
}).strict()

// Query parameters for listing reports
export const reportQuerySchema = paginationQuerySchema.extend({
  patientId: uuidSchema.optional(),
  doctorId: uuidSchema.optional(),
  appointmentId: uuidSchema.optional()
}).strict()

export type UploadReportData = z.infer<typeof uploadReportSchema>
export type UpdateReportData = z.infer<typeof updateReportSchema>
export type ReportParams = z.infer<typeof reportIdSchema>
export type ReportQuery = z.infer<typeof reportQuerySchema>