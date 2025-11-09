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
