import { useState, useEffect } from "react"
import { authService } from "../services/authService"
import { validateEmailFormat, validateName, validatePasswordBasic } from "../utils/validators"

interface UseFormValidationProps {
  email?: string
  fullName?: string
  password?: string
  confirmPassword?: string
  termsAccepted?: boolean
  checkEmailAvailability?: boolean
}

interface ValidationErrors {
  email?: string
  fullName?: string
  password?: string
  confirmPassword?: string
  terms?: string
}

export function useFormValidation({
  email = "",
  fullName = "",
  password = "",
  confirmPassword = "",
  termsAccepted = false,
  checkEmailAvailability = false
}: UseFormValidationProps) {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isValidating, setIsValidating] = useState(false)

  // Real-time email availability check
  useEffect(() => {
    if (checkEmailAvailability && email && validateEmailFormat(email) && !errors.email) {
      const timeoutId = setTimeout(async () => {
        setIsValidating(true)
        try {
          const result = await authService.checkEmail(email)
          if (result.exists) {
            setErrors(prev => ({ ...prev, email: "This email is already registered" }))
          } else {
            setErrors(prev => ({ ...prev, email: "" }))
          }
        } catch (error) {
          console.error("Email check failed:", error)
        } finally {
          setIsValidating(false)
        }
      }, 500) // Debounce for 500ms

      return () => clearTimeout(timeoutId)
    }
  }, [email, checkEmailAvailability, errors.email])

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }

    switch (field) {
      case "email":
        if (!value) {
          newErrors.email = "Email is required"
        } else if (!validateEmailFormat(value)) {
          newErrors.email = "Please enter a valid email address"
        } else {
          newErrors.email = ""
        }
        break

      case "fullName":
        if (!value.trim()) {
          newErrors.fullName = "Full name is required"
        } else if (!validateName(value)) {
          newErrors.fullName = "Name can only contain letters, spaces, and hyphens"
        } else if (value.trim().length < 2) {
          newErrors.fullName = "Name must be at least 2 characters"
        } else {
          newErrors.fullName = ""
        }
        break

      case "password":
        if (!value) {
          newErrors.password = "Password is required"
        } else {
          const validation = validatePasswordBasic(value)
          newErrors.password = validation.valid ? "" : validation.message || "Invalid password"
        }
        break

      case "confirmPassword":
        if (!value) {
          newErrors.confirmPassword = "Please confirm your password"
        } else if (value !== password) {
          newErrors.confirmPassword = "Passwords do not match"
        } else {
          newErrors.confirmPassword = ""
        }
        break

      case "terms":
        newErrors.terms = termsAccepted ? "" : "You must accept the terms and conditions"
        break
    }

    setErrors(newErrors)
    return !newErrors[field as keyof ValidationErrors]
  }

  const validateAll = () => {
    const fields = []
    if (email !== undefined) fields.push(["email", email])
    if (fullName !== undefined) fields.push(["fullName", fullName])
    if (password !== undefined) fields.push(["password", password])
    if (confirmPassword !== undefined) fields.push(["confirmPassword", confirmPassword])
    if (termsAccepted !== undefined) fields.push(["terms", termsAccepted.toString()])

    let isValid = true
    fields.forEach(([field, value]) => {
      if (!validateField(field, value)) {
        isValid = false
      }
    })

    return isValid
  }

  const clearError = (field: keyof ValidationErrors) => {
    setErrors(prev => ({ ...prev, [field]: "" }))
  }

  const hasErrors = Object.values(errors).some(error => error && error.length > 0)

  return {
    errors,
    isValidating,
    validateField,
    validateAll,
    clearError,
    hasErrors
  }
}