import { z } from 'zod'
import {
  uuidSchema,
  notesSchema,
  paginationQuerySchema,
  idParamSchema,
} from './common.schemas'

// Legacy medication schema (backward compatibility)
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

// Enhanced medication schema with RxNav integration
const enhancedMedicationSchema = z.object({
  // Drug identification
  medicineName: z
    .string()
    .min(1, 'Medicine name is required')
    .max(200, 'Medicine name must be less than 200 characters')
    .trim(),
  rxcui: z
    .string()
    .regex(/^\d+$/, 'RxCUI must be a numeric string')
    .optional()
    .nullable(),
  genericName: z
    .string()
    .max(200)
    .optional()
    .nullable(),
  
  // Structured dosage
  dosage: z
    .string()
    .min(1, 'Dosage is required')
    .max(100, 'Dosage must be less than 100 characters')
    .trim(),
  dosageValue: z.number().positive().optional().nullable(),
  dosageUnit: z.string().max(20).optional().nullable(),
  strength: z.string().max(50).optional().nullable(),
  
  // Structured frequency
  frequency: z
    .string()
    .min(1, 'Frequency is required')
    .max(100, 'Frequency must be less than 100 characters')
    .trim(),
  frequencyTimes: z.number().int().positive().optional().nullable(),
  frequencyPeriod: z.enum(['DAY', 'WEEK', 'MONTH', 'AS_NEEDED']).optional().nullable(),
  
  // Structured duration  
  duration: z
    .string()
    .min(1, 'Duration is required')
    .max(100, 'Duration must be less than 100 characters')
    .trim(),
  durationValue: z.number().int().positive().optional().nullable(),
  durationUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS']).optional().nullable(),
  
  // Route and instructions
  route: z.enum([
    'ORAL',
    'TOPICAL', 
    'INTRAVENOUS',
    'INTRAMUSCULAR',
    'SUBCUTANEOUS',
    'INHALATION',
    'SUBLINGUAL',
    'RECTAL',
    'OPHTHALMIC',
    'OTIC',
    'NASAL',
    'OTHER',
  ]).optional().nullable(),
  instructions: z
    .string()
    .max(500, 'Instructions must be less than 500 characters')
    .trim()
    .optional(),
})

// Interaction override schema
const interactionOverrideSchema = z.object({
  interactionCheckStatus: z.enum(['PENDING', 'CHECKED', 'OVERRIDDEN', 'NOT_APPLICABLE']).optional(),
  interactionOverrideReason: z.string().max(500).optional().nullable(),
  acknowledgedInteractions: z.array(z.object({
    drug1Rxcui: z.string(),
    drug2Rxcui: z.string(),
    severity: z.enum(['CONTRAINDICATED', 'SEVERE', 'MODERATE', 'MINOR']),
    description: z.string(),
  })).optional(),
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
  // Support both legacy and enhanced medication formats
  medications: z
    .array(z.union([medicationSchema, enhancedMedicationSchema]))
    .min(1, 'At least one medication is required')
    .max(20, 'Maximum 20 medications allowed')
    .optional(),
  notes: notesSchema,
  // Interaction override fields
  interactionCheckStatus: z.enum(['PENDING', 'CHECKED', 'OVERRIDDEN', 'NOT_APPLICABLE']).optional(),
  interactionOverrideReason: z.string().max(500).optional().nullable(),
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
      .array(z.union([medicationSchema, enhancedMedicationSchema]))
      .min(1, 'At least one medication is required')
      .max(20, 'Maximum 20 medications allowed'),
    // Optional: Skip interaction check (requires reason)
    skipInteractionCheck: z.boolean().optional(),
    interactionOverrideReason: z.string().max(500).optional().nullable(),
  })
  .strict()
  .refine(
    (data) => !data.skipInteractionCheck || data.interactionOverrideReason,
    {
      message: 'Override reason required when skipping interaction check',
      path: ['interactionOverrideReason'],
    }
  )

export const updatePrescriptionSchema = prescriptionBaseSchema
  .extend({
    skipInteractionCheck: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => !data.interactionCheckStatus || data.interactionCheckStatus !== 'OVERRIDDEN' || data.interactionOverrideReason,
    {
      message: 'Override reason required when status is OVERRIDDEN',
      path: ['interactionOverrideReason'],
    }
  )

export const prescriptionIdSchema = idParamSchema

export const prescriptionQuerySchema = paginationQuerySchema
  .extend({
    patientId: uuidSchema.optional(),
  })
  .strict()

// Interaction check request schema
export const interactionCheckRequestSchema = z.object({
  medications: z.array(z.object({
    medicineName: z.string(),
    rxcui: z.string().optional(),
  })).min(2, 'At least 2 medications required for interaction check'),
  patientId: uuidSchema.optional(),
})

export type CreatePrescriptionData = z.infer<typeof createPrescriptionSchema>
export type UpdatePrescriptionData = z.infer<typeof updatePrescriptionSchema>
export type PrescriptionParams = z.infer<typeof prescriptionIdSchema>
export type PrescriptionQuery = z.infer<typeof prescriptionQuerySchema>
export type MedicationData = z.infer<typeof medicationSchema>
export type EnhancedMedicationData = z.infer<typeof enhancedMedicationSchema>
export type InteractionCheckRequest = z.infer<typeof interactionCheckRequestSchema>
