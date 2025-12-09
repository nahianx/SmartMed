import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Re-export Prisma types (excluding enums which are now defined as string constants for SQLite)
export {
  Prisma,
  PrismaClient,
  // Models
  type User,
  type Doctor,
  type Patient,
  type Appointment,
  type Clinic,
  type DoctorAvailability,
  type Prescription,
  type Report,
  type Activity,
  type Notification,
  type PreferredDoctor,
  type DoctorSpecialization,
  type Specialization,
  type UserSession,
  type PasswordReset,
  type EmailVerification,
} from '@prisma/client'

// SQLite-compatible enum values as constants (SQLite doesn't support native enums)
// eslint-disable-next-line no-redeclare
export const UserRole = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',
  PATIENT: 'PATIENT',
  NURSE: 'NURSE',
} as const
// eslint-disable-next-line no-redeclare
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

// eslint-disable-next-line no-redeclare
export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const
// eslint-disable-next-line no-redeclare
export type Gender = (typeof Gender)[keyof typeof Gender]

// eslint-disable-next-line no-redeclare
export const AppointmentStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const
// eslint-disable-next-line no-redeclare
export type AppointmentStatus =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus]

// eslint-disable-next-line no-redeclare
export const AuthProvider = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
} as const
// eslint-disable-next-line no-redeclare
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider]

// eslint-disable-next-line no-redeclare
export const ActivityType = {
  APPOINTMENT: 'APPOINTMENT',
  PRESCRIPTION: 'PRESCRIPTION',
  REPORT: 'REPORT',
} as const
// eslint-disable-next-line no-redeclare
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType]

// eslint-disable-next-line no-redeclare
export const NotificationType = {
  APPOINTMENT_REMINDER_24H: 'APPOINTMENT_REMINDER_24H',
  APPOINTMENT_REMINDER_1H: 'APPOINTMENT_REMINDER_1H',
  ACTIVITY_CREATED: 'ACTIVITY_CREATED',
  ACTIVITY_UPDATED: 'ACTIVITY_UPDATED',
} as const
// eslint-disable-next-line no-redeclare
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType]
