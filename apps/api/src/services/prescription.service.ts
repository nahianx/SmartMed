import { prisma, AuditAction } from '@smartmed/database'
import { logAuditEvent } from '../utils/audit'
import {
  CreatePrescriptionData,
  UpdatePrescriptionData,
} from '../schemas/prescription.schemas'
import { Request } from 'express'

type ErrorWithStatus = Error & { status: number }

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

  const prescription = await prisma.prescription.create({
    data: {
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      doctorId,
      diagnosis: data.diagnosis,
      medications: data.medications,
      notes: data.notes || null,
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

  await logAuditEvent({
    userId: doctorId,
    action: AuditAction.PRESCRIPTION_CREATED,
    resourceType: 'Prescription',
    resourceId: prescription.id,
    metadata: {
      appointmentId: data.appointmentId,
      patientId: data.patientId,
      medicationCount: data.medications.length,
    },
    request: req,
  })

  return prescription
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
