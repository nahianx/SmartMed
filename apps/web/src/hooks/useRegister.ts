import { useState } from "react"
import { useRouter } from "next/navigation"
import { authService } from "../services/authService"
import { tokenManager } from "../utils/tokenManager"
import { useAuthContext } from "../context/AuthContext"

interface RegisterData {
  fullName: string
  email: string
  password: string
}

export function useRegister() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { setUser, setAccessToken } = useAuthContext()

  const registerDoctor = async (data: RegisterData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await authService.registerDoctor(data)
      
      setUser(result.user)
      setAccessToken(result.accessToken)
      tokenManager.setAccessToken(result.accessToken, true)
      
      router.push("/profile?role=DOCTOR")
      return result
    } catch (err: any) {
      if (err.response?.data?.error === "EMAIL_ALREADY_IN_USE") {
        setError("This email is already registered")
      } else {
        setError("Registration failed. Please try again.")
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  const registerPatient = async (data: RegisterData) => {
    setLoading(true)
    setError(null)

    try {
      const result = await authService.registerPatient(data)
      
      setUser(result.user)
      setAccessToken(result.accessToken)
      tokenManager.setAccessToken(result.accessToken, true)
      
      router.push("/profile?role=PATIENT")
      return result
    } catch (err: any) {
      if (err.response?.data?.error === "EMAIL_ALREADY_IN_USE") {
        setError("This email is already registered")
      } else {
        setError("Registration failed. Please try again.")
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    registerDoctor,
    registerPatient,
    loading,
    error,
    setError
  }
}
