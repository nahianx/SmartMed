'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../../../context/AuthContext'
import { apiClient } from '../../../services/apiClient'
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
  ChevronRight,
  TrendingUp,
  Bell,
  FileText,
} from 'lucide-react'
import { Badge, Button } from '@smartmed/ui'
import { TimelineContainer } from '@/components/timeline/timeline_container'
import { PatientQueueTracker } from '@/components/queue/PatientQueueTracker'
import { DoctorAvailabilityList } from '@/components/queue/DoctorAvailabilityList'
import { HealthTipsList } from '@/components/health-tips/HealthTipsList'
import { Lightbulb } from 'lucide-react'

interface PatientDashboardData {
  upcomingAppointments?: Array<{
    id: string
    dateTime: string
    doctorName?: string
    reason?: string
    status?: string
    specialization?: string
  }>
  preferredDoctorsCount?: number
  recentPrescriptions?: Array<{
    id: string
    diagnosis?: string
    createdAt?: string
  }>
  notes?: string[]
  profile?: {
    id: string
    userId: string
    firstName: string
    lastName: string
  }
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
      const res = await apiClient.get('/dashboard/patient')
      setData(res.data)
    } catch (err) {
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
      } else if (user.role !== 'PATIENT') {
        router.replace('/')
      } else {
        loadDashboard()
      }
    }
  }, [user, loading, router])

  const upcoming = useMemo(() => data?.upcomingAppointments || [], [data])
  const preferredCount = data?.preferredDoctorsCount ?? 0
  const prescriptions = data?.recentPrescriptions || []
  const patientId = data?.profile?.id

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </main>
    )
  }

  const firstName = user.fullName?.split(' ')[0] || 'Patient'

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b bg-gradient-to-r from-card via-card to-primary/5 dark:from-card dark:via-card dark:to-primary/10">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Patient Dashboard
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-xs bg-primary/10 text-primary border-primary/20"
                  >
                    PATIENT
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  Welcome back, <span className="font-medium">{firstName}</span>
                  . Track your visits, history, and doctors.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => router.push('/dashboard/patient/search')}
              className="inline-flex items-center gap-2 shadow-md shadow-primary/20"
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
              <Sparkles
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => logout()}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <Bell className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            icon={
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            }
            title="Upcoming visits"
            value={
              upcoming.length
                ? `${upcoming.length} scheduled`
                : 'No visits scheduled'
            }
            hint="Quick view of your next appointments"
            tone="info"
          />
          <StatusCard
            icon={
              <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            }
            title="Preferred doctors"
            value={`${preferredCount} saved`}
            hint="Manage your go-to doctors"
            tone="success"
            onClick={() =>
              router.push('/profile?role=PATIENT&tab=preferred-doctors')
            }
          />
          <StatusCard
            icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
            title="Profile"
            value="Manage info & security"
            hint="Update details and MFA"
            tone="neutral"
            onClick={() => router.push('/profile?role=PATIENT')}
          />
        </div>

        {patientId && <PatientQueueTracker patientId={patientId} />}

        <DoctorAvailabilityList />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 dark:bg-blue-500/20 p-2">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    Upcoming appointments
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => router.push('/dashboard/patient/search')}
                >
                  <Search className="h-4 w-4" />
                  Book new
                </Button>
              </div>
              {upcoming.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground mb-1">
                    No appointments scheduled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Book a visit to get started with your healthcare journey.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.slice(0, 4).map((apt, index) => (
                    <div
                      key={apt.id}
                      className="group relative rounded-xl border border-border bg-gradient-to-r from-muted/50 to-transparent p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                            <span className="text-xs font-medium uppercase">
                              {new Date(apt.dateTime).toLocaleDateString(
                                'en-US',
                                { month: 'short' }
                              )}
                            </span>
                            <span className="text-lg font-bold leading-none">
                              {new Date(apt.dateTime).getDate()}
                            </span>
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {apt.doctorName || 'Doctor visit'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {apt.reason || 'General consultation'}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(apt.dateTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <AppointmentStatusBadge
                          status={apt.status || 'SCHEDULED'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 dark:bg-purple-500/20 p-2">
                    <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    Recent prescriptions
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    router.push('/dashboard/patient/prescriptions')
                  }
                >
                  <FileText className="h-4 w-4" />
                  View All
                </Button>
              </div>
              {prescriptions.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground mb-1">
                    No prescriptions on file
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your prescriptions will appear here after doctor visits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.slice(0, 4).map((rx, index) => (
                    <div
                      key={rx.id}
                      className="group rounded-xl border border-border bg-gradient-to-r from-muted/50 to-transparent p-4 hover:border-purple-300 dark:hover:border-purple-500/30 hover:shadow-sm transition-all duration-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {rx.diagnosis || 'Prescription'}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {rx.createdAt
                              ? new Date(rx.createdAt).toLocaleDateString(
                                  'en-US',
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  }
                                )
                              : 'Recent'}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Quick actions</h2>
              </div>
              <div className="space-y-2">
                <QuickLink
                  icon={<Calendar className="h-4 w-4" />}
                  label="Manage appointments"
                  description="View requests, confirmations, and cancel"
                  onClick={() =>
                    router.push('/dashboard/patient/appointments')
                  }
                />
                <QuickLink
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="View timeline"
                  description="See appointments, prescriptions, and reports"
                  onClick={() => router.push('/timeline')}
                />
                <QuickLink
                  icon={<Lightbulb className="h-4 w-4" />}
                  label="Health tips"
                  description="View personalized health recommendations"
                  onClick={() =>
                    router.push('/dashboard/patient/health-tips')
                  }
                />
                <QuickLink
                  icon={<Heart className="h-4 w-4" />}
                  label="Manage preferred doctors"
                  description="Save or remove your go-to providers"
                  onClick={() =>
                    router.push('/profile?role=PATIENT&tab=preferred-doctors')
                  }
                />
                <QuickLink
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Update profile & security"
                  description="Contact info, MFA, and password"
                  onClick={() => router.push('/profile?role=PATIENT')}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Health Tips Section */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-500/20 dark:to-yellow-500/20 p-2">
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Health Tips</h2>
                <p className="text-sm text-muted-foreground">
                  Personalized recommendations for you
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push('/dashboard/patient/health-tips')}
            >
              <Sparkles className="h-4 w-4" />
              View all
            </Button>
          </div>
          <HealthTipsList maxItems={3} compact showRefresh={false} showGenerateButton={false} />
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 dark:bg-orange-500/20 p-2">
                <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold">Recent activity</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push('/timeline')}
            >
              <TrendingUp className="h-4 w-4" />
              View all
            </Button>
          </div>
          <TimelineContainer
            variant="embedded"
            initialRole="patient"
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
  onClick,
}: {
  icon: React.ReactNode
  title: string
  value: string
  hint: string
  tone?: 'neutral' | 'info' | 'success' | 'warning'
  onClick?: () => void
}) {
  const toneStyles: Record<
    string,
    { container: string; iconBg: string; accent: string }
  > = {
    neutral: {
      container:
        'border-border bg-card hover:bg-muted/50 dark:bg-card dark:border-border',
      iconBg:
        'bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground',
      accent: 'from-muted/50 to-transparent',
    },
    info: {
      container:
        'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-50 dark:border-blue-500/30 dark:from-blue-950/50 dark:to-blue-900/30 dark:hover:from-blue-900/50 dark:hover:to-blue-950/40',
      iconBg:
        'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      accent: 'from-blue-500/10 to-transparent dark:from-blue-400/5',
    },
    success: {
      container:
        'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:from-emerald-100 hover:to-emerald-50 dark:border-emerald-500/30 dark:from-emerald-950/50 dark:to-emerald-900/30 dark:hover:from-emerald-900/50 dark:hover:to-emerald-950/40',
      iconBg:
        'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      accent: 'from-emerald-500/10 to-transparent dark:from-emerald-400/5',
    },
    warning: {
      container:
        'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 hover:from-amber-100 hover:to-amber-50 dark:border-amber-500/30 dark:from-amber-950/50 dark:to-amber-900/30 dark:hover:from-amber-900/50 dark:hover:to-amber-950/40',
      iconBg:
        'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      accent: 'from-amber-500/10 to-transparent dark:from-amber-400/5',
    },
  }

  const styles = toneStyles[tone] || toneStyles.neutral

  const body = (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 shadow-sm transition-all duration-200 ${styles.container} ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
    >
      {/* Subtle gradient accent */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${styles.accent} rounded-full -translate-y-1/2 translate-x-1/2 opacity-60`}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 shadow-sm ${styles.iconBg}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                {title}
              </p>
              <div className="mt-1 text-xl font-bold text-foreground dark:text-foreground">
                {value}
              </div>
            </div>
          </div>
          {onClick && (
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground/80">
          {hint}
        </p>
      </div>
    </div>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className="text-left w-full group">
        {body}
      </button>
    )
  }
  return body
}

function QuickLink({
  label,
  description,
  icon,
  onClick,
}: {
  label: string
  description: string
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/50 hover:border-primary/20 hover:shadow-sm transition-all duration-200 flex items-center gap-3"
    >
      {icon && (
        <div className="flex-shrink-0 rounded-lg bg-muted p-2 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
          {label}
        </span>
        <span className="block text-sm text-muted-foreground truncate">
          {description}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </button>
  )
}
function AppointmentStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<
    string,
    { bg: string; text: string; dot: string }
  > = {
    SCHEDULED: {
      bg: 'bg-blue-100 dark:bg-blue-500/20',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500',
    },
    CONFIRMED: {
      bg: 'bg-emerald-100 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    },
    PENDING: {
      bg: 'bg-amber-100 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
    },
    CANCELLED: {
      bg: 'bg-red-100 dark:bg-red-500/20',
      text: 'text-red-700 dark:text-red-300',
      dot: 'bg-red-500',
    },
    COMPLETED: {
      bg: 'bg-gray-100 dark:bg-gray-500/20',
      text: 'text-gray-700 dark:text-gray-300',
      dot: 'bg-gray-500',
    },
  }

  const style = statusStyles[status.toUpperCase()] || statusStyles.SCHEDULED

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}