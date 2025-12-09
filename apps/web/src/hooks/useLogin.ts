import { useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "../services/authService"
import { tokenManager } from "../utils/tokenManager"
import { useAuthContext } from "../context/AuthContext"

interface LoginData {
  email: string
  password: string
  remember?: boolean
}

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { setUser, setAccessToken } = useAuthContext()

  const login = async (data: LoginData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await authService.login({
        email: data.email,
        password: data.password
      })
      
      setUser(result.user)
      setAccessToken(result.accessToken)
      tokenManager.setAccessToken(result.accessToken, data.remember || false)
      
      // Redirect based on role
      if (result.user.role === "DOCTOR") {
        router.push("/profile?role=DOCTOR")
      } else if (result.user.role === "PATIENT") {
        router.push("/profile?role=PATIENT")
      } else if (result.user.role === "ADMIN") {
        router.push("/dashboard/admin")
      } else {
        router.push("/")
      }
      
      return result
    } catch (err: any) {
      if (err.response?.data?.error === "INVALID_CREDENTIALS") {
        setError("Invalid email or password")
      } else if (err.response?.data?.error === "ACCOUNT_INACTIVE") {
        setError("Your account has been deactivated")
      } else {
        setError("Login failed. Please try again.")
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await authService.logout()
      setUser(null)
      setAccessToken(null)
      tokenManager.clear()
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout failed:", error)
      // Clear local state even if API call fails
      setUser(null)
      setAccessToken(null)
      tokenManager.clear()
      router.push("/auth/login")
    } finally {
      setLoading(false)
    }
  }

  return {
    login,
    logout,
    loading,
    error,
    setError
  }
}
