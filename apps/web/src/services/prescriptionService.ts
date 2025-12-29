import { apiClient } from './apiClient'

export interface Medication {
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface Prescription {
  id: string
  appointmentId: string
  patientId: string
  doctorId: string
  diagnosis: string
  medications: Medication[]
  notes?: string
  createdAt: string
  updatedAt: string
  patient?: {
    id: string
    userId: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
  }
  doctor?: {
    id: string
    userId: string
    firstName: string
    lastName: string
    specialization: string
    qualification: string
  }
  appointment?: {
    id: string
    dateTime: string
    reason: string
    status: string
  }
}

export interface PrescriptionListResponse {
  prescriptions: Prescription[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class PrescriptionService {
  async createPrescription(data: {
    appointmentId: string
    patientId: string
    diagnosis: string
    medications: Medication[]
    notes?: string
  }): Promise<Prescription> {
    const response = await apiClient.post('/prescriptions', data)
    return response.data
  }

  async updatePrescription(
    prescriptionId: string,
    data: {
      diagnosis?: string
      medications?: Medication[]
      notes?: string
    }
  ): Promise<Prescription> {
    const response = await apiClient.patch(
      `/prescriptions/${prescriptionId}`,
      data
    )
    return response.data
  }

  async getPrescriptionById(prescriptionId: string): Promise<Prescription> {
    const response = await apiClient.get(`/prescriptions/${prescriptionId}`)
    return response.data
  }

  async getPrescriptionsByPatient(
    patientId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PrescriptionListResponse> {
    const offset = (page - 1) * limit
    const response = await apiClient.get(
      `/prescriptions/patient/${patientId}`,
      {
        params: { offset, limit },
      }
    )
    return response.data
  }

  async getPrescriptionsByDoctor(
    doctorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PrescriptionListResponse> {
    const offset = (page - 1) * limit
    const response = await apiClient.get(`/prescriptions/doctor/${doctorId}`, {
      params: { offset, limit },
    })
    return response.data
  }
}

export const prescriptionService = new PrescriptionService()
