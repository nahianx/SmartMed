import { z } from 'zod'

// Auth validation utilities (from OAuth branch)
export class ValidationService {
  static validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('INVALID_EMAIL')
    }
  }

  static validateName(name: string) {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      throw new Error('INVALID_NAME')
    }
    const nameRegex = /^[A-Za-z\s-]+$/
    if (!nameRegex.test(trimmed)) {
      throw new Error('INVALID_NAME')
    }
  }

  static validatePassword(password: string) {
    if (password.length < 8) {
      throw new Error('WEAK_PASSWORD')
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('WEAK_PASSWORD')
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('WEAK_PASSWORD')
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('WEAK_PASSWORD')
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new Error('WEAK_PASSWORD')
    }
  }

  static getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 2) return 'weak'
    if (score <= 4) return 'medium'
    return 'strong'
  }
}

// Profile validation schemas (from profile branch)
export const profileUpdateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
})

export const clinicUpdateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  consultationFee: z.number().nonnegative(),
})

export const specializationsUpdateSchema = z.object({
  specializations: z.array(z.string().min(1)).min(1),
})

export const availabilitySlotSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  hasBreak: z.boolean().optional().default(false),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

export const availabilityUpdateSchema = z.object({
  slots: z.array(availabilitySlotSchema),
})

export const preferredDoctorParamsSchema = z.object({
  doctorId: z.string().uuid(),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export const mfaUpdateSchema = z.object({
  enabled: z.boolean(),
})

export function validate<T>(schema: z.Schema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message =
      result.error.errors.map((e) => e.message).join(', ') || 'Invalid input'
    const error: any = new Error(message)
    error.status = 400
    throw error
  }
  return result.data
}
