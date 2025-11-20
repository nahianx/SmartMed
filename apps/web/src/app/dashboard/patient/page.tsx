"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "../../../context/AuthContext"
import { apiClient } from "../../../services/apiClient"

export default function PatientDashboardPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth/login")
      } else if (user.role !== "PATIENT") {
        router.replace("/")
      } else {
        apiClient
          .get("/dashboard/patient")
          .then((res) => setData(res.data))
          .catch(() => setData(null))
      }
    }
  }, [user, loading, router])

  if (loading || !user) {
    return <main className="min-h-screen flex items-center justify-center">Loading...</main>
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Patient Dashboard</h1>
        <p className="text-sm text-slate-600 mb-4">
          Welcome, {user.fullName}. This is your personalized SmartMed dashboard.
        </p>
        <pre className="text-xs bg-white rounded-md border border-slate-200 p-4 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </main>
  )
}
