'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Pill,
  Activity,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useAuthContext } from '../../../../../context/AuthContext'
import { ConfirmDialog } from '../../../../../components/ConfirmDialog'
import {
  appointmentService,
  Appointment,
  Prescription,
  Report,
  PreviousVisit,
} from '../../../../../services/appointmentService'

export default function AppointmentDetailPage() {
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
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<'COMPLETED' | 'NO_SHOW' | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'DOCTOR') {
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

  const handleStatusUpdate = async (status: 'COMPLETED' | 'NO_SHOW') => {
    if (!appointment) return

    try {
      setUpdating(true)
      setError(null)
      await appointmentService.updateAppointmentStatus(appointment.id, status)
      await loadAppointmentData()
      setSuccess(`Appointment marked as ${status === 'COMPLETED' ? 'Completed' : 'No Show'}`)
    } catch (err) {
      setError(`Failed to update appointment status`)
      console.error(err)
    } finally {
      setUpdating(false)
      setPendingStatus(null)
    }
  }

  if (loading || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-gray-600">Loading...</div>
      </main>
    )
  }

  if (!user || !appointment) return null

  const patient = appointment.patient
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

  const canUpdateStatus =
    appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/doctor/appointments')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Back to appointments"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  Appointments
                </h1>
                <p className="text-sm text-slate-600">
                  View patient context and manage appointment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-[calc(100vh-4rem)]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6" role="status" aria-live="polite">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Patient Info & Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Patient Information */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
                  <div className="bg-blue-100 rounded-full p-3">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {patient?.firstName} {patient?.lastName}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {formatTime(appointment.dateTime)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">
                      Name
                    </label>
                    <p className="text-sm text-slate-900">
                      {patient?.firstName} {patient?.lastName}
                    </p>
                  </div>

                  {patient?.dateOfBirth && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">
                          Age
                        </label>
                        <p className="text-sm text-slate-900">
                          {calculateAge(patient.dateOfBirth)} years
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">
                          Gender
                        </label>
                        <p className="text-sm text-slate-900 capitalize">
                          {patient?.gender?.toLowerCase() || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {patient?.phoneNumber && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone
                      </label>
                      <p className="text-sm text-slate-900">
                        {patient.phoneNumber}
                      </p>
                    </div>
                  )}

                  {appointment.patient?.address && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase">
                        Address
                      </label>
                      <p className="text-sm text-slate-900">
                        {appointment.patient.address}
                      </p>
                    </div>
                  )}

                  {patient?.allergies && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <label className="text-xs font-medium text-red-700 uppercase flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Allergies
                      </label>
                      <p className="text-sm text-red-900 mt-1">
                        {typeof patient.allergies === 'string'
                          ? patient.allergies
                          : JSON.stringify(patient.allergies)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {canUpdateStatus && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">
                    Update Status
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setPendingStatus('COMPLETED')}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      <CheckCircle className="h-5 w-5" />
                      {updating ? 'Updating...' : 'Complete'}
                    </button>

                    <button
                      onClick={() => setPendingStatus('NO_SHOW')}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      <XCircle className="h-5 w-5" />
                      {updating ? 'Updating...' : 'No Show'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Medical Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Appointment Details */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Appointment Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date
                    </label>
                    <p className="text-sm text-slate-900">
                      {formatDate(appointment.dateTime)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Time
                    </label>
                    <p className="text-sm text-slate-900">
                      {formatTime(appointment.dateTime)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">
                      Duration
                    </label>
                    <p className="text-sm text-slate-900">
                      {appointment.duration} minutes
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">
                      Status
                    </label>
                    <p className="text-sm text-slate-900 capitalize">
                      {appointment.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase">
                      Reason
                    </label>
                    <p className="text-sm text-slate-900">
                      {appointment.reason}
                    </p>
                  </div>
                  {appointment.notes && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-500 uppercase">
                        Notes
                      </label>
                      <p className="text-sm text-slate-900">
                        {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Prescriptions */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Pill className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Active Prescriptions
                  </h2>
                </div>
                {activePrescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {activePrescriptions.map((prescription) => (
                      <div
                        key={prescription.id}
                        className="border border-slate-200 rounded-lg p-3"
                      >
                        <p className="font-medium text-slate-900 mb-1">
                          {prescription.diagnosis}
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatDate(prescription.createdAt)}
                        </p>
                        {prescription.notes && (
                          <p className="text-sm text-slate-600 mt-2">
                            {prescription.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic">
                    No active prescriptions
                  </p>
                )}
              </div>

              {/* Previous Visits */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Previous Visits
                  </h2>
                </div>
                {previousVisits.length > 0 ? (
                  <div className="space-y-3">
                    {previousVisits.slice(0, 3).map((visit) => (
                      <div
                        key={visit.id}
                        className="border border-slate-200 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-slate-900">
                            {visit.diagnosis || visit.reason}
                          </p>
                          <span className="text-xs text-slate-500">
                            {formatDate(visit.dateTime)}
                          </span>
                        </div>
                        {visit.notes && (
                          <p className="text-sm text-slate-600">
                            {visit.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic">
                    No previous visits
                  </p>
                )}
              </div>

              {/* Medical Records */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Medical Records
                  </h2>
                </div>
                {medicalReports.length > 0 ? (
                  <div className="space-y-2">
                    {medicalReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between border border-slate-200 rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {report.fileName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(report.uploadedAt)} •{' '}
                            {(report.fileSize / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 italic">
                    No medical records
                  </p>
                )}

                {patient?.bloodGroup && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase">
                          Blood Type
                        </label>
                        <p className="text-sm font-semibold text-slate-900">
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

      <ConfirmDialog
        isOpen={pendingStatus !== null}
        title="Confirm status change"
        message={
          pendingStatus === 'COMPLETED'
            ? 'Mark this appointment as completed?'
            : 'Mark this appointment as no-show?'
        }
        confirmText={pendingStatus === 'COMPLETED' ? 'Mark Completed' : 'Mark No-show'}
        isDangerous={pendingStatus === 'NO_SHOW'}
        onConfirm={() => pendingStatus && handleStatusUpdate(pendingStatus)}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  )
}
