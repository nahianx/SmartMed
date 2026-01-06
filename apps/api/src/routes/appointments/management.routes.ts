/**
 * Appointment Management Routes
 * 
 * Handles appointment status changes: accept, reject, complete, cancel, no-show.
 */

import { Router, Response } from 'express'
import { prisma, AppointmentStatus } from '@smartmed/database'
import { AuthenticatedRequest } from '../../types/auth'
import { validateSchema } from '../../middleware/validation'
import { requireAuth, requireRole } from '../../middleware/auth'
import { requireAppointmentOwnership } from '../../middleware/appointmentOwnership'
import { rateLimiter } from '../../middleware/rateLimiter'
import {
  updateAppointmentSchema,
  appointmentIdSchema,
} from '../../schemas/appointment.schemas'
import {
  sendBookingUpdateEmails,
  sendBookingCancellationEmails,
} from '../../services/appointment-email.service'
import { UserRole } from '@smartmed/types'

const router = Router()

/**
 * PATCH /api/appointments/:id/accept
 * Doctor accepts a pending appointment request
 */
router.patch(
  '/:id/accept',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  rateLimiter(30, 60 * 1000),
  validateSchema({ params: appointmentIdSchema }),
  requireAppointmentOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appointment = (req as any).appointment
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      if (appointment.status !== AppointmentStatus.PENDING) {
        return res.status(400).json({
          error: 'Only pending appointments can be accepted',
        })
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.ACCEPTED },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
        },
      })

      await prisma.activity.updateMany({
        where: { appointmentId: appointment.id },
        data: {
          status: AppointmentStatus.ACCEPTED,
          title: `Appointment with Dr. ${updatedAppointment.doctor?.firstName ?? ''} ${updatedAppointment.doctor?.lastName ?? ''}`.trim(),
        },
      })

      // Send status update email to patient (non-blocking)
      sendBookingUpdateEmails(appointment.id, 'status_changed')
        .then(result => console.log('📧 Acceptance email:', result.success ? '✅' : '❌'))
        .catch(err => console.error('📧 Email error:', err))

      res.json({
        message: 'Appointment accepted',
        appointment: updatedAppointment,
      })
    } catch (error) {
      console.error('Error accepting appointment:', error)
      res.status(500).json({ error: 'Failed to accept appointment' })
    }
  }
)

/**
 * PATCH /api/appointments/:id/reject
 * Doctor rejects a pending appointment request
 */
router.patch(
  '/:id/reject',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  rateLimiter(30, 60 * 1000),
  validateSchema({ params: appointmentIdSchema }),
  requireAppointmentOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appointment = (req as any).appointment
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      if (appointment.status !== AppointmentStatus.PENDING) {
        return res.status(400).json({
          error: 'Only pending appointments can be rejected',
        })
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.REJECTED },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
        },
      })

      await prisma.activity.updateMany({
        where: { appointmentId: appointment.id },
        data: {
          status: AppointmentStatus.REJECTED,
          title: `Appointment request rejected by Dr. ${updatedAppointment.doctor?.firstName ?? ''} ${updatedAppointment.doctor?.lastName ?? ''}`.trim(),
        },
      })

      // Send rejection email to patient (non-blocking)
      sendBookingCancellationEmails(appointment.id, 'doctor', 'Appointment request was declined by the doctor')
        .then(result => console.log('📧 Rejection email:', result.success ? '✅' : '❌'))
        .catch(err => console.error('📧 Email error:', err))

      res.json({
        message: 'Appointment rejected',
        appointment: updatedAppointment,
      })
    } catch (error) {
      console.error('Error rejecting appointment:', error)
      res.status(500).json({ error: 'Failed to reject appointment' })
    }
  }
)

/**
 * PATCH /api/appointments/:id/complete
 * Doctor marks an appointment as completed
 */
router.patch(
  '/:id/complete',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  rateLimiter(30, 60 * 1000),
  validateSchema({ params: appointmentIdSchema }),
  requireAppointmentOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appointment = (req as any).appointment
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      const completableStatuses = [
        AppointmentStatus.ACCEPTED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.SCHEDULED,
      ]
      if (!completableStatuses.includes(appointment.status)) {
        return res.status(400).json({
          error: 'Only accepted appointments can be completed',
        })
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.COMPLETED },
      })

      await prisma.activity.updateMany({
        where: { appointmentId: appointment.id },
        data: { status: AppointmentStatus.COMPLETED },
      })

      res.json({
        message: 'Appointment marked as completed',
        appointment: updatedAppointment,
      })
    } catch (error) {
      console.error('Error completing appointment:', error)
      res.status(500).json({ error: 'Failed to complete appointment' })
    }
  }
)

