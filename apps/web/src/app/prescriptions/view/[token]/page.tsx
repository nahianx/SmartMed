/**
 * Public Prescription View Page
 * 
 * Displays prescriptions accessed via secure token links.
 * No authentication required - security is provided by the token.
 * 
 * Print-optimized for A4 paper with professional pharmacy formatting.
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import {
  Pill,
  User,
  Stethoscope,
  Clock,
  AlertCircle,
  Printer,
  Shield,
  Calendar,
  FileText,
} from 'lucide-react'
import { getApiBase } from '@/utils/apiBase'
import '@/styles/prescription-print.css'

interface PrescriptionData {
  id: string
  createdAt: string
  diagnosis: string
  notes: string | null
  patient: {
    name: string
    dateOfBirth: string
  }
  doctor: {
    name: string
    specialization: string
    licenseNumber: string
  }
  medications: Array<{
    name: string
    dosage: string
    frequency: string
    duration: string
    instructions: string | null
    drug?: {
      rxcui: string
      genericName: string | null
      dosageForm: string | null
    } | null
  }>
}

interface AccessInfo {
  message: string
  disclaimer: string
}

type PageStatus = 'loading' | 'success' | 'error' | 'expired' | 'invalid'

export default function PrescriptionViewPage() {
  const params = useParams()
  const token = params.token as string

  const [status, setStatus] = useState<PageStatus>('loading')
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null)
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    async function fetchPrescription() {
      if (!token) {
        setStatus('invalid')
        setErrorMessage('No access token provided')
        return
      }

      try {
        const apiUrl = getApiBase()
        const response = await fetch(`${apiUrl}/api/public/prescriptions/${token}`)
        const data = await response.json()

        if (!response.ok) {
          if (data.code === 'EXPIRED') {
            setStatus('expired')
            setErrorMessage(data.error || 'This link has expired')
          } else if (data.code === 'MAX_USES_EXCEEDED') {
            setStatus('expired')
            setErrorMessage(data.error || 'This link has reached its maximum uses')
          } else if (data.code === 'INVALID_TOKEN' || response.status === 404) {
            setStatus('invalid')
            setErrorMessage('Invalid or unknown link')
          } else {
            setStatus('error')
            setErrorMessage(data.error || 'Failed to load prescription')
          }
          return
        }

        setPrescription(data.prescription)
        setAccessInfo(data.accessInfo)
        setStatus('success')
      } catch (error) {
        console.error('Error fetching prescription:', error)
        setStatus('error')
        setErrorMessage('Unable to connect to the server')
      }
    }

    fetchPrescription()
  }, [token])

  const handlePrint = () => {
    window.print()
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prescription...</p>
        </div>
      </div>
    )
  }

  // Error states
  if (status === 'expired' || status === 'invalid' || status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            status === 'expired' ? 'bg-amber-100' : 'bg-red-100'
          }`}>
            <AlertCircle className={`h-8 w-8 ${
              status === 'expired' ? 'text-amber-600' : 'text-red-600'
            }`} />
          </div>
          <h1 className={`text-xl font-semibold mb-2 ${
            status === 'expired' ? 'text-amber-800' : 'text-red-800'
          }`}>
            {status === 'expired' ? 'Link Expired' : status === 'invalid' ? 'Invalid Link' : 'Error'}
          </h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          {status === 'expired' && (
            <p className="text-sm text-gray-500">
              Please contact your healthcare provider to request a new prescription link.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Success state - display prescription
  if (!prescription) return null

  const prescriptionDate = new Date(prescription.createdAt)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:p-0 print:min-h-0">
      <div className="max-w-3xl mx-auto prescription-container">
        {/* Security Notice - hidden on print */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3 no-print">
          <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium">{accessInfo?.message}</p>
            <p className="text-blue-700 mt-1">{accessInfo?.disclaimer}</p>
          </div>
        </div>

        {/* Print-only Professional Header */}
        <div className="hidden print:block prescription-print-header">
          <h1>Medical Prescription</h1>
          <p className="subtitle">SmartMed Healthcare System</p>
          <p className="prescription-id">ID: {prescription.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Main Prescription Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden print:shadow-none print:rounded-none prescription-view">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-5 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8" />
                <div>
                  <h1 className="text-xl font-bold">Medical Prescription</h1>
                  <p className="text-blue-100 text-sm">SmartMed Healthcare System</p>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>

          {/* Prescription Details */}
          <div className="p-6 print:p-0">
            {/* Print-only date/meta section */}
            <div className="hidden print:flex justify-between text-sm text-gray-600 mb-4 pb-4 border-b print:border-gray-300">
              <div>
                <span className="font-medium">Date:</span> {format(prescriptionDate, 'MMMM d, yyyy')}
              </div>
              <div>
                <span className="font-medium">Time:</span> {format(prescriptionDate, 'h:mm a')}
              </div>
              <div>
                <span className="font-medium">ID:</span> {prescription.id.slice(0, 8).toUpperCase()}
              </div>
            </div>

            {/* Date and ID - Screen only */}
            <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6 pb-6 border-b print:hidden">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Date: {format(prescriptionDate, 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Time: {format(prescriptionDate, 'h:mm a')}</span>
              </div>
            </div>

            {/* Patient & Doctor Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-8 info-section print:border print:border-gray-300 print:p-4 print:mb-4">
              {/* Patient */}
              <div className="bg-gray-50 rounded-lg p-4 patient-info print:bg-transparent print:p-0 print:rounded-none">
                <div className="flex items-center gap-2 text-gray-700 font-medium mb-3 print:hidden">
                  <User className="h-4 w-4" />
                  Patient Information
                </div>
                <div className="info-label hidden print:block">Patient Information</div>
                <p className="text-gray-900 font-semibold info-value">{prescription.patient.name}</p>
                <p className="text-sm text-gray-600 info-value">
                  DOB: {format(new Date(prescription.patient.dateOfBirth), 'MMM d, yyyy')}
                </p>
              </div>

              {/* Doctor */}
              <div className="bg-gray-50 rounded-lg p-4 doctor-info print:bg-transparent print:p-0 print:rounded-none">
                <div className="flex items-center gap-2 text-gray-700 font-medium mb-3 print:hidden">
                  <Stethoscope className="h-4 w-4" />
                  Prescriber Information
                </div>
                <div className="info-label hidden print:block">Prescriber Information</div>
                <p className="text-gray-900 font-semibold info-value">{prescription.doctor.name}</p>
                <p className="text-sm text-gray-600 info-value">{prescription.doctor.specialization}</p>
                <p className="text-xs text-gray-500 info-value">License: {prescription.doctor.licenseNumber}</p>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="mb-8 diagnosis-section print:mb-4">
              <h2 className="text-sm font-medium text-gray-700 mb-2 print:text-black print:font-bold">Diagnosis</h2>
              <p className="text-gray-900 bg-gray-50 rounded-lg p-4 print:bg-transparent print:border print:border-gray-300 print:rounded-none">{prescription.diagnosis}</p>
              {prescription.notes && (
                <div className="mt-3 notes-section print:mt-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 print:text-black">Notes</h3>
                  <p className="text-gray-700 text-sm bg-amber-50 rounded-lg p-4 border border-amber-100 print:border-gray-300 print:bg-transparent">
                    {prescription.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Medications */}
            <div className="medications-section">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4 print:hidden">
                <Pill className="h-5 w-5 text-blue-600" />
                Prescribed Medications
              </h2>
              <h2 className="hidden print:block text-lg font-bold mb-4 border-b border-gray-300 pb-2">Prescribed Medications</h2>
              
              {/* Screen view - Card layout */}
              <div className="space-y-4 print:hidden">
                {prescription.medications.map((med, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                            {index + 1}
                          </span>
                          <h3 className="font-semibold text-gray-900">{med.name}</h3>
                        </div>
                        {med.drug?.genericName && (
                          <p className="text-sm text-gray-500 ml-8">
                            Generic: {med.drug.genericName}
                          </p>
                        )}
                      </div>
                      {med.drug?.dosageForm && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {med.drug.dosageForm}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 ml-8 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Dosage</span>
                        <p className="font-medium text-gray-900">{med.dosage}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Frequency</span>
                        <p className="font-medium text-gray-900">{med.frequency}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration</span>
                        <p className="font-medium text-gray-900">{med.duration}</p>
                      </div>
                    </div>
                    {med.instructions && (
                      <div className="mt-3 ml-8 text-sm">
                        <span className="text-gray-500">Instructions:</span>
                        <p className="text-gray-700 mt-1 bg-blue-50 rounded p-2">
                          {med.instructions}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Print view - Table layout */}
              <table className="hidden print:table medications-table w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medication</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.medications.map((med, index) => (
                    <tr key={index} className="medication-item">
                      <td className="text-center">{index + 1}</td>
                      <td>
                        <div className="medication-name">{med.name}</div>
                        {med.drug?.genericName && (
                          <div className="medication-generic">{med.drug.genericName}</div>
                        )}
                        {med.drug?.rxcui && (
                          <span className="rxcui-badge">RxCUI: {med.drug.rxcui}</span>
                        )}
                      </td>
                      <td>{med.dosage}</td>
                      <td>{med.frequency}</td>
                      <td>{med.duration}</td>
                      <td>
                        {med.instructions && (
                          <div className="medication-instructions">{med.instructions}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer - Screen */}
          <div className="bg-gray-50 px-6 py-4 border-t text-center print:hidden">
            <p className="text-xs text-gray-500">
              This is a computer-generated prescription from SmartMed Healthcare System.
              Please verify authenticity before dispensing. Valid for 30 days from date of issue.
            </p>
          </div>

          {/* Footer - Print */}
          <div className="hidden print:block prescription-footer mt-8">
            {/* Signature Section */}
            <div className="signature-section flex justify-between items-end mb-6">
              <div className="qr-code-area w-20 h-20 border border-gray-300 flex items-center justify-center text-xs text-gray-400">
                QR Code
              </div>
              <div className="signature-box text-center">
                <div className="signature-line border-t border-black mt-12 pt-2">
                  <p className="text-sm">{prescription.doctor.name}</p>
                  <p className="text-xs text-gray-600">{prescription.doctor.specialization}</p>
                  <p className="text-xs text-gray-500">License: {prescription.doctor.licenseNumber}</p>
                </div>
              </div>
            </div>

            {/* Validity Notice */}
            <div className="validity-notice text-center text-sm italic text-gray-600 mb-4">
              Valid for 30 days from date of issue. Not valid after {format(new Date(prescriptionDate.getTime() + 30 * 24 * 60 * 60 * 1000), 'MMMM d, yyyy')}.
            </div>

            {/* Disclaimer */}
            <div className="print-disclaimer border border-gray-200 p-3 text-xs text-gray-500 text-center">
              <p>This is a computer-generated prescription from SmartMed Healthcare System.</p>
              <p>Please verify authenticity before dispensing. Keep out of reach of children.</p>
              <p>Do not exceed prescribed dosage. Consult your healthcare provider for any concerns.</p>
            </div>

            {/* Print Timestamp */}
            <p className="print-timestamp text-right text-xs text-gray-400 mt-2">
              Printed: {format(new Date(), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>

        {/* Print Styles Notice - Screen only */}
        <p className="text-center text-sm text-gray-500 mt-4 no-print">
          This prescription is optimized for printing. Click the print button above for best results.
        </p>
      </div>
    </div>
  )
}
