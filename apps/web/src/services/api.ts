// API service layer for profile management
import axios, { AxiosResponse } from 'axios'
import { User, Doctor, Patient, DoctorAvailability, Specialization } from '@smartmed/types'
import { tokenManager } from '@/utils/tokenManager'

// Configure axios instance
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '')

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
})

// Backend response types (raw data format)
interface ProfileResponse {
  user?: User
  message?: string
  error?: string
}

interface DoctorResponse {
  doctor?: Doctor
  doctors?: Doctor[]
  message?: string
  error?: string
}

interface PatientResponse {
  patient?: Patient
  message?: string
  error?: string
}

interface AvailabilityResponse {
  slots?: DoctorAvailability[]
  message?: string
  error?: string
}

interface PreferredDoctorsResponse {
  preferred?: Doctor[]
  message?: string
  error?: string
}

interface SpecializationsResponse {
  specializations?: Specialization[]
  message?: string
  error?: string
}

interface PhotoUploadResponse {
  url?: string
  message?: string
  error?: string
}

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  const csrf = getCookie('csrf-token')
  if (csrf) {
    config.headers = config.headers || {}
    config.headers['x-csrf-token'] = csrf
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenManager.clear()
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

// Profile API Services
export const profileApi = {
  // Get user profile - Backend returns the user object directly or { user }
  getProfile: async (userId?: string): Promise<User> => {
    const response: AxiosResponse<ProfileResponse | User> = await apiClient.get('/profile', {
      params: userId ? { userId } : undefined,
    })
    // Handle both raw user object and wrapped { user } response
    const data = response.data
    if ('user' in data && data.user) {
      return data.user
    }
    if ('id' in data && 'email' in data) {
      return data as User
    }
    throw new Error((data as ProfileResponse).error || 'Failed to fetch profile')
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const response: AxiosResponse<ProfileResponse> = await apiClient.put('/profile', updates)
    if (response.data.user) {
      return response.data.user
    }
    throw new Error(response.data.error || 'Failed to update profile')
  },

  // Upload profile photo
  uploadPhoto: async (file: File): Promise<{ profilePhotoUrl: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response: AxiosResponse<PhotoUploadResponse> = await apiClient.post(
      '/profile/photo',
      formData
    )
    
    if (response.data.url) {
      return { profilePhotoUrl: response.data.url }
    }
    throw new Error(response.data.error || 'Failed to upload photo')
  },

  // Remove profile photo
  removePhoto: async (): Promise<void> => {
    const response: AxiosResponse<{ message?: string; error?: string }> = await apiClient.delete('/profile/photo')
    if (response.data.error) {
      throw new Error(response.data.error)
    }
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response: AxiosResponse<{ message?: string; error?: string }> = await apiClient.post('/profile/password', {
      currentPassword,
      newPassword
    })
    if (response.data.error) {
      throw new Error(response.data.error)
    }
  },

  // Toggle MFA
  toggleMFA: async (enabled: boolean): Promise<void> => {
    const response: AxiosResponse<{ message?: string; error?: string }> = await apiClient.post('/profile/mfa', {
      enabled
    })
    if (response.data.error) {
      throw new Error(response.data.error)
    }
  }
}

// Doctor API Services
export const doctorApi = {
  // Search doctors
  searchDoctors: async (query?: string, specialization?: string): Promise<Doctor[]> => {
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (specialization) params.append('specialization', specialization)
    
    const response: AxiosResponse<DoctorResponse> = await apiClient.get(`/doctor/search?${params}`)
    return response.data.doctors || []
  },

  // Get doctor profile
  getDoctorProfile: async (userId?: string): Promise<Doctor> => {
    const response: AxiosResponse<DoctorResponse> = await apiClient.get('/doctor/profile', {
      params: userId ? { userId } : undefined,
    })
    if (response.data.doctor) {
      return response.data.doctor
    }
    throw new Error(response.data.error || 'Failed to fetch doctor profile')
  },

  // Update doctor specializations
  updateSpecializations: async (specializationIds: string[]): Promise<void> => {
    const response: AxiosResponse<{ message?: string; error?: string }> = await apiClient.put('/doctor/specialization', {
      specializations: specializationIds
    })
    if (response.data.error) {
      throw new Error(response.data.error)
    }
  },

  // Update clinic info
  updateClinicInfo: async (clinicInfo: { name: string; address: string; phone: string; consultationFee: number }): Promise<void> => {
    const response: AxiosResponse<{ message?: string; error?: string }> = await apiClient.put('/doctor/clinic', clinicInfo)
    if (response.data.error) {
      throw new Error(response.data.error)
    }
  },

  // Get doctor availability
  getAvailability: async (): Promise<DoctorAvailability[]> => {
    const response: AxiosResponse<AvailabilityResponse> = await apiClient.get('/doctor/availability')
    return response.data.slots || []
  },

  validateAvailability: async (availability: Omit<DoctorAvailability, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>[]) => {
    try {
      const response: AxiosResponse<{ valid: boolean; conflicts?: any[] }> = await apiClient.post('/doctor/availability/validate', {
        slots: availability
      })
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 404) return { valid: true }
      throw error
    }
  },

  // Update doctor availability
  updateAvailability: async (availability: Omit<DoctorAvailability, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>[]): Promise<DoctorAvailability[]> => {
    const response: AxiosResponse<AvailabilityResponse> = await apiClient.put('/doctor/availability', {
      slots: availability
    })
    return response.data.slots || []
  },

  // Delete availability slot
  deleteAvailabilitySlot: async (slotId: string): Promise<void> => {
    const response: AxiosResponse<{ message?: string; error?: string }> = await apiClient.delete(`/doctor/availability/${slotId}`)
    if (response.data.error) {
      throw new Error(response.data.error)
    }
  },

  // Get all specializations
  getSpecializations: async (): Promise<Specialization[]> => {
    const response: AxiosResponse<SpecializationsResponse> = await apiClient.get('/doctor/specializations/list')
    return response.data.specializations || []
  }
}

// Patient API Services
export const patientApi = {
  // Get patient profile
  getPatientProfile: async (): Promise<Patient> => {
    const response: AxiosResponse<PatientResponse> = await apiClient.get('/patient/profile')
    if (response.data.patient) {
      return response.data.patient
    }
    throw new Error(response.data.error || 'Failed to fetch patient profile')
  },

  // Get preferred doctors
  getPreferredDoctors: async (): Promise<Doctor[]> => {
    const response: AxiosResponse<PreferredDoctorsResponse> = await apiClient.get('/patient/preferred-doctors')
    return response.data.preferred || []
  },

  // Add preferred doctor
  addPreferredDoctor: async (doctorId: string): Promise<void> => {
    const response: AxiosResponse<{ message?: string; error?: string }> = await apiClient.post(`/patient/preferred-doctors/${doctorId}`)
    if (response.data.error) {
      throw new Error(response.data.error)
    }
  },

  // Remove preferred doctor
  removePreferredDoctor: async (doctorId: string): Promise<void> => {
    const response: AxiosResponse<{ message?: string; error?: string }> = await apiClient.delete(`/patient/preferred-doctors/${doctorId}`)
    if (response.data.error) {
      throw new Error(response.data.error)
    }
  }
}
