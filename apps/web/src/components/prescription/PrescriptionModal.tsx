'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { prescriptionService, Medication } from '@/services/prescriptionService'

interface PrescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  appointmentId: string
  patientId: string
  patientName: string
  onSuccess: () => void
}

export default function PrescriptionModal({
  isOpen,
  onClose,
  appointmentId,
  patientId,
  patientName,
  onSuccess,
}: PrescriptionModalProps) {
  const [diagnosis, setDiagnosis] = useState('')
  const [medications, setMedications] = useState<Medication[]>([
    {
      medicineName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
    },
  ])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      {
        medicineName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      },
    ])
  }

  const handleRemoveMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index))
    }
  }

  const handleMedicationChange = (
    index: number,
    field: keyof Medication,
    value: string
  ) => {
    const updated = [...medications]
    updated[index] = { ...updated[index], [field]: value }
    setMedications(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!diagnosis.trim()) {
      setError('Diagnosis is required')
      return
    }

    const validMedications = medications.filter(
      (med) =>
        med.medicineName.trim() &&
        med.dosage.trim() &&
        med.frequency.trim() &&
        med.duration.trim()
    )

    if (validMedications.length === 0) {
      setError('At least one complete medication is required')
      return
    }

    try {
      setIsSubmitting(true)
      await prescriptionService.createPrescription({
        appointmentId,
        patientId,
        diagnosis: diagnosis.trim(),
        medications: validMedications,
        notes: notes.trim() || undefined,
      })
      onSuccess()
      onClose()
      setDiagnosis('')
      setMedications([
        {
          medicineName: '',
          dosage: '',
          frequency: '',
          duration: '',
          instructions: '',
        },
      ])
      setNotes('')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create prescription')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Create Prescription
            </h2>
            <p className="text-sm text-muted-foreground mt-1">For {patientName}</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Diagnosis <span className="text-red-500">*</span>
            </label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter diagnosis"
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-foreground">
                Medications <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddMedication}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Medication
              </button>
            </div>

            <div className="space-y-4">
              {medications.map((medication, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4 bg-muted/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-medium text-foreground">
                      Medication {index + 1}
                    </h4>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(index)}
                        className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                        aria-label="Remove medication"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Medicine Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={medication.medicineName}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'medicineName',
                            e.target.value
                          )
                        }
                        placeholder="e.g., Paracetamol"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-background text-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Dosage <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={medication.dosage}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'dosage',
                            e.target.value
                          )
                        }
                        placeholder="e.g., 500mg"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-background text-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Frequency <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={medication.frequency}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'frequency',
                            e.target.value
                          )
                        }
                        placeholder="e.g., 1-0-1 (Morning-Afternoon-Night)"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-background text-foreground"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Duration <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={medication.duration}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'duration',
                            e.target.value
                          )
                        }
                        placeholder="e.g., 7 days"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-background text-foreground"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={medication.instructions || ''}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'instructions',
                            e.target.value
                          )
                        }
                        placeholder="e.g., Take after meals"
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-background text-foreground"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes or instructions"
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
