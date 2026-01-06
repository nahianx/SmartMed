import { apiClient } from './apiClient'

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  dateTime: string
  duration: number
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'SCHEDULED'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW'
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
    status: 'COMPLETED' | 'NO_SHOW',
    _reason?: string
  ): Promise<Appointment> {
    const route = status === 'COMPLETED' ? 'complete' : 'no-show'
    const response = await apiClient.patch(`/appointments/${id}/${route}`)
    return response.data.appointment
  }

  async validateAppointment(data: {
    doctorId: string
    dateTime: string
    duration: number
  }): Promise<{ valid: boolean; conflicts?: any[] }> {
    try {
      const response = await apiClient.post('/appointments/validate', data)
      return response.data
    } catch (error: any) {
      // If endpoint missing, allow flow to continue
      if (error?.response?.status === 404) return { valid: true }
      throw error
    }
  }

  async getDoctorAvailability(options: {
    doctorId: string
    startDate: Date
    endDate: Date
    duration?: number
  }): Promise<
    Array<{
      date: string
      startTime: string
      endTime: string
      isAvailable: boolean
    }>
  > {
    const response = await apiClient.get(
      `/doctors/${options.doctorId}/availability`,
      {
        params: {
          startDate: options.startDate.toISOString(),
          endDate: options.endDate.toISOString(),
          duration: options.duration,
        },
      }
    )
    return response.data.slots || []
  }

  async acceptAppointment(id: string): Promise<Appointment> {
    const response = await apiClient.patch(`/appointments/${id}/accept`)
    return response.data.appointment
  }

  async rejectAppointment(id: string): Promise<Appointment> {
    const response = await apiClient.patch(`/appointments/${id}/reject`)
    return response.data.appointment
  }

  async cancelAppointment(id: string): Promise<Appointment> {
    const response = await apiClient.delete(`/appointments/${id}`)
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

  async updateAppointmentNotes(
    id: string,
    notes: string
  ): Promise<Appointment> {
    // The backend exposes a PUT /appointments/:id endpoint that accepts notes in the body.
    // Use that instead of a non-existent /appointments/:id/notes route which returns 404.
    const response = await apiClient.put(`/appointments/${id}`, { notes })
    return response.data.appointment
  }

  /**
   * Get available slots for rescheduling an appointment
   */
  async getRescheduleSlots(
    appointmentId: string,
    options?: { startDate?: string; endDate?: string }
  ): Promise<{
    appointment: {
      id: string
      currentDateTime: string
      duration: number
      doctor: { id: string; name: string }
    }
    availableSlots: Array<{ date: string; time: string; dateTime: string }>
    rules: { maxReschedules: number; minHoursBeforeReschedule: number }
  }> {
    const response = await apiClient.get(
      `/appointments/${appointmentId}/reschedule/available-slots`,
      { params: options }
    )
    return response.data
  }

  /**
   * Reschedule an appointment to a new date/time
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDateTime: string,
    reason?: string
  ): Promise<{
    message: string
    appointment: Appointment
    rescheduleCount: number
    remainingReschedules: number
  }> {
    const response = await apiClient.post(
      `/appointments/${appointmentId}/reschedule`,
      { newDateTime, reason }
    )
    return response.data
  }

  /**
   * Get reschedule history for an appointment
   */
  async getRescheduleHistory(appointmentId: string): Promise<{
    appointmentId: string
    currentDateTime: string
    rescheduleHistory: Array<{
      previousDateTime: string
      newDateTime: string
      rescheduleReason: string | null
      rescheduledAt: string
      rescheduledBy: string
    }>
    rescheduleCount: number
    remainingReschedules: number
    canReschedule: boolean
  }> {
    const response = await apiClient.get(
      `/appointments/${appointmentId}/reschedule/history`
    )
    return response.data
  }
}

export const appointmentService = new AppointmentService()
