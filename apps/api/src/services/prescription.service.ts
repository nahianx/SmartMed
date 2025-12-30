import { prisma, AuditAction, InteractionCheckStatus } from '@smartmed/database'
import { logAuditEvent } from '../utils/audit'
import {
  CreatePrescriptionData,
  UpdatePrescriptionData,
  EnhancedMedicationData,
} from '../schemas/prescription.schemas'
import { Request } from 'express'
import { DrugService, InteractionResult } from './drug.service'
import { AllergyService, AllergyConflict } from './allergy.service'
import env from '../config/env'

type ErrorWithStatus = Error & { status: number }

// Drug and allergy service instances
const drugService = new DrugService()
const allergyService = new AllergyService()

// =============================================================================
// TYPES
// =============================================================================

interface MedicationWithRxcui {
  medicineName: string
  rxcui?: string | null
  [key: string]: unknown
}

interface PrescriptionValidationResult {
  isValid: boolean
  interactions: InteractionResult[]
  allergyConflicts: AllergyConflict[]
  warnings: string[]
  requiresOverride: boolean
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate medications for drug interactions and allergy conflicts
 */
async function validatePrescriptionMedications(
  medications: MedicationWithRxcui[],
  patientId: string,
  skipInteractionCheck: boolean = false
): Promise<PrescriptionValidationResult> {
  const result: PrescriptionValidationResult = {
    isValid: true,
    interactions: [],
    allergyConflicts: [],
    warnings: [],
    requiresOverride: false,
  }

  // Extract RxCUIs from medications
  const rxcuis: string[] = []
  const medicationsWithoutRxcui: string[] = []

  for (const med of medications) {
    if (med.rxcui) {
      rxcuis.push(med.rxcui)
    } else {
      medicationsWithoutRxcui.push(med.medicineName)
      // Try to resolve RxCUI from medication name
      try {
        const resolved = await drugService.resolveDrugName(med.medicineName)
        if (resolved?.rxcui) {
          rxcuis.push(resolved.rxcui)
        }
      } catch {
        // Continue without RxCUI
      }
    }
  }

  // Warn about medications without RxCUI
  if (medicationsWithoutRxcui.length > 0) {
    result.warnings.push(
      `The following medications could not be verified: ${medicationsWithoutRxcui.join(', ')}`
    )
  }

  // Skip further checks if disabled or not enough RxCUIs
  if (skipInteractionCheck || rxcuis.length < 2) {
    return result
  }

  // Check drug-drug interactions
  if (env.INTERACTION_CHECK_ENABLED && rxcuis.length >= 2) {
    try {
      const interactionResult = await drugService.checkInteractions(rxcuis)
      result.interactions = interactionResult.interactions

      // Flag severe/contraindicated interactions
      const severeInteractions = interactionResult.interactions.filter(
        (i) => i.severity === 'CONTRAINDICATED' || i.severity === 'SEVERE'
      )

      if (severeInteractions.length > 0) {
        result.isValid = false
        result.requiresOverride = true
        result.warnings.push(
          `Found ${severeInteractions.length} severe drug interaction(s) that require review`
        )
      }
    } catch (error) {
      result.warnings.push('Unable to check drug interactions - RxNav API unavailable')
    }
  }

  // Check allergy conflicts
  if (env.ALLERGY_CHECK_ENABLED && rxcuis.length > 0) {
    try {
      const allergyResult = await allergyService.checkAllergyConflicts(
        patientId,
        rxcuis,
        'system' // Will be replaced with actual user ID in route
      )
      result.allergyConflicts = allergyResult.conflicts

      if (allergyResult.hasConflicts) {
        result.isValid = false
        result.requiresOverride = true
        result.warnings.push(
          `Found ${allergyResult.conflicts.length} potential allergy conflict(s)`
        )
      }
    } catch (error) {
      result.warnings.push('Unable to check allergy conflicts')
    }
  }

  return result
}

export async function createPrescription(
  data: CreatePrescriptionData,
  doctorId: string,
  req?: Request
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: data.appointmentId },
    include: { patient: true, doctor: true },
  })

  if (!appointment) {
    const error = new Error('Appointment not found') as ErrorWithStatus
    error.status = 404
    throw error
  }

  if (appointment.doctorId !== doctorId) {
    const error = new Error(
      'You can only create prescriptions for your own appointments'
    ) as ErrorWithStatus
    error.status = 403
    throw error
  }

  if (appointment.patientId !== data.patientId) {
    const error = new Error(
      'Patient ID does not match appointment'
    ) as ErrorWithStatus
    error.status = 400
    throw error
  }

  // Validate medications for interactions and allergies
  const skipCheck = data.skipInteractionCheck || false
  const validation = await validatePrescriptionMedications(
    data.medications as MedicationWithRxcui[],
    data.patientId,
    skipCheck
  )

  // If validation requires override and no override provided, return validation result
  if (validation.requiresOverride && !data.interactionOverrideReason) {
    const error = new Error(
      'Prescription requires override due to drug interactions or allergy conflicts'
    ) as ErrorWithStatus & { validationResult: PrescriptionValidationResult }
    error.status = 422
    ;(error as any).validationResult = validation
    throw error
  }

  // Determine interaction check status
  let interactionCheckStatus: InteractionCheckStatus = 'PENDING'
  if (skipCheck) {
    interactionCheckStatus = 'NOT_APPLICABLE'
  } else if (data.interactionOverrideReason) {
    interactionCheckStatus = 'OVERRIDDEN'
  } else if (validation.interactions.length === 0 && validation.allergyConflicts.length === 0) {
    interactionCheckStatus = 'CHECKED'
  }

  const prescription = await prisma.prescription.create({
    data: {
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      doctorId,
      diagnosis: data.diagnosis,
      medications: data.medications,
      notes: data.notes || null,
      interactionCheckStatus,
      interactionOverrideReason: data.interactionOverrideReason || null,
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
        },
      },
      appointment: {
        select: {
          id: true,
          dateTime: true,
          reason: true,
        },
      },
    },
  })

  // Log interaction check if performed
  if (!skipCheck && validation.interactions.length > 0) {
    await logInteractionCheck(
      prescription.id,
      doctorId,
      data.patientId,
      validation,
      data.interactionOverrideReason
    )
  }

  await logAuditEvent({
    userId: doctorId,
    action: AuditAction.PRESCRIPTION_CREATED,
    resourceType: 'Prescription',
    resourceId: prescription.id,
    metadata: {
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      medicationCount: data.medications.length,
      interactionCheckStatus,
      interactionsFound: validation.interactions.length,
      allergyConflictsFound: validation.allergyConflicts.length,
      wasOverridden: !!data.interactionOverrideReason,
    },
    request: req,
  })

  return {
    prescription,
    validation: {
      warnings: validation.warnings,
      interactions: validation.interactions,
      allergyConflicts: validation.allergyConflicts,
    },
  }
}

