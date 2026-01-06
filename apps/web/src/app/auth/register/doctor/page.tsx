"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { authService } from "../../../../services/authService"
import { tokenManager } from "../../../../utils/tokenManager"
import { useRouter } from "next/navigation"
import { GoogleSignInButton } from "../../../../components/auth/GoogleSignInButton"
import { getPasswordStrength } from "../../../../utils/passwordStrength"
import { validateEmailFormat, validateName, validatePasswordBasic } from "../../../../utils/validators"
import { useAuthContext } from "../../../../context/AuthContext"

export default function DoctorRegisterPage() {
  const router = useRouter()
  const { setUser, setAccessToken } = useAuthContext()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const strength = getPasswordStrength(password)
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailError(null)
    setNameError(null)
    setPasswordError(null)

    if (!validateName(fullName)) {
      setNameError("Please enter a valid full name.")
      return
    }

    if (!validateEmailFormat(email)) {
      setEmailError("Please enter a valid email address.")
      return
    }

    const pw = validatePasswordBasic(password)
    if (!pw.valid) {
      setPasswordError(pw.message || "Password does not meet requirements.")
      return
    }

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (!terms) {
      setError("You must accept the terms and conditions.")
      return
    }
    setLoading(true)
    try {
      const { exists } = await authService.checkEmail(email)
      if (exists) {
        setEmailError("This email is already in use.")
        setLoading(false)
        return
      }

      const { user, accessToken } = await authService.registerDoctor({ fullName, email, password })
      tokenManager.setAccessToken(accessToken, true)
      setUser(user)
      setAccessToken(accessToken)
      if (user.role === "DOCTOR") router.push("/profile?role=DOCTOR")
      else router.push("/")
    } catch (err: any) {
      setError("Registration failed. Please check your details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card shadow-lg rounded-2xl p-8 border border-border">
        <h1 className="text-2xl font-semibold mb-2 text-center text-foreground">Create Doctor Account</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Sign up as a doctor to manage your SmartMed patients.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "fullName-error" : undefined}
              className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {nameError && <p id="fullName-error" role="alert" className="mt-1 text-xs text-destructive">{nameError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
              className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-destructive">{emailError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground" htmlFor="password">
              Password
            </label>
            {passwordError && <p id="password-error" role="alert" className="mb-1 text-xs text-destructive">{passwordError}</p>}
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error" : undefined}
              className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Strength: <span className={strength === "weak" ? "text-destructive" : strength === "medium" ? "text-amber-500" : "text-emerald-600"}>{strength}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              aria-invalid={!!error}
              aria-describedby={error ? "form-error" : undefined}
              className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span>
              I agree to the <span className="text-primary cursor-pointer hover:underline">terms and conditions</span>
            </span>
          </div>
          {error && (
            <p id="form-error" role="alert" aria-live="assertive" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <GoogleSignInButton role="DOCTOR" />
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Login
          </Link>
        </div>
      </div>
    </main>
  )
}
