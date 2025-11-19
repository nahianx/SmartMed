import { z } from 'zod'

// Common UUID schema
export const uuidSchema = z.string().uuid('Invalid UUID format')

// Common pagination schemas
export const paginationQuerySchema = z.object({
  limit: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .default('50'),
  offset: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0))
    .default('0')
}).partial()

// Common date range query schema (without refine for merging)
export const dateRangeQuerySchema = z.object({
  from: z.string().datetime('Invalid from date format. Use ISO 8601 format').optional(),
  to: z.string().datetime('Invalid to date format. Use ISO 8601 format').optional()
}).partial()

// Refined date range schema (for standalone validation)
export const refinedDateRangeQuerySchema = dateRangeQuerySchema.refine((data) => {
  if (data.from && data.to) {
    return new Date(data.from) <= new Date(data.to)
  }
  return true
}, {
  message: 'From date must be before or equal to to date'
})

// Common search query schema
export const searchQuerySchema = z.object({
  q: z.string()
    .min(1, 'Search query must be at least 1 character')
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional()
}).partial()

// Common ID parameter schema
export const idParamSchema = z.object({
  id: uuidSchema
})

// Email validation
export const emailSchema = z.string()
  .email('Invalid email format')
  .toLowerCase()

// Phone number validation (basic international format)
export const phoneSchema = z.string()
  .regex(/^\+?[\d\s\-()]{10,}$/, 'Invalid phone number format')
  .trim()

// Name validation
export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, apostrophes, and hyphens')
  .trim()

// Notes/description validation
export const notesSchema = z.string()
  .max(1000, 'Notes must be less than 1000 characters')
  .trim()
  .optional()
  .nullable()

// Combined common query schema
export const commonQuerySchema = paginationQuerySchema
  .merge(dateRangeQuerySchema)
  .merge(searchQuerySchema)

export type CommonQuery = z.infer<typeof commonQuerySchema>
export type IdParam = z.infer<typeof idParamSchema>