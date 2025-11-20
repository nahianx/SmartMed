import axios from "axios"
import config from "@smartmed/config"
import { tokenManager } from "../utils/tokenManager"

export const apiClient = axios.create({
  baseURL: `${config.api.url}/api`,
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
