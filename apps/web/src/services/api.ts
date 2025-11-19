// API service layer for profile management
import axios, { AxiosResponse } from 'axios'
import { ApiResponse, User, Doctor, Patient, DoctorAvailability, PreferredDoctor, Specialization } from '@smartmed/types'

// Configure axios instance
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1080/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  // Get token from auth store
  const token = localStorage.getItem('smartmed-auth')
  if (token) {
    try {
      const authData = JSON.parse(token)
      if (authData?.state?.token) {
        config.headers.Authorization = `Bearer ${authData.state.token}`
      }
    } catch (error) {
      console.error('Error parsing auth token:', error)
    }
  }
  return config
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state on unauthorized
      localStorage.removeItem('smartmed-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Profile API Services
export const profileApi = {
  // Get user profile
  getProfile: async (): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.get('/profile')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to fetch profile')
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.put('/profile', updates)
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to update profile')
  },

  // Upload profile photo
  uploadPhoto: async (file: File): Promise<{ profilePhotoUrl: string }> => {
    const formData = new FormData()
    formData.append('photo', file)
    
    const response: AxiosResponse<ApiResponse<{ profilePhotoUrl: string }>> = await apiClient.post(
      '/profile/photo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to upload photo')
  },

  // Remove profile photo
  removePhoto: async (): Promise<void> => {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.delete('/profile/photo')
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove photo')
    }
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.put('/profile/password', {
      currentPassword,
      newPassword
    })
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to change password')
    }
  },

  // Toggle MFA
  toggleMFA: async (enabled: boolean): Promise<void> => {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.post('/profile/mfa', {
      enabled
    })
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to toggle MFA')
    }
  }
}

// Doctor API Services
export const doctorApi = {
  // Search doctors
  searchDoctors: async (query?: string, specialization?: string): Promise<Doctor[]> => {
    const params = new URLSearchParams()
    if (query) params.append('query', query)
    if (specialization) params.append('specialization', specialization)
    
    const response: AxiosResponse<ApiResponse<Doctor[]>> = await apiClient.get(`/doctor/search?${params}`)
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to search doctors')
  },

  // Get doctor profile
  getDoctorProfile: async (): Promise<Doctor> => {
    const response: AxiosResponse<ApiResponse<Doctor>> = await apiClient.get('/doctor/profile')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to fetch doctor profile')
  },

  // Update doctor specializations
  updateSpecializations: async (specializationIds: string[]): Promise<void> => {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.put('/doctor/specializations', {
      specializationIds
    })
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update specializations')
    }
  },

  // Update clinic info
  updateClinicInfo: async (clinicInfo: { name: string; address: string; phone: string; consultationFee: number }): Promise<void> => {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.put('/doctor/clinic', clinicInfo)
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update clinic info')
    }
  },

  // Get doctor availability
  getAvailability: async (): Promise<DoctorAvailability[]> => {
    const response: AxiosResponse<ApiResponse<DoctorAvailability[]>> = await apiClient.get('/doctor/availability')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to fetch availability')
  },

  // Update doctor availability
  updateAvailability: async (availability: Omit<DoctorAvailability, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>[]): Promise<DoctorAvailability[]> => {
    const response: AxiosResponse<ApiResponse<DoctorAvailability[]>> = await apiClient.put('/doctor/availability', {
      availability
    })
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to update availability')
  },

  // Delete availability slot
  deleteAvailabilitySlot: async (slotId: string): Promise<void> => {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.delete(`/doctor/availability/${slotId}`)
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete availability slot')
    }
  },

  // Get all specializations
  getSpecializations: async (): Promise<Specialization[]> => {
    const response: AxiosResponse<ApiResponse<Specialization[]>> = await apiClient.get('/doctor/specializations/list')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to fetch specializations')
  }
}

// Patient API Services
export const patientApi = {
  // Get patient profile
  getPatientProfile: async (): Promise<Patient> => {
    const response: AxiosResponse<ApiResponse<Patient>> = await apiClient.get('/patient/profile')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to fetch patient profile')
  },

  // Get preferred doctors
  getPreferredDoctors: async (): Promise<Doctor[]> => {
    const response: AxiosResponse<ApiResponse<Doctor[]>> = await apiClient.get('/patient/preferred-doctors')
    if (response.data.success && response.data.data) {
      return response.data.data
    }
    throw new Error(response.data.error || 'Failed to fetch preferred doctors')
  },

  // Add preferred doctor
  addPreferredDoctor: async (doctorId: string): Promise<void> => {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.post(`/patient/preferred-doctors/${doctorId}`)
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add preferred doctor')
    }
  },

  // Remove preferred doctor
  removePreferredDoctor: async (doctorId: string): Promise<void> => {
    const response: AxiosResponse<ApiResponse<void>> = await apiClient.delete(`/patient/preferred-doctors/${doctorId}`)
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove preferred doctor')
    }
  }
}