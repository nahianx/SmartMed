import { apiClient } from "./apiClient"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  password: string
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await apiClient.post("/auth/login", payload)
    return data as { user: any; accessToken: string }
  },
  async registerDoctor(payload: RegisterPayload) {
    const { data } = await apiClient.post("/auth/register/doctor", payload)
    return data as { user: any; accessToken: string }
  },
  async registerPatient(payload: RegisterPayload) {
    const { data } = await apiClient.post("/auth/register/patient", payload)
    return data as { user: any; accessToken: string }
  },
  async me(accessToken: string) {
    const { data } = await apiClient.get("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return data as any
  },
  async logout() {
    await apiClient.post("/auth/logout")
  },
  async requestPasswordReset(email: string) {
    await apiClient.post("/auth/password-reset/request", { email })
  },
  async completePasswordReset(token: string, newPassword: string) {
    await apiClient.post("/auth/password-reset/complete", { token, newPassword })
  },
  async verifyEmail(token: string) {
    const { data } = await apiClient.post(`/auth/verify-email/${token}`)
    return data
  },
  async checkEmail(email: string) {
    const { data } = await apiClient.get("/auth/check-email", { params: { email } })
    return data as { exists: boolean }
  },
  async googleSignIn(idToken: string, role?: string) {
    const { data } = await apiClient.post("/auth/google", { idToken, role })
    return data as { user: any; accessToken: string }
  },
}
