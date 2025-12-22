// User types
export enum UserRole {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT',
  NURSE = 'NURSE',
}

export interface User {
  id: string
  email: string
  password: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
  // Common profile fields
  fullName?: string
  phoneNumber?: string
  dateOfBirth?: Date
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
  profilePhotoUrl?: string
  isMfaEnabled?: boolean
}

// Patient types
export interface Patient {
  id: string
  userId: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  phoneNumber: string
  address: string
  emergencyContact?: string
  bloodGroup?: string
  allergies?: string[]
  medicalHistory?: string
  createdAt: Date
  updatedAt: Date
}

// Doctor types
export interface Doctor {
  id: string
  userId: string
  firstName: string
  lastName: string
  specialization: string
  qualification: string
  experience: number
  phoneNumber: string
  licenseNumber: string
  consultationFee: number
  availableDays: string[]
  availableTimeSlots: TimeSlot[]
  createdAt: Date
  updatedAt: Date
  clinicId?: string
  timezone?: string
  availabilityStatus?: DoctorAvailabilityStatus
  isAvailable?: boolean
  currentPatientId?: string | null
  currentQueueEntryId?: string | null
  lastStatusChange?: Date | null
  averageConsultationTime?: number
  todayServed?: number
  todayNoShows?: number
  totalServed?: number
  allowWalkIns?: boolean
  allowOnlineBooking?: boolean
  autoCallNext?: boolean
  noShowTimeout?: number
}

export interface Clinic {
  id: string
  name: string
  address: string
  phone: string
  consultationFee: number
  createdAt: Date
  updatedAt: Date
}

export interface Specialization {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface DoctorAvailability {
  id: string
  doctorId: string
  dayOfWeek: number // 0-6
  startTime: string
  endTime: string
  hasBreak: boolean
  breakStart?: string
  breakEnd?: string
  isAvailable: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PreferredDoctor {
  id: string
  patientId: string
  doctorId: string
  createdAt: Date
}

export interface TimeSlot {
  startTime: string
  endTime: string
}

// Appointment types
export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  dateTime: Date
  duration: number // in minutes
  status: AppointmentStatus
  reason: string
  notes?: string
  prescription?: string
  createdAt: Date
  updatedAt: Date
}

// Prescription types
export interface Prescription {
  id: string
  appointmentId: string
  patientId: string
  doctorId: string
  medications: Medication[]
  diagnosis: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Queue types
export enum QueueType {
  WALK_IN = 'WALK_IN',
  ONLINE_BOOKING = 'ONLINE_BOOKING',
}

export enum QueueStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum DoctorAvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  BREAK = 'BREAK',
  OFF_DUTY = 'OFF_DUTY',
}

export interface QueueEntry {
  id: string
  serialNumber: string
  doctorId: string
  patientId: string
  appointmentId?: string | null
  queueType: QueueType
  status: QueueStatus
  priority: number
  position: number
  estimatedWaitTime?: number | null
  checkInTime: Date
  scheduledTime?: Date | null
  calledTime?: Date | null
  completedTime?: Date | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}
