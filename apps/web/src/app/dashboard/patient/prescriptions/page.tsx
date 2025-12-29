'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pill, Calendar, User, FileText, Search } from 'lucide-react'
import { useAuthContext } from '../../../../context/AuthContext'
import { apiClient } from '../../../../services/apiClient'
import {
  prescriptionService,
  Prescription,
} from '../../../../services/prescriptionService'

export default function PrescriptionsPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [patientId, setPatientId] = useState<string | null>(null)

  const loadPrescriptions = useCallback(async () => {
    if (!patientId) return
    try {
      setIsLoading(true)
      setError(null)
      const result = await prescriptionService.getPrescriptionsByPatient(
        patientId,
        page,
        20
      )
      setPrescriptions(result.prescriptions)
      setTotalPages(result.pagination.totalPages)
    } catch (err: unknown) {
      setError('Failed to load prescriptions')
    } finally {
      setIsLoading(false)
    }
  }, [patientId, page])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'PATIENT') {
        router.replace('/')
      } else {
        const fetchPatientId = async () => {
          try {
            const res = await apiClient.get('/dashboard/patient')
            setPatientId(res.data.profile?.id)
          } catch (err) {
            setError('Failed to load patient profile')
          }
        }
        fetchPatientId()
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    if (patientId) {
      loadPrescriptions()
    }
  }, [patientId, loadPrescriptions])

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      rx.diagnosis.toLowerCase().includes(search) ||
      rx.medications.some((med) =>
        med.medicineName.toLowerCase().includes(search)
      ) ||
      rx.doctor?.firstName.toLowerCase().includes(search) ||
      rx.doctor?.lastName.toLowerCase().includes(search)
    )
  })

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </main>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/patient')}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by diagnosis, medication, or doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-slate-900 placeholder-slate-400"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-600">Loading prescriptions...</div>
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Pill className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchTerm ? 'No prescriptions found' : 'No prescriptions yet'}
            </h3>
            <p className="text-slate-600">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Your prescriptions from doctor visits will appear here'}
            </p>
          </div>
        ) : (
          <div>
            <div className="grid gap-4 mb-6">
              {filteredPrescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/patient/prescriptions/${prescription.id}`
                    )
                  }
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-slate-900">
                            {prescription.diagnosis}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
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
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">
                        Medications ({prescription.medications.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {prescription.medications
                          .slice(0, 3)
                          .map((med, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                            >
                              {med.medicineName}
                            </span>
                          ))}
                        {prescription.medications.length > 3 && (
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                            +{prescription.medications.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
