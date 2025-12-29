import { z } from 'zod'
import {
  uuidSchema,
  notesSchema,
  paginationQuerySchema,
  idParamSchema,
} from './common.schemas'

const medicationSchema = z.object({
  medicineName: z
    .string()
    .min(1, 'Medicine name is required')
    .max(200, 'Medicine name must be less than 200 characters')
    .trim(),
  dosage: z
    .string()
    .min(1, 'Dosage is required')
    .max(100, 'Dosage must be less than 100 characters')
    .trim(),
  frequency: z
    .string()
    .min(1, 'Frequency is required')
    .max(100, 'Frequency must be less than 100 characters')
    .trim(),
  duration: z
    .string()
    .min(1, 'Duration is required')
    .max(100, 'Duration must be less than 100 characters')
    .trim(),
  instructions: z
    .string()
    .max(500, 'Instructions must be less than 500 characters')
    .trim()
    .optional(),
})

const prescriptionBaseSchema = z.object({
  appointmentId: uuidSchema.optional(),
  patientId: uuidSchema.optional(),
  diagnosis: z
    .string()
    .min(3, 'Diagnosis must be at least 3 characters long')
    .max(1000, 'Diagnosis must be less than 1000 characters')
    .trim()
    .optional(),
  medications: z
    .array(medicationSchema)
    .min(1, 'At least one medication is required')
    .max(20, 'Maximum 20 medications allowed')
    .optional(),
  notes: notesSchema,
})

export const createPrescriptionSchema = prescriptionBaseSchema
  .extend({
    appointmentId: uuidSchema,
    patientId: uuidSchema,
    diagnosis: z
      .string()
      .min(3, 'Diagnosis must be at least 3 characters long')
      .max(1000, 'Diagnosis must be less than 1000 characters')
      .trim(),
    medications: z
      .array(medicationSchema)
      .min(1, 'At least one medication is required')
      .max(20, 'Maximum 20 medications allowed'),
  })
  .strict()

export const updatePrescriptionSchema = prescriptionBaseSchema.strict()

export const prescriptionIdSchema = idParamSchema

export const prescriptionQuerySchema = paginationQuerySchema
  .extend({
    patientId: uuidSchema.optional(),
  })
  .strict()

export type CreatePrescriptionData = z.infer<typeof createPrescriptionSchema>
export type UpdatePrescriptionData = z.infer<typeof updatePrescriptionSchema>
export type PrescriptionParams = z.infer<typeof prescriptionIdSchema>
export type PrescriptionQuery = z.infer<typeof prescriptionQuerySchema>
export type MedicationData = z.infer<typeof medicationSchema>
