/**
 * Drug Validation Schemas
 * 
 * Zod schemas for validating drug-related API requests
 */

import { z } from 'zod'

// ==========================================
// Common Schemas
// ==========================================

export const rxcuiSchema = z
  .string()
  .min(1, 'RxCUI is required')
  .max(20, 'RxCUI is too long')
  .regex(/^\d+$/, 'RxCUI must contain only digits')

// ==========================================
// Drug Search Schemas
// ==========================================

export const drugSearchQuerySchema = z.object({
  term: z
    .string()
    .min(2, 'Search term must be at least 2 characters')
    .max(100, 'Search term is too long')
    .trim(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().min(1).max(100)),
})

export const drugRxcuiParamSchema = z.object({
  rxcui: rxcuiSchema,
})

// ==========================================
// Interaction Check Schemas
// ==========================================

export const interactionCheckBodySchema = z.object({
  rxcuis: z
    .array(rxcuiSchema)
    .min(2, 'At least 2 RxCUIs are required for interaction checking')
    .max(20, 'Maximum 20 drugs can be checked at once'),
})

export const prescriptionInteractionParamSchema = z.object({
  id: z.string().uuid('Invalid prescription ID'),
})

// ==========================================
// Allergy Schemas
// ==========================================

export const allergySeverityEnum = z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'])

export const allergenTypeEnum = z.enum(['DRUG', 'DRUG_CLASS', 'INGREDIENT', 'FOOD', 'ENVIRONMENTAL', 'OTHER'])

export const createAllergySchema = z.object({
  allergenName: z
    .string()
    .min(1, 'Allergen name is required')
    .max(200, 'Allergen name is too long')
    .trim(),
  allergenType: allergenTypeEnum,
  allergenRxcui: rxcuiSchema.optional(),
  reaction: z
    .string()
    .max(500, 'Reaction description is too long')
    .trim()
    .optional(),
  severity: allergySeverityEnum.default('MODERATE'),
  onsetDate: z.coerce.date().optional(),
  notes: z
    .string()
    .max(1000, 'Notes are too long')
    .trim()
    .optional(),
})

export const updateAllergySchema = createAllergySchema.partial()

export const allergyCheckBodySchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  rxcuis: z
    .array(rxcuiSchema)
    .min(1, 'At least 1 RxCUI is required')
    .max(20, 'Maximum 20 drugs can be checked at once'),
})

export const allergyIdParamSchema = z.object({
  id: z.string().uuid('Invalid allergy ID'),
})

export const patientIdParamSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
})

// ==========================================
// Interaction Override Schema
// ==========================================

export const interactionOverrideSchema = z.object({
  interactionCheckId: z.string().uuid('Invalid interaction check ID'),
  overrideReason: z
    .string()
    .min(10, 'Override reason must be at least 10 characters')
    .max(500, 'Override reason is too long')
    .trim(),
  acknowledgedInteractions: z
    .array(z.string().uuid())
    .min(1, 'At least one interaction must be acknowledged'),
})

// ==========================================
// Structured Medication Schema
// ==========================================

export const medicationRouteEnum = z.enum([
  'ORAL',
  'IV',
  'IM',
  'SUBCUTANEOUS',
  'TOPICAL',
  'INHALATION',
  'SUBLINGUAL',
  'RECTAL',
  'TRANSDERMAL',
  'OPHTHALMIC',
  'OTIC',
  'NASAL',
  'OTHER',
])

export const dosageUnitEnum = z.enum([
  'mg',
  'g',
  'mcg',
  'ml',
  'units',
  'tablets',
  'capsules',
  'drops',
  'puffs',
  'patches',
  'suppositories',
  'other',
])

export const frequencyPeriodEnum = z.enum([
  'day',
  'week',
  'month',
  'as_needed',
  'once',
])

export const durationUnitEnum = z.enum([
  'days',
  'weeks',
  'months',
  'ongoing',
])

export const structuredMedicationSchema = z.object({
  drugRxcui: rxcuiSchema.optional(),
  medicineName: z
    .string()
    .min(1, 'Medicine name is required')
    .max(200, 'Medicine name must be less than 200 characters')
    .trim(),
  genericName: z
    .string()
    .max(200, 'Generic name must be less than 200 characters')
    .trim()
    .optional(),
  dosage: z
    .string()
    .min(1, 'Dosage is required')
    .max(100, 'Dosage must be less than 100 characters')
    .trim(),
  dosageValue: z
    .number()
    .positive('Dosage value must be positive')
    .optional(),
  dosageUnit: dosageUnitEnum.optional(),
  frequency: z
    .string()
    .min(1, 'Frequency is required')
    .max(100, 'Frequency must be less than 100 characters')
    .trim(),
  frequencyTimes: z
    .number()
    .int()
    .positive('Frequency times must be positive')
    .optional(),
  frequencyPeriod: frequencyPeriodEnum.optional(),
  duration: z
    .string()
    .min(1, 'Duration is required')
    .max(100, 'Duration must be less than 100 characters')
    .trim(),
  durationValue: z
    .number()
    .int()
    .positive('Duration value must be positive')
    .optional(),
  durationUnit: durationUnitEnum.optional(),
  route: medicationRouteEnum.default('ORAL'),
  instructions: z
    .string()
    .max(500, 'Instructions must be less than 500 characters')
    .trim()
    .optional(),
})

// ==========================================
// Export Types
// ==========================================

export type DrugSearchQuery = z.infer<typeof drugSearchQuerySchema>
export type DrugRxcuiParam = z.infer<typeof drugRxcuiParamSchema>
export type InteractionCheckBody = z.infer<typeof interactionCheckBodySchema>
export type CreateAllergyData = z.infer<typeof createAllergySchema>
export type UpdateAllergyData = z.infer<typeof updateAllergySchema>
export type AllergyCheckBody = z.infer<typeof allergyCheckBodySchema>
export type InteractionOverrideData = z.infer<typeof interactionOverrideSchema>
export type StructuredMedicationData = z.infer<typeof structuredMedicationSchema>
