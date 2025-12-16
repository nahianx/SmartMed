'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Mail,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import { useAuthContext } from '../../../context/AuthContext'
import { apiClient } from '../../../services/apiClient'

export default function DoctorDashboardPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [data, setData] = useState<any | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboard = async () => {
    try {
      setRefreshing(true)
      const res = await apiClient.get('/dashboard/doctor')
      setData(res.data)
    } catch (error) {
      setData(null)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'DOCTOR') {
        router.replace('/')
      } else {
        fetchDashboard()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading...
      </main>
    )
  }

  const firstName = user.fullName?.split(' ')[0] || 'Doctor'
  const profileComplete = Boolean(data?.profile)
  const upcomingCount =
    typeof data?.upcomingAppointmentsCount === 'number'
      ? data.upcomingAppointmentsCount
      : Array.isArray(data?.upcomingAppointments)
        ? data.upcomingAppointments.length
        : null
  const patientsToday =
    typeof data?.patientsToday === 'number' ? data.patientsToday : null
  const notes = Array.isArray(data?.notes) ? data.notes : []

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">Doctor Dashboard</h1>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                DOCTOR
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  user.emailVerified
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {user.emailVerified ? 'Email verified' : 'Verify email'}
              </span>
            </div>
            <p className="text-slate-600">
              Welcome back, {firstName}. Keep tabs on your practice, patients,
              and profile from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push('/profile?role=DOCTOR')}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Sparkles className="h-4 w-4" />
              Complete profile
            </button>
            <button
              type="button"
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <Stethoscope
                className={`h-4 w-4 ${refreshing ? 'animate-pulse' : ''}`}
              />
              {refreshing ? 'Refreshing...' : 'Refresh data'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatusCard
            icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
            title="Profile status"
            value={profileComplete ? 'Profile connected' : 'Profile incomplete'}
            hint={
              profileComplete
                ? 'Patients can see your practice details.'
                : 'Add clinic details to go live.'
            }
            tone={profileComplete ? 'success' : 'warning'}
          />
          <StatusCard
            icon={<CalendarCheck2 className="h-5 w-5 text-blue-600" />}
            title="Upcoming visits"
            value={
              upcomingCount !== null
                ? `${upcomingCount} scheduled`
                : 'No visits scheduled'
            }
            hint="Your next confirmed appointments."
            tone="info"
          />
          <StatusCard
            icon={<Activity className="h-5 w-5 text-indigo-600" />}
            title="Patients today"
            value={patientsToday !== null ? patientsToday : '--'}
            hint={
              patientsToday
                ? "Get ready for today's sessions."
                : 'No patients on the calendar today.'
            }
            tone="neutral"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold">
                  Your profile at a glance
                </h2>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoRow label="Name" value={user.fullName} />
                <InfoRow
                  label="Email"
                  value={user.email}
                  icon={<Mail className="h-4 w-4 text-slate-500" />}
                />
                <InfoRow
                  label="Profile connection"
                  value={profileComplete ? 'Connected' : 'Not connected'}
                  badgeTone={profileComplete ? 'success' : 'warning'}
                />
                <InfoRow
                  label="Account status"
                  value={
                    user.emailVerified ? 'Verified' : 'Pending verification'
                  }
                  badgeTone={user.emailVerified ? 'success' : 'warning'}
                />
              </div>

              {!profileComplete && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div className="space-y-1">
                      <p className="font-semibold">Profile is incomplete</p>
                      <p>
                        Add your specialty, clinic location, and availability so
                        patients can book with you.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => router.push('/profile?role=DOCTOR')}
                          className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          Finish profile
                        </button>
                        <button
                          type="button"
                          onClick={fetchDashboard}
                          className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                        >
                          Recheck status
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold">Quick checklist</h2>
              </div>
              <div className="mt-4 space-y-3">
                <ChecklistItem
                  done={profileComplete}
                  label="Connect your doctor profile and practice details"
                />
                <ChecklistItem
                  done={user.emailVerified}
                  label="Verify your email address"
                />
                <ChecklistItem
                  done={upcomingCount !== null && upcomingCount > 0}
                  label="Confirm your upcoming appointments"
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-600" />
                  <h2 className="text-lg font-semibold">Appointments</h2>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                View and manage patient appointments including history,
                prescriptions, and medical reports.
              </p>
              <button
                type="button"
                onClick={() => router.push('/dashboard/doctor/appointments')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <CalendarCheck2 className="h-4 w-4" />
                View All Appointments
              </button>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-slate-600" />
                  <h3 className="text-base font-semibold">Recent updates</h3>
                </div>
                <span className="text-xs text-slate-500">live</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                We surface whatever the API returns so you can validate your
                connection quickly.
              </p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100">
                <pre className="overflow-auto whitespace-pre-wrap">
                  {data
                    ? JSON.stringify(data, null, 2)
                    : 'No dashboard data received yet.'}
                </pre>
              </div>
            </section>

            {notes.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-slate-600" />
                  <h3 className="text-base font-semibold">System notes</h3>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {notes.map((note: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex gap-2 rounded-md border border-slate-100 bg-slate-50 p-2"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function StatusCard({
  icon,
  title,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: ReactNode
  title: string
  value: string | number
  hint: string
  tone?: 'neutral' | 'info' | 'success' | 'warning'
}) {
  const tones: Record<string, string> = {
    neutral: 'border-slate-200 bg-white',
    info: 'border-blue-100 bg-blue-50',
    success: 'border-emerald-100 bg-emerald-50',
    warning: 'border-amber-100 bg-amber-50',
  }

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.neutral}`}
    >
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
}

function InfoRow({
  label,
  value,
  icon,
  badgeTone,
}: {
  label: string
  value: string | number | null | undefined
  icon?: ReactNode
  badgeTone?: 'success' | 'warning'
}) {
  const badgeClasses =
    badgeTone === 'success'
      ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700'
      : badgeTone === 'warning'
        ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800'
        : ''

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
      <span className="flex items-center gap-2 text-slate-600">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-2 font-semibold text-slate-900">
        {badgeTone ? (
          <span className={badgeClasses}>{value ?? '--'}</span>
        ) : (
          (value ?? '--')
        )}
      </span>
    </div>
  )
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
          done
            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
            : 'border-slate-300 bg-white text-slate-500'
        }`}
      >
        {done ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <span className="text-[10px] font-semibold">-</span>
        )}
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  )
}
