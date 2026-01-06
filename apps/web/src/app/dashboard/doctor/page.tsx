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
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { useAuthContext } from '../../../context/AuthContext'
import { apiClient } from '../../../services/apiClient'
import { TimelineContainer } from '@/components/timeline/timeline_container'
import { DoctorQueuePanel } from '@/components/queue/DoctorQueuePanel'
import { DashboardHeader } from '@/components/layout/DashboardHeader'

export default function DoctorDashboardPage() {
  const { user, loading, logout } = useAuthContext()
  const router = useRouter()
  const [data, setData] = useState<any | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const upcomingAppointments: any[] = Array.isArray(data?.upcomingAppointments)
    ? data.upcomingAppointments
    : []

  const fetchDashboard = async () => {
    try {
      setRefreshing(true)
      setError(null)
      const res = await apiClient.get('/dashboard/doctor')
      setData(res.data)
    } catch (error) {
      setError('Failed to load dashboard data')
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
  const doctorId = data?.profile?.id as string | undefined

  return (
    <main className="min-h-screen bg-background">
      {/* Top Navigation */}
      <DashboardHeader />
      
      {/* Page Header */}
      <div className="border-b bg-gradient-to-r from-card via-card to-blue-500/5 dark:from-card dark:via-card dark:to-blue-500/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Welcome back, Dr. {firstName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage your practice, patients, and appointments
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!profileComplete && (
              <button
                type="button"
                onClick={() => router.push('/profile?role=DOCTOR')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Sparkles className="h-4 w-4" />
                Complete profile
              </button>
            )}
            <button
              type="button"
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
            >
              <Stethoscope
                className={`h-4 w-4 ${refreshing ? 'animate-pulse' : ''}`}
              />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

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
            variant="soft"
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
            variant="soft"
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
            variant="soft"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">
                  Your profile at a glance
                </h2>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoRow label="Name" value={user.fullName} />
                <InfoRow
                  label="Email"
                  value={user.email}
                  icon={<Mail className="h-4 w-4 text-muted-foreground" />}
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
                <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-300">
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
                          className="inline-flex items-center gap-2 rounded-md border border-amber-200 dark:border-amber-700 bg-card px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        >
                          Recheck status
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
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
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-base font-semibold">Quick actions</h3>
              </div>
              <div className="space-y-2">
                <QuickLink
                  label="View appointments"
                  description="See all your scheduled appointments"
                  onClick={() => router.push('/dashboard/doctor/appointments')}
                />
                <QuickLink
                  label="Manage availability"
                  description="Update weekly schedule and breaks"
                  onClick={() =>
                    router.push('/profile?role=DOCTOR&tab=availability')
                  }
                />
                <QuickLink
                  label="View activity timeline"
                  description="Appointments, prescriptions, reports"
                  onClick={() => router.push('/timeline')}
                />
                <QuickLink
                  label="Profile & security"
                  description="Clinic info, MFA, password"
                  onClick={() => router.push('/profile?role=DOCTOR')}
                />
              </div>
            </section>

            {notes.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-semibold">System notes</h3>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {notes.map((note: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex gap-2 rounded-md border border-border bg-muted p-2"
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

        {doctorId && <DoctorQueuePanel doctorId={doctorId} />}

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recent activity</h2>
          </div>
          <TimelineContainer
            variant="embedded"
            initialRole="doctor"
            lockRole
            heading="Activity timeline"
          />
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
  tone = 'neutral',
  variant = 'outline',
}: {
  icon: ReactNode
  title: string
  value: string | number
  hint: string
  tone?: 'neutral' | 'info' | 'success' | 'warning'
  variant?: 'outline' | 'soft'
}) {
  const tones: Record<string, { border: string; bg: string }> = {
    neutral: {
      border: 'border-border',
      bg: variant === 'soft' ? 'bg-muted' : 'bg-card',
    },
    info: {
      border: 'border-blue-100 dark:border-blue-800',
      bg: variant === 'soft' ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-card',
    },
    success: {
      border: 'border-emerald-100 dark:border-emerald-800',
      bg: variant === 'soft' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-card',
    },
    warning: {
      border: 'border-amber-100 dark:border-amber-800',
      bg: variant === 'soft' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-card',
    },
  }

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${tones[tone]?.border || tones.neutral.border} ${tones[tone]?.bg || tones.neutral.bg}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-card/70 dark:bg-card/50 p-2 shadow-sm">{icon}</div>
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
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
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-2 font-semibold text-foreground">
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
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted px-3 py-2">
      <div
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
          done
            ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
            : 'border-border bg-card text-muted-foreground'
        }`}
      >
        {done ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <span className="text-[10px] font-semibold">-</span>
        )}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </div>
  )
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
      className="w-full text-left rounded-lg border border-border px-3 py-2 hover:bg-muted transition flex flex-col"
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  )
}
