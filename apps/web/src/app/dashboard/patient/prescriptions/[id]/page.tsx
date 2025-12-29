'use client'

import { useAuthContext } from '@/context/AuthContext'
import { ArrowLeft, Pill, Calendar, User, FileText } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  prescriptionService,
  Prescription,
} from '../../../../../services/prescriptionService'

export default function PrescriptionView() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const params = useParams()
  const prescriptionId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const [prescription, setPrescription] = useState<Prescription | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'PATIENT') {
        router.replace('/')
      } else {
        loadPrescriptionData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router, prescriptionId])

  const loadPrescriptionData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const prescription =
        await prescriptionService.getPrescriptionById(prescriptionId)
      setPrescription(prescription)
    } catch (err) {
      setError('Failed to load prescription details')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-gray-600">Loading...</div>
      </main>
    )
  }

  if (!user || !prescription) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm ">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/patient/prescriptions')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  My Prescriptions
                </h1>
                <p className="text-sm text-slate-600">
                  View your medical prescriptions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Pill className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">
            Prescription Details
          </h3>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(prescription.createdAt)}</span>
          </div>
          {prescription.doctor && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>
                Dr. {prescription.doctor.firstName}{' '}
                {prescription.doctor.lastName}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Diagnosis
          </h4>
          <p className="text-slate-900">{prescription.diagnosis}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medications
          </h4>
          <div className="space-y-3">
            {prescription.medications.map((medication, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-lg p-4 bg-slate-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-semibold text-slate-900">
                    {medication.medicineName}
                  </h5>
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {medication.dosage}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-600">Frequency:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {medication.frequency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Duration:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {medication.duration}
                    </span>
                  </div>
                </div>
                {medication.instructions && (
                  <div className="mt-2 text-sm text-slate-700 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                    <span className="font-medium">Instructions:</span>{' '}
                    {medication.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {prescription.notes && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">
              Additional Notes
            </h4>
            <p className="text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
              {prescription.notes}
            </p>
          </div>
        )}

        {prescription.appointment && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">
              Related Appointment
            </h4>
            <div className="text-sm text-slate-600">
              <p>
                <span className="font-medium">Date:</span>{' '}
                {formatDate(prescription.appointment.dateTime)}
              </p>
              <p>
                <span className="font-medium">Reason:</span>{' '}
                {prescription.appointment.reason}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
