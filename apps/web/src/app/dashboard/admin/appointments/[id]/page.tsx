'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Pill,
  Activity,
  Stethoscope,
} from 'lucide-react'
import { Badge, Button } from '@smartmed/ui'
import { useAuthContext } from '../../../../../context/AuthContext'
import {
  appointmentService,
  Appointment,
  Prescription,
  Report,
  PreviousVisit,
} from '../../../../../services/appointmentService'

export default function AdminAppointmentDetailPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const params = useParams()
  const appointmentId = params.id as string

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [previousVisits, setPreviousVisits] = useState<PreviousVisit[]>([])
  const [activePrescriptions, setActivePrescriptions] = useState<
    Prescription[]
  >([])
  const [medicalReports, setMedicalReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'ADMIN') {
        router.replace('/')
      } else {
        loadAppointmentData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router, appointmentId])

  const loadAppointmentData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const aptData = await appointmentService.getAppointmentById(appointmentId)
      setAppointment(aptData)

      if (aptData.patient?.id) {
        const [visits, prescriptions, reports] = await Promise.all([
          appointmentService.getPreviousVisits(aptData.patient.id),
          appointmentService.getActivePrescriptions(aptData.patient.id),
          appointmentService.getMedicalReports(aptData.patient.id),
        ])

        setPreviousVisits(visits)
        setActivePrescriptions(prescriptions)
        setMedicalReports(reports)
      }
    } catch (err) {
      setError('Failed to load appointment details')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!appointment) return
    try {
      setSavingNotes(true)
      await appointmentService.updateAppointmentNotes(
        appointment.id,
        notesDraft
      )
      await loadAppointmentData()
      setNotesDraft('')
      setSuccess('Notes updated')
    } catch (err) {
      setError('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-background to-orange-50 dark:from-red-950/20 dark:via-background dark:to-orange-950/20">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    )
  }

  if (!user || !appointment) return null

  const patient = appointment.patient
  const doctor = appointment.doctor

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const calculateAge = (dateOfBirth: string) => {
    const dob = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Appointment Details</h1>
              <Badge variant="outline" className="text-xs">
                Administrator
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/admin/appointments')}
            >
              Back to Appointments
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 via-background to-orange-50 dark:from-red-950/20 dark:via-background dark:to-orange-950/20 min-h-[calc(100vh-4rem)]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          {success && (
            <div
              className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg mb-6"
              role="status"
              aria-live="polite"
            >
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Patient & Doctor Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Patient Information */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <div className="bg-blue-100 dark:bg-blue-950/50 rounded-full p-3">
                    <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {patient?.firstName} {patient?.lastName}
                    </h2>
                    <p className="text-sm text-muted-foreground">Patient</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Name
                    </label>
                    <p className="text-sm text-foreground">
                      {patient?.firstName} {patient?.lastName}
                    </p>
                  </div>

                  {patient?.dateOfBirth && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase">
                          Age
                        </label>
                        <p className="text-sm text-foreground">
                          {calculateAge(patient.dateOfBirth)} years
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase">
                          Gender
                        </label>
                        <p className="text-sm text-foreground capitalize">
                          {patient?.gender?.toLowerCase() || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {patient?.phoneNumber && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone
                      </label>
                      <p className="text-sm text-foreground">
                        {patient.phoneNumber}
                      </p>
                    </div>
                  )}

                  {patient?.allergies && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <label className="text-xs font-medium text-red-700 dark:text-red-400 uppercase flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Allergies
                      </label>
                      <p className="text-sm text-red-900 dark:text-red-300 mt-1">
                        {typeof patient.allergies === 'string'
                          ? patient.allergies
                          : JSON.stringify(patient.allergies)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Doctor Information */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                  <div className="bg-green-100 dark:bg-green-950/50 rounded-full p-3">
                    <Stethoscope className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Dr. {doctor?.firstName} {doctor?.lastName}
                    </h2>
                    <p className="text-sm text-muted-foreground">Doctor</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {doctor?.specialization && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Specialization
                      </label>
                      <p className="text-sm text-foreground">
                        {doctor.specialization}
                      </p>
                    </div>
                  )}
                  {doctor?.consultationFee && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Consultation Fee
                      </label>
                      <p className="text-sm text-foreground">
                        ${doctor.consultationFee}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <h3 className="font-semibold text-foreground mb-2">
                  Appointment Status
                </h3>
                <p className="text-sm text-muted-foreground">
                  Status updates are managed by the assigned doctor.
                </p>
              </div>
            </div>

            {/* Right Column - Medical Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Appointment Details */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Appointment Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date
                    </label>
                    <p className="text-sm text-foreground">
                      {formatDate(appointment.dateTime)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Time
                    </label>
                    <p className="text-sm text-foreground">
                      {formatTime(appointment.dateTime)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Duration
                    </label>
                    <p className="text-sm text-foreground">
                      {appointment.duration} minutes
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Status
                    </label>
                    <p className="text-sm text-foreground capitalize">
                      {appointment.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase">
                      Reason
                    </label>
                    <p className="text-sm text-foreground">
                      {appointment.reason}
                    </p>
                  </div>
                  {appointment.notes && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase">
                        Notes
                      </label>
                      <p className="text-sm text-foreground">
                        {appointment.notes || '-'}
                      </p>
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Add or update appointment notes"
                          className="w-full border border-border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes || !notesDraft.trim()}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {savingNotes ? 'Saving...' : 'Save Notes'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Prescriptions */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Pill className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Active Prescriptions
                  </h2>
                </div>
                {activePrescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {activePrescriptions.map((prescription) => (
                      <div
                        key={prescription.id}
                        className="border border-border rounded-lg p-3"
                      >
                        <p className="font-medium text-foreground mb-1">
                          {prescription.diagnosis}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(prescription.createdAt)}
                        </p>
                        {prescription.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {prescription.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No active prescriptions
                  </p>
                )}
              </div>

              {/* Previous Visits */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Previous Visits
                  </h2>
                </div>
                {previousVisits.length > 0 ? (
                  <div className="space-y-3">
                    {previousVisits.slice(0, 3).map((visit) => (
                      <div
                        key={visit.id}
                        className="border border-border rounded-lg p-3"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-foreground">
                            {visit.diagnosis || visit.reason}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(visit.dateTime)}
                          </span>
                        </div>
                        {visit.notes && (
                          <p className="text-sm text-muted-foreground">
                            {visit.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No previous visits
                  </p>
                )}
              </div>

              {/* Medical Records */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Medical Records
                  </h2>
                </div>
                {medicalReports.length > 0 ? (
                  <div className="space-y-2">
                    {medicalReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between border border-border rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {report.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(report.uploadedAt)} -{' '}
                            {(report.fileSize / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No medical records
                  </p>
                )}

                {patient?.bloodGroup && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase">
                          Blood Type
                        </label>
                        <p className="text-sm font-semibold text-foreground">
                          {patient.bloodGroup}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

    </div>
  )
}
