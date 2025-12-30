'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, Calendar, Clock, User, Stethoscope } from 'lucide-react'
import { appointmentService } from '../services/appointmentService'

interface CreateAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateAppointmentModalProps) {
  const [step, setStep] = useState(1)
  const [patientQuery, setPatientQuery] = useState('')
  const [doctorQuery, setDoctorQuery] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [dateTime, setDateTime] = useState('')
  const [duration, setDuration] = useState(30)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const lastFocused = useRef<HTMLElement | null>(null)

  const searchPatients = useCallback(async () => {
    try {
      const results = await appointmentService.searchPatients(patientQuery)
      setPatients(results)
    } catch (err) {
      console.error('Failed to search patients:', err)
    }
  }, [patientQuery])

  const searchDoctors = useCallback(async () => {
    try {
      const results = await appointmentService.searchDoctors(doctorQuery)
      setDoctors(results)
    } catch (err) {
      console.error('Failed to search doctors:', err)
    }
  }, [doctorQuery])

  useEffect(() => {
    if (isOpen) {
      lastFocused.current = document.activeElement as HTMLElement
      const first = dialogRef.current?.querySelector<HTMLElement>('input, button, textarea, select')
      first?.focus()
    } else {
      lastFocused.current?.focus()
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  useEffect(() => {
    if (patientQuery.length >= 1) {
      searchPatients()
    } else {
      setPatients([])
    }
  }, [patientQuery, searchPatients])

  useEffect(() => {
    if (doctorQuery.length >= 1) {
      searchDoctors()
    } else {
      setDoctors([])
    }
  }, [doctorQuery, searchDoctors])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedPatient || !selectedDoctor) {
      setError('Please select both patient and doctor')
      return
    }

    if (!dateTime || !reason.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      // Convert local datetime-local value to ISO 8601 string (with timezone) to satisfy backend validation
      const isoDate = new Date(dateTime).toISOString()

      const validation = await appointmentService.validateAppointment({
        doctorId: selectedDoctor.id,
        dateTime: isoDate,
        duration,
      })
      if (validation && validation.valid === false) {
        setError('Selected time conflicts with existing availability.')
        setIsSubmitting(false)
        return
      }

      await appointmentService.createAppointment({
        doctorId: selectedDoctor.id,
        dateTime: isoDate,
        duration,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      })
      resetForm()
      onSuccess()
      onClose()
    } catch (err: any) {
      const resp = err?.response?.data
      const message =
        resp?.error ||
        resp?.message ||
        resp?.details ||
        JSON.stringify(resp) ||
        'Failed to create appointment'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setPatientQuery('')
    setDoctorQuery('')
    setPatients([])
    setDoctors([])
    setSelectedPatient(null)
    setSelectedDoctor(null)
    setDateTime('')
    setDuration(30)
    setReason('')
    setNotes('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Appointment
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1: Select Patient */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                1. Select Patient *
              </label>
            </div>

            {selectedPatient ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedPatient.phoneNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {patients.length > 0 && (
                  <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(patient)
                          setPatientQuery('')
                          setPatients([])
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <p className="font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {patient.phoneNumber}
                          {patient.dateOfBirth && (
                            <span className="ml-2">
                              -{' '}
                              {new Date(
                                patient.dateOfBirth
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Select Doctor */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-5 h-5 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                2. Select Doctor *
              </label>
            </div>

            {selectedDoctor ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedDoctor.specialization}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={doctorQuery}
                    onChange={(e) => setDoctorQuery(e.target.value)}
                    placeholder="Search by name or specialization..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                {doctors.length > 0 && (
                  <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                    {doctors.map((doctor) => (
                      <button
                        key={doctor.id}
                        type="button"
                        onClick={() => {
                          setSelectedDoctor(doctor)
                          setDoctorQuery('')
                          setDoctors([])
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <p className="font-medium text-gray-900">
                          Dr. {doctor.firstName} {doctor.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {doctor.specialization}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 3: Appointment Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                3. Appointment Details
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                  aria-label="Appointment date and time"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  required
                  aria-label="Appointment duration"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Visit *
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Regular checkup, Follow-up visit..."
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or instructions..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
