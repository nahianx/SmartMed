'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  Activity,
  Pill,
  FileText,
  Heart,
  Loader2,
  Clock,
  Shield,
} from 'lucide-react'
import {
  Button,
  Card,
  Badge,
  Avatar,
  AvatarFallback,
  Skeleton,
} from '@smartmed/ui'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { resolveProfilePhotoUrl } from '@/utils/apiBase'
import { useAuthContext } from '@/context/AuthContext'
import { appointmentService, Prescription, Report, PreviousVisit } from '@/services/appointmentService'

interface PatientProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: string
  phoneNumber?: string
  address?: string
  emergencyContact?: string
  emergencyPhone?: string
  bloodType?: string
  allergies?: string | string[]
  medicalConditions?: string | string[]
  profilePhotoUrl?: string
  user?: {
    email?: string
    phoneNumber?: string
    profilePhotoUrl?: string
  }
}

export default function PatientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const patientId = params.id as string

  const [patient, setPatient] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previousVisits, setPreviousVisits] = useState<PreviousVisit[]>([])
  const [activePrescriptions, setActivePrescriptions] = useState<Prescription[]>([])
  const [medicalReports, setMedicalReports] = useState<Report[]>([])

  useEffect(() => {
    // Only doctors and admins can view patient profiles
    if (user && user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
      router.replace('/')
      return
    }
  }, [user, router])

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true)
        // Fetch patient profile by ID (for doctors viewing patient records)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1080/api'}/patient/${patientId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Patient not found')
        }

        const data = await response.json()
        setPatient(data.patient || data)

        // Fetch medical history
        const patientRecordId = data.patient?.id || patientId
        if (patientRecordId) {
          const [visits, prescriptions, reports] = await Promise.all([
            appointmentService.getPreviousVisits(patientRecordId).catch(() => []),
            appointmentService.getActivePrescriptions(patientRecordId).catch(() => []),
            appointmentService.getMedicalReports(patientRecordId).catch(() => []),
          ])
          setPreviousVisits(visits)
          setActivePrescriptions(prescriptions)
          setMedicalReports(reports)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load patient profile')
      } finally {
        setLoading(false)
      }
    }

    if (patientId) {
      fetchPatient()
    }
  }, [patientId])

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-32" />
            <Card className="p-6">
              <div className="flex gap-6">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-muted rounded-full">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Patient Not Found</h2>
              <p className="text-muted-foreground">
                {error || "We couldn't find the patient you're looking for."}
              </p>
              <Button onClick={() => router.back()}>Go Back</Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const photoUrl = patient.profilePhotoUrl || patient.user?.profilePhotoUrl

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-700 dark:to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
        {/* Profile Card */}
        <Card className="p-6 shadow-lg">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                {photoUrl ? (
                  <img
                    src={resolveProfilePhotoUrl(photoUrl)}
                    alt={`${patient.firstName} ${patient.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-3xl font-semibold">
                    {patient.firstName?.[0]}
                    {patient.lastName?.[0]}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <p className="text-muted-foreground">Patient</p>
                </div>
                <Badge variant="outline" className="w-fit">
                  <Shield className="h-3 w-3 mr-1" />
                  Medical Record
                </Badge>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {patient.dateOfBirth && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{calculateAge(patient.dateOfBirth)} years old</span>
                  </div>
                )}
                {patient.gender && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{patient.gender.toLowerCase()}</span>
                  </div>
                )}
                {patient.bloodType && (
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>Blood Type: {patient.bloodType}</span>
                  </div>
                )}
                {patient.phoneNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Contact Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <div className="space-y-3">
              {patient.phoneNumber && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>{patient.phoneNumber}</span>
                </div>
              )}
              {patient.user?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span>{patient.user.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <span>{patient.address}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Emergency Contact */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
            {patient.emergencyContact || patient.emergencyPhone ? (
              <div className="space-y-3">
                {patient.emergencyContact && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span>{patient.emergencyContact}</span>
                  </div>
                )}
                {patient.emergencyPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span>{patient.emergencyPhone}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No emergency contact on file</p>
            )}
          </Card>

          {/* Allergies */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Allergies
            </h2>
            {patient.allergies ? (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-900 dark:text-red-300">
                  {typeof patient.allergies === 'string'
                    ? patient.allergies
                    : (patient.allergies as string[]).join(', ')}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No known allergies</p>
            )}
          </Card>

          {/* Medical Conditions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Medical Conditions
            </h2>
            {patient.medicalConditions ? (
              <p className="text-foreground">
                {typeof patient.medicalConditions === 'string'
                  ? patient.medicalConditions
                  : (patient.medicalConditions as string[]).join(', ')}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">No conditions on record</p>
            )}
          </Card>
        </div>

        {/* Medical History Section */}
        <div className="mt-6 space-y-6">
          {/* Active Prescriptions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-500" />
              Prescriptions
            </h2>
            {activePrescriptions.length > 0 ? (
              <div className="space-y-3">
                {activePrescriptions.slice(0, 5).map((prescription) => (
                  <div
                    key={prescription.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{prescription.diagnosis || 'Prescription'}</p>
                      <p className="text-sm text-muted-foreground">
                        {prescription.notes || 'No additional notes'}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {formatDate(prescription.createdAt)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No prescriptions on record</p>
            )}
          </Card>

          {/* Previous Visits */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Recent Visits
            </h2>
            {previousVisits.length > 0 ? (
              <div className="space-y-3">
                {previousVisits.slice(0, 5).map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{visit.reason}</p>
                      {visit.diagnosis && (
                        <p className="text-sm text-muted-foreground">
                          Diagnosis: {visit.diagnosis}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{formatDate(visit.dateTime)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No previous visits</p>
            )}
          </Card>

          {/* Medical Reports */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              Medical Reports
            </h2>
            {medicalReports.length > 0 ? (
              <div className="space-y-3">
                {medicalReports.slice(0, 5).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{report.fileName}</p>
                      <p className="text-sm text-muted-foreground">{report.notes || 'No notes'}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(report.uploadedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No medical reports</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
