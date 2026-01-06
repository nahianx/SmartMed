"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { authService } from "../../../../services/authService"

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    authService
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"))
  }, [token])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card shadow-lg rounded-2xl p-8 text-center">
        {status === "loading" && <p className="text-sm text-muted-foreground">Verifying your email...</p>}
        {status === "success" && (
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold">Email verified</h1>
            <p className="text-sm text-muted-foreground">
              Your email has been successfully verified. You can now access your dashboard.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="mt-2 rounded-md bg-blue-600 text-white py-2 px-4 text-sm font-medium hover:bg-blue-700"
            >
              Go to login
            </button>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold">Verification failed</h1>
            <p className="text-sm text-muted-foreground">
              This verification link is invalid or has expired.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="mt-2 rounded-md bg-blue-600 text-white py-2 px-4 text-sm font-medium hover:bg-blue-700"
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