/**
 * Log interaction check to database
 */
async function logInteractionCheck(
  prescriptionId: string,
  checkedById: string,
  patientId: string,
  validation: PrescriptionValidationResult,
  overrideReason?: string | null
): Promise<void> {
  try {
    await prisma.interactionCheck.create({
      data: {
        prescriptionId,
        checkedById,
        checkedDrugs: validation.interactions.map((i) => i.drug1Rxcui).filter(Boolean),
        interactionsFound: validation.interactions as any,
        hasSevereInteractions: validation.interactions.some(
          (i) => i.severity === 'CONTRAINDICATED' || i.severity === 'SEVERE'
        ),
        status: overrideReason ? 'OVERRIDDEN' : 'CHECKED',
        overrideReason,
        overriddenAt: overrideReason ? new Date() : null,
        overriddenById: overrideReason ? checkedById : null,
      },
    })
  } catch (error) {
    console.error('Failed to log interaction check:', error)
  }
}

export async function updatePrescription(
  prescriptionId: string,
  data: UpdatePrescriptionData,
  doctorId: string,
  req?: Request
) {
  const existing = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
  })

  if (!existing) {
    const error = new Error('Prescription not found') as Error & {
      status: number
    }
    error.status = 404
    throw error
  }

  if (existing.doctorId !== doctorId) {
    const error = new Error(
      'You can only update your own prescriptions'
    ) as Error & { status: number }
    error.status = 403
    throw error
  }

  const updateData: Record<string, unknown> = {}
  if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis
  if (data.medications !== undefined) updateData.medications = data.medications
  if (data.notes !== undefined) updateData.notes = data.notes

  const prescription = await prisma.prescription.update({
    where: { id: prescriptionId },
    data: updateData,
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
        },
      },
      appointment: {
        select: {
          id: true,
          dateTime: true,
          reason: true,
        },
      },
    },
  })

  await logAuditEvent({
    userId: doctorId,
    action: AuditAction.PRESCRIPTION_UPDATED,
    resourceType: 'Prescription',
    resourceId: prescription.id,
    metadata: {
      updatedFields: Object.keys(updateData),
      medicationCount: data.medications?.length,
    },
    request: req,
  })

  return prescription
}

