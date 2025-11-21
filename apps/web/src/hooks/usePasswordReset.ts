import { useState } from "react"
import { authService } from "../services/authService"

export function usePasswordReset() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const requestReset = async (email: string) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await authService.requestPasswordReset(email)
      setSuccess(true)
    } catch (err: any) {
      setError("Failed to send reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const verifyToken = async (token: string) => {
    setLoading(true)
    setError(null)

    try {
      await authService.verifyPasswordResetToken(token)
      return true
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError("Invalid or expired reset link")
      } else {
        setError("Verification failed. Please try again.")
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  const completeReset = async (token: string, newPassword: string) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await authService.completePasswordReset(token, newPassword)
      setSuccess(true)
      return true
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError("Invalid or expired reset link")
      } else {
        setError("Failed to reset password. Please try again.")
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    requestReset,
    verifyToken,
    completeReset,
    loading,
    error,
    success,
    setError
  }
}