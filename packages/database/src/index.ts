import { PrismaClient, Prisma, $Enums } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Re-export Prisma $Enums for strict typing
export { $Enums }

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
  type AuditLog,
  type QueueEntry,
  type QueueCounter,
  type HealthTip,
  type HealthTipPreference,
  // New drug-related models
  type Drug,
  type DrugInteraction,
  type PrescriptionMedication,
  type InteractionCheck,
  type PatientAllergy,
  type AllergyCheck,
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
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
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
  HEALTH_TIP_GENERATED: 'HEALTH_TIP_GENERATED',
} as const
// eslint-disable-next-line no-redeclare
export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType]

// eslint-disable-next-line no-redeclare
export const QueueType = {
  WALK_IN: 'WALK_IN',
  ONLINE_BOOKING: 'ONLINE_BOOKING',
} as const
// eslint-disable-next-line no-redeclare
export type QueueType = (typeof QueueType)[keyof typeof QueueType]

// eslint-disable-next-line no-redeclare
export const QueueStatus = {
  WAITING: 'WAITING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const
// eslint-disable-next-line no-redeclare
export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus]

// eslint-disable-next-line no-redeclare
export const DoctorAvailabilityStatus = {
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  BREAK: 'BREAK',
  OFF_DUTY: 'OFF_DUTY',
} as const
// eslint-disable-next-line no-redeclare
export type DoctorAvailabilityStatus =
  (typeof DoctorAvailabilityStatus)[keyof typeof DoctorAvailabilityStatus]

// eslint-disable-next-line no-redeclare
export const AuditAction = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  FAILED_LOGIN: 'FAILED_LOGIN',
  PATIENT_HISTORY_ACCESS: 'PATIENT_HISTORY_ACCESS',
  DOCTOR_HISTORY_ACCESS: 'DOCTOR_HISTORY_ACCESS',
  APPOINTMENT_VIEW: 'APPOINTMENT_VIEW',
  MEDICAL_RECORD_VIEW: 'MEDICAL_RECORD_VIEW',
  PRESCRIPTION_VIEW: 'PRESCRIPTION_VIEW',
  REPORT_UPLOAD: 'REPORT_UPLOAD',
  REPORT_VIEW: 'REPORT_VIEW',
  PATIENT_CREATED: 'PATIENT_CREATED',
  PATIENT_UPDATED: 'PATIENT_UPDATED',
  PATIENT_DELETED: 'PATIENT_DELETED',
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  PRESCRIPTION_CREATED: 'PRESCRIPTION_CREATED',
  PRESCRIPTION_UPDATED: 'PRESCRIPTION_UPDATED',
  DOCTOR_SEARCH: 'DOCTOR_SEARCH',
  APPOINTMENT_SEARCH: 'APPOINTMENT_SEARCH',
  PATIENT_SEARCH: 'PATIENT_SEARCH',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  QUEUE_ENTRY_ADDED: 'QUEUE_ENTRY_ADDED',
  QUEUE_ENTRY_REMOVED: 'QUEUE_ENTRY_REMOVED',
  QUEUE_ENTRY_STATUS_CHANGED: 'QUEUE_ENTRY_STATUS_CHANGED',
  QUEUE_ENTRY_REORDERED: 'QUEUE_ENTRY_REORDERED',
  QUEUE_CALLED_NEXT: 'QUEUE_CALLED_NEXT',
  QUEUE_CHECK_IN: 'QUEUE_CHECK_IN',
  DOCTOR_STATUS_CHANGED: 'DOCTOR_STATUS_CHANGED',
  // Drug-related audit actions
  DRUG_SEARCH: 'DRUG_SEARCH',
  DRUG_LOOKUP: 'DRUG_LOOKUP',
  INTERACTION_CHECK: 'INTERACTION_CHECK',
  INTERACTION_OVERRIDE: 'INTERACTION_OVERRIDE',
  ALLERGY_CHECK: 'ALLERGY_CHECK',
  ALLERGY_CONFLICT_OVERRIDE: 'ALLERGY_CONFLICT_OVERRIDE',
  ALLERGY_ADDED: 'ALLERGY_ADDED',
  ALLERGY_UPDATED: 'ALLERGY_UPDATED',
  ALLERGY_DELETED: 'ALLERGY_DELETED',
} as const
// eslint-disable-next-line no-redeclare
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]

// =============================================================================
// Drug-related enums
// =============================================================================

// eslint-disable-next-line no-redeclare
export const InteractionSeverity = {
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
} as const
// eslint-disable-next-line no-redeclare
export type InteractionSeverity = (typeof InteractionSeverity)[keyof typeof InteractionSeverity]

// eslint-disable-next-line no-redeclare
export const InteractionCheckStatus = {
  NOT_CHECKED: 'NOT_CHECKED',
  PASSED: 'PASSED',
  WARNINGS_ACKNOWLEDGED: 'WARNINGS_ACKNOWLEDGED',
  FAILED: 'FAILED',
} as const
// eslint-disable-next-line no-redeclare
export type InteractionCheckStatus = (typeof InteractionCheckStatus)[keyof typeof InteractionCheckStatus]

// eslint-disable-next-line no-redeclare
export const MedicationRoute = {
  ORAL: 'ORAL',
  IV: 'IV',
  IM: 'IM',
  SUBCUTANEOUS: 'SUBCUTANEOUS',
  TOPICAL: 'TOPICAL',
  INHALATION: 'INHALATION',
  SUBLINGUAL: 'SUBLINGUAL',
  RECTAL: 'RECTAL',
  TRANSDERMAL: 'TRANSDERMAL',
  OPHTHALMIC: 'OPHTHALMIC',
  OTIC: 'OTIC',
  NASAL: 'NASAL',
  OTHER: 'OTHER',
} as const
// eslint-disable-next-line no-redeclare
export type MedicationRoute = (typeof MedicationRoute)[keyof typeof MedicationRoute]

// eslint-disable-next-line no-redeclare
export const AllergenType = {
  DRUG: 'DRUG',
  DRUG_CLASS: 'DRUG_CLASS',
  INGREDIENT: 'INGREDIENT',
  FOOD: 'FOOD',
  ENVIRONMENTAL: 'ENVIRONMENTAL',
  OTHER: 'OTHER',
} as const
// eslint-disable-next-line no-redeclare
export type AllergenType = (typeof AllergenType)[keyof typeof AllergenType]

// eslint-disable-next-line no-redeclare
export const AllergySeverity = {
  MILD: 'MILD',
  MODERATE: 'MODERATE',
  SEVERE: 'SEVERE',
  LIFE_THREATENING: 'LIFE_THREATENING',
} as const
// eslint-disable-next-line no-redeclare
export type AllergySeverity = (typeof AllergySeverity)[keyof typeof AllergySeverity]

// =============================================================================
// Permission-related enums
// =============================================================================

// eslint-disable-next-line no-redeclare
export const PermissionAction = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  MANAGE: 'MANAGE',
  EXECUTE: 'EXECUTE',
} as const
// eslint-disable-next-line no-redeclare
export type PermissionAction = (typeof PermissionAction)[keyof typeof PermissionAction]
