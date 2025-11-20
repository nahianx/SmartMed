"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { authService } from "../../../services/authService"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authService.requestPasswordReset(email)
      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center">Reset your password</h1>
        <p className="text-sm text-slate-600 text-center mb-6">
          Enter your email address and we&apos;ll send you a reset link.
        </p>
        {submitted ? (
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent
              a password reset link.
            </p>
            <p>Please check your email inbox and follow the instructions.</p>
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
