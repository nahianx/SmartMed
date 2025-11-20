"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { authService } from "../../../../services/authService"
import { tokenManager } from "../../../../utils/tokenManager"
import { useRouter } from "next/navigation"
import { GoogleSignInButton } from "../../../../components/auth/GoogleSignInButton"
import { getPasswordStrength } from "../../../../utils/passwordStrength"
import { validateEmailFormat, validateName, validatePasswordBasic } from "../../../../utils/validators"

export default function PatientRegisterPage() {
  const router = useRouter()
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

      const { user, accessToken } = await authService.registerPatient({ fullName, email, password })
      tokenManager.setAccessToken(accessToken, true)
      if (user.role === "PATIENT") router.push("/dashboard/patient")
      else router.push("/")
    } catch (err: any) {
      setError("Registration failed. Please check your details.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center">Create Patient Account</h1>
        <p className="text-sm text-slate-600 text-center mb-6">
          Sign up as a patient to manage your SmartMed appointments.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password
            </label>
            {passwordError && <p className="mb-1 text-xs text-red-600">{passwordError}</p>}
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-600">
              Strength: <span className={strength === "weak" ? "text-red-600" : strength === "medium" ? "text-amber-500" : "text-emerald-600"}>{strength}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span>
              I agree to the <span className="text-blue-600">terms and conditions</span>.
            </span>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 text-white py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <GoogleSignInButton role="PATIENT" />
        <div className="mt-4 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </main>
  )
}
