import axios from "axios"
import { tokenManager } from "../utils/tokenManager"

// Use NEXT_PUBLIC_API_URL from .env.local, which already includes /api
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1080/api'

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
