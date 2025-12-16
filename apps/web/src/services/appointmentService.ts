import { apiClient } from './apiClient'

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  dateTime: string
  duration: number
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  reason: string
  notes?: string
  createdAt: string
  updatedAt: string
  patient?: {
    id: string
    firstName: string
    lastName: string
    phoneNumber?: string
    dateOfBirth?: string
    gender?: string
    bloodGroup?: string
    allergies?: any
    medicalHistory?: string
    address?: string
    emergencyContact?: string
  }
  doctor?: {
    id: string
    firstName: string
    lastName: string
    specialization?: string
    consultationFee?: number
  }
  prescriptions?: Prescription[]
  reports?: Report[]
}

export interface Prescription {
  id: string
  appointmentId: string
  patientId: string
  doctorId: string
  medications: any
  diagnosis: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Report {
  id: string
  patientId: string
  doctorId?: string
  appointmentId?: string
  fileKey: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: string
  notes?: string
}

export interface PreviousVisit {
  id: string
  dateTime: string
  reason: string
  diagnosis?: string
  notes?: string
}

class AppointmentService {
  async getAllAppointments(): Promise<Appointment[]> {
    const response = await apiClient.get('/appointments')
    return response.data.appointments
  }

  async createAppointment(data: {
    patientId: string
    doctorId: string
    dateTime: string
    duration: number
    reason: string
    notes?: string
  }): Promise<Appointment> {
    const response = await apiClient.post('/appointments', data)
    return response.data.appointment
  }

  async searchPatients(query: string): Promise<any[]> {
    const response = await apiClient.get('/patient/search', {
      params: { q: query },
    })
    return response.data.patients
  }

  async searchDoctors(query: string): Promise<any[]> {
    const response = await apiClient.get('/doctors/search', {
      params: { q: query },
    })
    return response.data.doctors
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    const response = await apiClient.get(`/appointments/${id}`)
    return response.data.appointment
  }

  async updateAppointmentStatus(
    id: string,
    status: 'COMPLETED' | 'NO_SHOW'
  ): Promise<Appointment> {
    const response = await apiClient.put(`/appointments/${id}`, { status })
    return response.data.appointment
  }

  async getPreviousVisits(patientId: string): Promise<PreviousVisit[]> {
    // Get completed appointments for this patient
    const response = await apiClient.get('/appointments')
    const allAppointments = response.data.appointments as Appointment[]

    return allAppointments
      .filter(
        (apt) => apt.patientId === patientId && apt.status === 'COMPLETED'
      )
      .map((apt) => ({
        id: apt.id,
        dateTime: apt.dateTime,
        reason: apt.reason,
        diagnosis: apt.prescriptions?.[0]?.diagnosis,
        notes: apt.notes,
      }))
      .sort(
        (a, b) =>
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
      )
  }

  async getActivePrescriptions(patientId: string): Promise<Prescription[]> {
    // Get prescriptions from recent appointments
    const response = await apiClient.get('/appointments')
    const allAppointments = response.data.appointments as Appointment[]

    const prescriptions: Prescription[] = []
    allAppointments
      .filter((apt) => apt.patientId === patientId && apt.prescriptions)
      .forEach((apt) => {
        if (apt.prescriptions) {
          prescriptions.push(...apt.prescriptions)
        }
      })

    return prescriptions
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5) // Get latest 5
  }

  async getMedicalReports(patientId: string): Promise<Report[]> {
    const response = await apiClient.get('/appointments')
    const allAppointments = response.data.appointments as Appointment[]

    const reports: Report[] = []
    allAppointments
      .filter((apt) => apt.patientId === patientId && apt.reports)
      .forEach((apt) => {
        if (apt.reports) {
          reports.push(...apt.reports)
        }
      })

    return reports.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }
}

export const appointmentService = new AppointmentService()
