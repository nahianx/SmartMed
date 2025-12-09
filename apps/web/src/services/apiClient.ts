import axios from "axios"
import { tokenManager } from "../utils/tokenManager"

// Use NEXT_PUBLIC_API_URL from .env.local (should point to the API base and include /api)
const baseURL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "")

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
})

apiClient.interceptors.request.use((request) => {
  const token = tokenManager.getAccessToken()
  if (token) {
    request.headers = request.headers || {}
    request.headers.Authorization = `Bearer ${token}`
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
  },
)
