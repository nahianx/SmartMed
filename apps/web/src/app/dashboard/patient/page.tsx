"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "../../../context/AuthContext"
import { apiClient } from "../../../services/apiClient"
import {
  Calendar,
  Clock,
  Heart,
  Activity,
  Stethoscope,
  Sparkles,
  Search,
  ShieldCheck,
  ClipboardList,
  LogOut,
} from "lucide-react"
import { Badge, Button } from "@smartmed/ui"
import { TimelineContainer } from "@/components/timeline/timeline_container"
import { PatientQueueTracker } from "@/components/queue/PatientQueueTracker"
import { DoctorAvailabilityList } from "@/components/queue/DoctorAvailabilityList"

interface PatientDashboardData {
  upcomingAppointments?: Array<{
    id: string
    dateTime: string
    doctorName?: string
    reason?: string
    status?: string
  }>
  preferredDoctorsCount?: number
  recentPrescriptions?: Array<{ id: string; diagnosis?: string; createdAt?: string }>
  notes?: string[]
}

export default function PatientDashboardPage() {
  const { user, loading, logout } = useAuthContext()
  const router = useRouter()
  const [data, setData] = useState<PatientDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadDashboard = async () => {
    try {
      setRefreshing(true)
      setError(null)
      const res = await apiClient.get("/dashboard/patient")
      setData(res.data)
    } catch (err) {
      setError("Failed to load dashboard data")
      setData(null)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth/login")
      } else if (user.role !== "PATIENT") {
        router.replace("/")
      } else {
        loadDashboard()
      }
    }
  }, [user, loading, router])

  const upcoming = useMemo(() => data?.upcomingAppointments || [], [data])
  const preferredCount = data?.preferredDoctorsCount ?? 0
  const prescriptions = data?.recentPrescriptions || []
  const patientId = data?.profile?.id as string | undefined

  if (loading || !user) {
    return <main className="min-h-screen flex items-center justify-center">Loading...</main>
  }

  const firstName = user.fullName?.split(" ")[0] || "Patient"

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">Patient Dashboard</h1>
              <Badge variant="outline" className="text-xs">
                PATIENT
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Secure by default
              </Badge>
            </div>
            <p className="text-slate-600">
              Welcome back, {firstName}. Track your upcoming visits, history, and preferred doctors.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => router.push("/dashboard/patient/search")}
              className="inline-flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Find a doctor
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={loadDashboard}
              className="inline-flex items-center gap-2"
              disabled={refreshing}
            >
              <Sparkles className={`h-4 w-4 ${refreshing ? "animate-pulse" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh data"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => logout()}
              className="inline-flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            icon={<Calendar className="h-5 w-5 text-blue-600" />}
            title="Upcoming visits"
            value={upcoming.length ? `${upcoming.length} scheduled` : "No visits scheduled"}
            hint="Quick view of your next appointments"
            tone="info"
          />
          <StatusCard
            icon={<Heart className="h-5 w-5 text-rose-600" />}
            title="Preferred doctors"
            value={`${preferredCount} saved`}
            hint="Manage your go-to doctors"
            tone="success"
            onClick={() => router.push("/profile?role=PATIENT&tab=preferred-doctors")}
          />
          <StatusCard
            icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
            title="Profile"
            value="Manage info & security"
            hint="Update details and MFA"
            tone="neutral"
            onClick={() => router.push("/profile?role=PATIENT")}
          />
        </div>

        {patientId && <PatientQueueTracker patientId={patientId} />}

        <DoctorAvailabilityList />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-600" />
                  <h2 className="text-lg font-semibold">Upcoming appointments</h2>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/patient/search")}>
                  Book new
                </Button>
              </div>
              {upcoming.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-600">
                  No appointments scheduled. Book a visit to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.slice(0, 4).map((apt) => (
                    <div
                      key={apt.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{apt.doctorName || "Doctor visit"}</p>
                        <p className="text-sm text-slate-600">{apt.reason || "General consultation"}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(apt.dateTime).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs uppercase">
                        {apt.status || "SCHEDULED"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold">Recent prescriptions</h2>
              </div>
              {prescriptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-600">
                  No prescriptions on file.
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.slice(0, 4).map((rx) => (
                    <div key={rx.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="font-medium text-slate-900">{rx.diagnosis || "Prescription"}</p>
                      <p className="text-xs text-slate-500">
                        {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : "Recent"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold">Quick actions</h2>
              </div>
              <div className="space-y-2">
                <QuickLink
                  label="View timeline"
                  description="See appointments, prescriptions, and reports"
                  onClick={() => router.push("/timeline")}
                />
                <QuickLink
                  label="Manage preferred doctors"
                  description="Save or remove your go-to providers"
                  onClick={() => router.push("/profile?role=PATIENT&tab=preferred-doctors")}
                />
                <QuickLink
                  label="Update profile & security"
                  description="Contact info, MFA, and password"
                  onClick={() => router.push("/profile?role=PATIENT")}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold">Recent activity</h2>
          </div>
          <TimelineContainer variant="embedded" initialRole="patient" lockRole heading="Activity timeline" />
        </section>
      </div>
    </main>
  )
}

function StatusCard({
  icon,
  title,
  value,
  hint,
  tone = "neutral",
  onClick,
}: {
  icon: React.ReactNode
  title: string
  value: string
  hint: string
  tone?: "neutral" | "info" | "success" | "warning"
  onClick?: () => void
}) {
  const tones: Record<string, string> = {
    neutral: "border-slate-200 bg-white",
    info: "border-blue-100 bg-blue-50",
    success: "border-emerald-100 bg-emerald-50",
    warning: "border-amber-100 bg-amber-50",
  }

  const body = (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.neutral}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/70 p-2 shadow-sm">{icon}</div>
          <p className="text-sm font-medium text-slate-700">{title}</p>
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
      <p className="mt-1 text-sm text-slate-600">{hint}</p>
    </div>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className="text-left w-full">
        {body}
      </button>
    )
  }
  return body
}

function QuickLink({
  label,
  description,
  onClick,
}: {
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition flex flex-col"
    >
      <span className="font-medium text-slate-900">{label}</span>
      <span className="text-sm text-slate-600">{description}</span>
    </button>
  )
}
