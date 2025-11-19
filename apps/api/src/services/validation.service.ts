import { z } from 'zod'

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