export async function getPrescriptionById(
  prescriptionId: string,
  userId: string,
  userRole: string
) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      patient: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
        },
      },
      doctor: {
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          specialization: true,
          qualification: true,
        },
      },
      appointment: {
        select: {
          id: true,
          dateTime: true,
          reason: true,
          status: true,
        },
      },
    },
  })

  if (!prescription) {
    const error = new Error('Prescription not found') as Error & {
      status: number
    }
    error.status = 404
    throw error
  }

  if (userRole === 'PATIENT' && prescription.patient.userId !== userId) {
    const error = new Error('Access denied') as Error & { status: number }
    error.status = 403
    throw error
  }

  if (userRole === 'DOCTOR' && prescription.doctor.userId !== userId) {
    const error = new Error('Access denied') as Error & { status: number }
    error.status = 403
    throw error
  }

  return prescription
}

export async function getPrescriptionsByPatient(
  patientId: string,
  userId: string,
  userRole: string,
  offset: number = 0,
  limit: number = 20
) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { userId: true },
  })

  if (!patient) {
    const error = new Error('Patient not found') as Error & { status: number }
    error.status = 404
    throw error
  }

  if (userRole === 'PATIENT' && patient.userId !== userId) {
    const error = new Error('Access denied') as Error & { status: number }
    error.status = 403
    throw error
  }

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        appointment: {
          select: {
            id: true,
            dateTime: true,
            reason: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.prescription.count({ where: { patientId } }),
  ])

  return {
    prescriptions,
    pagination: {
      offset,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getPrescriptionsByDoctor(
  doctorId: string,
  userId: string,
  userRole: string,
  offset: number = 0,
  limit: number = 20
) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { userId: true },
  })

  if (!doctor) {
    const error = new Error('Doctor not found') as Error & { status: number }
    error.status = 404
    throw error
  }

  if (userRole === 'DOCTOR' && doctor.userId !== userId) {
    const error = new Error('Access denied') as Error & { status: number }
    error.status = 403
    throw error
  }

  const [prescriptions, total] = await Promise.all([
    prisma.prescription.findMany({
      where: { doctorId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        appointment: {
          select: {
            id: true,
            dateTime: true,
            reason: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.prescription.count({ where: { doctorId } }),
  ])

  return {
    prescriptions,
    pagination: {
      offset,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// =============================================================================
// VALIDATION AND INTERACTION CHECKING (EXPORTED)
// =============================================================================

/**
 * Preview/validate medications before creating prescription
 * This allows the frontend to show interaction warnings before submission
 */
export async function previewPrescriptionValidation(
  medications: MedicationWithRxcui[],
  patientId: string
): Promise<PrescriptionValidationResult> {
  return validatePrescriptionMedications(medications, patientId, false)
}

/**
 * Get interaction history for a prescription
 */
export async function getPrescriptionInteractionHistory(
  prescriptionId: string
) {
  const checks = await prisma.interactionCheck.findMany({
    where: { prescriptionId },
    orderBy: { checkedAt: 'desc' },
    include: {
      checkedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      overriddenBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })
  return checks
}

/**
 * Get all prescriptions for a patient with interaction status
 */
export async function getPatientPrescriptionsWithInteractions(
  patientId: string,
  limit: number = 10
) {
  const prescriptions = await prisma.prescription.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      diagnosis: true,
      medications: true,
      interactionCheckStatus: true,
      interactionOverrideReason: true,
      createdAt: true,
      doctor: {
        select: {
          firstName: true,
          lastName: true,
          specialization: true,
        },
      },
    },
  })
  return prescriptions
}

// Export types
export type { PrescriptionValidationResult, MedicationWithRxcui }
