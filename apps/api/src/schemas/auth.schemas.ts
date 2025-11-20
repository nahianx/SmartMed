import { z } from 'zod'
import { emailSchema } from './common.schemas'

// Password validation schema
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// User role validation
export const userRoleSchema = z.enum(['ADMIN', 'DOCTOR', 'PATIENT', 'NURSE'], {
  errorMap: () => ({ message: 'Role must be one of: ADMIN, DOCTOR, PATIENT, NURSE' })
})

// Registration request body schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: userRoleSchema
})

// Login request body schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
