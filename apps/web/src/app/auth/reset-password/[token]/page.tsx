"use client"

import { FormEvent, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { authService } from "../../../../services/authService"

export default function ResetPasswordTokenPage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      await authService.completePasswordReset(token, password)
      setSuccess(true)
      setTimeout(() => router.push("/auth/login"), 2000)
    } catch {
      setError("Reset link is invalid or expired.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-semibold mb-2 text-center">Set a new password</h1>
        <p className="text-sm text-slate-600 text-center mb-6">
          Choose a strong password that you don&apos;t use elsewhere.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">Password updated. Redirecting...</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  )
}