/**
 * PATCH /api/appointments/:id/no-show
 * Doctor marks an appointment as no-show
 */
router.patch(
  '/:id/no-show',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  rateLimiter(30, 60 * 1000),
  validateSchema({ params: appointmentIdSchema }),
  requireAppointmentOwnership,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appointment = (req as any).appointment
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      const noShowStatuses = [
        AppointmentStatus.ACCEPTED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.SCHEDULED,
      ]
      if (!noShowStatuses.includes(appointment.status)) {
        return res.status(400).json({
          error: 'Only accepted appointments can be marked as no-show',
        })
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.NO_SHOW },
      })

      await prisma.activity.updateMany({
        where: { appointmentId: appointment.id },
        data: { status: AppointmentStatus.NO_SHOW },
      })

      res.json({
        message: 'Appointment marked as no-show',
        appointment: updatedAppointment,
      })
    } catch (error) {
      console.error('Error marking appointment as no-show:', error)
      res.status(500).json({ error: 'Failed to mark appointment as no-show' })
    }
  }
)

/**
 * PUT /api/appointments/:id
 * Update appointment details (reason, notes)
 */
router.put(
  '/:id',
  requireAuth,
  requireAppointmentOwnership,
  validateSchema({
    params: appointmentIdSchema,
    body: updateAppointmentSchema,
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const { reason, notes } = req.body
      const existingAppointment = (req as any).appointment

      if (!existingAppointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      if (
        existingAppointment.status === AppointmentStatus.CANCELLED ||
        existingAppointment.status === AppointmentStatus.REJECTED
      ) {
        return res.status(400).json({
          error: 'Cannot update a cancelled or rejected appointment',
        })
      }

      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          ...(reason && { reason: reason.trim() }),
          ...(notes !== undefined && {
            notes: typeof notes === 'string' ? notes.trim() : notes,
          }),
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

      await prisma.activity.updateMany({
        where: { appointmentId: id },
        data: {
          ...(reason && {
            subtitle: reason.trim(),
          }),
          ...(notes !== undefined && { notes }),
        },
      })

      res.json({
        message: 'Appointment updated successfully',
        appointment: updatedAppointment,
      })
    } catch (error) {
      console.error('Error updating appointment:', error)
      res.status(500).json({ error: 'Failed to update appointment' })
    }
  }
)

/**
 * DELETE /api/appointments/:id
 * Cancel an appointment
 */
router.delete(
  '/:id',
  requireAuth,
  requireAppointmentOwnership,
  validateSchema({ params: appointmentIdSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const appointment = (req as any).appointment

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      // Don't allow cancelling past appointments
      if (appointment.dateTime <= new Date()) {
        return res.status(400).json({
          error: 'Cannot cancel past appointments',
        })
      }

      const cancellableStatuses = [
        AppointmentStatus.PENDING,
        AppointmentStatus.ACCEPTED,
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
      ]
      if (!cancellableStatuses.includes(appointment.status)) {
        return res.status(400).json({
          error: 'Appointment cannot be cancelled in its current status',
        })
      }

      // Update appointment status to cancelled
      const cancelledAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          notes: appointment.notes
            ? `${appointment.notes}\n\nCancelled on ${new Date().toISOString()}`
            : `Cancelled on ${new Date().toISOString()}`,
        },
        include: {
          doctor: { select: { firstName: true, lastName: true } },
        },
      })

      // Update corresponding activity
      await prisma.activity.updateMany({
        where: { appointmentId: id },
        data: {
          status: AppointmentStatus.CANCELLED,
          title: `[CANCELLED] Appointment with Dr. ${cancelledAppointment.doctor?.firstName ?? ''} ${cancelledAppointment.doctor?.lastName ?? ''}`.trim(),
        },
      })

      // Determine who cancelled (based on user role)
      const cancelledBy = req.user?.role === UserRole.DOCTOR ? 'doctor' : 'patient'

      // Send cancellation email (non-blocking)
      sendBookingCancellationEmails(id, cancelledBy)
        .then(result => console.log('📧 Cancellation email:', result.success ? '✅' : '❌'))
        .catch(err => console.error('📧 Email error:', err))

      res.json({
        message: 'Appointment cancelled successfully',
        appointment: cancelledAppointment,
      })
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      res.status(500).json({ error: 'Failed to cancel appointment' })
    }
  }
)

export default router
