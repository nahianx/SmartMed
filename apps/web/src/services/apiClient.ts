import axios from 'axios'
import { tokenManager } from '../utils/tokenManager'
import { getApiBaseWithApi } from '../utils/apiBase'

const baseURL = getApiBaseWithApi()

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
})

// Add auth token and CSRF token to requests
apiClient.interceptors.request.use((request) => {
  const token = tokenManager.getAccessToken()
  if (token) {
    request.headers = request.headers || {}
    request.headers.Authorization = `Bearer ${token}`
  }

  const csrf = getCookie('csrf-token')
  if (csrf) {
    request.headers = request.headers || {}
    request.headers['x-csrf-token'] = csrf
  }

  return request
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      tokenManager.clear()
    }
    return Promise.reject(error)
  }
)
