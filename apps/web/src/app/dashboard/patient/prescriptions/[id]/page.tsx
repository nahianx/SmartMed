'use client'

import { useAuthContext } from '@/context/AuthContext'
import { ArrowLeft, Pill, Calendar, User, FileText, Printer } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import {
  prescriptionService,
  Prescription,
} from '../../../../../services/prescriptionService'
import '@/styles/prescription-print.css'

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
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

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
        <div className="text-muted-foreground">Loading...</div>
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
    <div className="bg-card rounded-lg border border-border shadow-sm prescription-container" ref={printRef}>
      {/* Print-only header */}
      <div className="hidden print:block prescription-print-header">
        <h1>Medical Prescription</h1>
        <p className="subtitle">SmartMed Healthcare System</p>
      </div>
      
      <div className="bg-card border-b border-border no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/patient/prescriptions')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  My Prescriptions
                </h1>
                <p className="text-sm text-muted-foreground">
                  View your medical prescriptions
                </p>
              </div>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print Prescription
            </button>
          </div>
        </div>
      </div>
      <div className="border-b border-border px-6 py-4 bg-muted max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Pill className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-foreground">
            Prescription Details
          </h3>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Diagnosis
          </h4>
          <p className="text-foreground">{prescription.diagnosis}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medications
          </h4>
          <div className="space-y-3">
            {prescription.medications.map((medication, index) => (
              <div
                key={index}
                className="border border-border rounded-lg p-4 bg-muted"
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-semibold text-foreground">
                    {medication.medicineName}
                  </h5>
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {medication.dosage}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {medication.frequency}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 font-medium text-foreground">
                      {medication.duration}
                    </span>
                  </div>
                </div>
                {medication.instructions && (
                  <div className="mt-2 text-sm text-foreground bg-blue-50 border border-blue-100 rounded px-3 py-2">
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
            <h4 className="text-sm font-medium text-foreground mb-2">
              Additional Notes
            </h4>
            <p className="text-foreground bg-muted border border-border rounded-lg p-3">
              {prescription.notes}
            </p>
          </div>
        )}

        {prescription.appointment && (
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              Related Appointment
            </h4>
            <div className="text-sm text-muted-foreground">
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

        {/* Print-only footer */}
        <div className="hidden print:block prescription-footer">
          <div className="signature-section">
            <div className="signature-line">
              Prescriber&apos;s Signature
            </div>
            <div className="signature-line">
              Date
            </div>
          </div>
          <div className="print-disclaimer">
            This is a computer-generated prescription from SmartMed Healthcare System.
            Please verify authenticity before dispensing.
          </div>
          <div className="validity-notice">
            Valid for 30 days from date of issue unless otherwise specified.
          </div>
        </div>
      </div>
    </div>
  )
}
