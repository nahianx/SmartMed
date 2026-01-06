/**
 * Appointment Booking Routes
 * 
 * Handles appointment creation, validation, and availability checking.
 */

import { Router, Response } from 'express'
import { prisma, AppointmentStatus, ActivityType, Prisma } from '@smartmed/database'
import { AuthenticatedRequest } from '../../types/auth'
import { validateSchema } from '../../middleware/validation'
import { requireAuth, requireRole } from '../../middleware/auth'
import { rateLimiter } from '../../middleware/rateLimiter'
import { createAppointmentSchema } from '../../schemas/appointment.schemas'
import { sendBookingConfirmationEmails } from '../../services/appointment-email.service'
import { UserRole } from '@smartmed/types'
import { isDoctorAvailable, findConflictingAppointments } from './shared'

const router = Router()

/**
 * POST /api/appointments/validate
 * Validate if a time slot is available for an appointment
 */
router.post(
  '/validate',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { doctorId, dateTime, duration } = req.body

      if (!doctorId || !dateTime || !duration) {
        return res.status(400).json({
          error: 'Missing required fields: doctorId, dateTime, duration',
        })
      }

      const appointmentStart = new Date(dateTime)
      if (Number.isNaN(appointmentStart.getTime())) {
        return res.status(400).json({ error: 'Invalid dateTime' })
      }

      const isAvailable = await isDoctorAvailable(
        prisma,
        doctorId,
        appointmentStart,
        duration
      )
      if (!isAvailable) {
        return res.json({
          valid: false,
          reason: 'Doctor is not available for the selected time',
        })
      }

      const conflicts = await findConflictingAppointments(
        prisma,
        doctorId,
        appointmentStart,
        duration
      )

      res.json({
        valid: conflicts.length === 0,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      })
    } catch (error) {
      console.error('Error validating appointment:', error)
      res.status(500).json({ error: 'Failed to validate appointment' })
    }
  }
)

/**
 * POST /api/appointments
 * Create a new appointment request
 */
router.post(
  '/',
  requireAuth,
  requireRole(UserRole.PATIENT),
  rateLimiter(10, 60 * 1000),
  validateSchema({ body: createAppointmentSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { doctorId, dateTime, duration, reason, notes } = req.body
      const appointmentStart = new Date(dateTime)

      const appointment = await prisma.$transaction(async (tx) => {
        const patient = await tx.patient.findUnique({
          where: { userId: req.user!.id },
          select: { id: true, firstName: true, lastName: true },
        })

        if (!patient) {
          const error: any = new Error('Patient profile not found')
          error.status = 404
          throw error
        }

        const doctor = await tx.doctor.findUnique({
          where: { id: doctorId },
          select: { id: true, firstName: true, lastName: true, specialization: true },
        })

        if (!doctor) {
          const error: any = new Error('Doctor not found')
          error.status = 404
          throw error
        }

        const available = await isDoctorAvailable(
          tx,
          doctorId,
          appointmentStart,
          duration
        )
        if (!available) {
          const error: any = new Error('Doctor is not available for the selected time')
          error.status = 400
          throw error
        }

        const conflicts = await findConflictingAppointments(
          tx,
          doctorId,
          appointmentStart,
          duration
        )
        if (conflicts.length > 0) {
          const error: any = new Error('Doctor already has an appointment at this time')
          error.status = 409
          throw error
        }

        const created = await tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId,
            dateTime: appointmentStart,
            duration,
            reason: reason.trim(),
            notes: typeof notes === 'string' ? notes.trim() : notes,
            status: AppointmentStatus.PENDING,
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
          },
        })

        await tx.activity.create({
          data: {
            type: ActivityType.APPOINTMENT,
            occurredAt: appointmentStart,
            patientId: patient.id,
            doctorId,
            appointmentId: created.id,
            title: `Appointment request with Dr. ${doctor.firstName} ${doctor.lastName}`,
            subtitle: reason.trim(),
            tags: JSON.stringify([doctor.specialization]),
            status: AppointmentStatus.PENDING,
            notes,
          },
        })

        return created
      })

      // Send confirmation emails (non-blocking)
      sendBookingConfirmationEmails(appointment.id)
        .then(result => {
          console.log('📧 Confirmation emails sent:', {
            patient: result.patientEmail.success ? '✅' : '❌',
            doctor: result.doctorEmail.success ? '✅' : '❌',
          })
        })
        .catch(err => {
          console.error('📧 Email sending error:', err)
          // Don't fail the booking if email fails
        })

      res.status(201).json({
        message: 'Appointment request created successfully',
        appointment,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(409).json({
            error: 'Doctor already has an appointment at this time',
          })
        }
      }

      const status = (error as any)?.status || 500
      const message =
        (error as any)?.message || 'Failed to create appointment'
      console.error('Error creating appointment:', error)
      res.status(status).json({ error: message })
    }
  }
)

export default router
