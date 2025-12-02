import axios from 'axios'
import { toast } from 'react-hot-toast'

const baseURL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000'

export const apiClient = axios.create({
  baseURL,
  withCredentials: false,
})

// Global response error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.config?.skipToast) {
      return Promise.reject(error)
    }
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      (error.message === 'Network Error' ? 'Network error. Please check your connection.' : 'Request failed')
    toast.error(message)
    return Promise.reject(error)
  },
)
