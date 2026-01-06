/**
 * Appointment Reschedule Routes
 * 
 * Handles patient self-service appointment rescheduling with business rules:
 * - Can only reschedule appointments at least 2 hours before the scheduled time
 * - Maximum 3 reschedules per appointment
 * - Must check for conflicts before allowing reschedule
 * - Notifications sent to doctor and patient
 */

import { Router, Response } from 'express'
import { prisma, AppointmentStatus } from '@smartmed/database'
import { AuthenticatedRequest } from '../../types/auth'
import { validateSchema } from '../../middleware/validation'
import { requireAuth, requireRole } from '../../middleware/auth'
import { rateLimiter } from '../../middleware/rateLimiter'
import { UserRole } from '@smartmed/types'
import { z } from 'zod'
import { isDoctorAvailable, findConflictingAppointments } from './shared'
import { sendBookingUpdateEmails } from '../../services/appointment-email.service'

const router = Router()

// Maximum number of reschedules allowed per appointment
const MAX_RESCHEDULES = 3

// Minimum hours before appointment that rescheduling is allowed
const MIN_HOURS_BEFORE_RESCHEDULE = 2

// Validation schema for reschedule request
const rescheduleParamsSchema = z.object({
  id: z.string().uuid('Invalid appointment ID'),
})

const rescheduleBodySchema = z.object({
  newDateTime: z.string().datetime('Invalid date/time format'),
  reason: z.string().min(5, 'Reschedule reason must be at least 5 characters').max(500, 'Reason too long').optional(),
})

// Types for reschedule history
interface RescheduleRecord {
  previousDateTime: string
  newDateTime: string
  rescheduleReason: string | null
  rescheduledAt: string
  rescheduledBy: string
}

/**
 * GET /api/appointments/:id/reschedule/available-slots
 * Get available slots for rescheduling an appointment
 */
router.get(
  '/:id/reschedule/available-slots',
  requireAuth,
  requireRole(UserRole.PATIENT),
  rateLimiter(20, 60 * 1000),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const { startDate, endDate } = req.query

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get the appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: { select: { userId: true } },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              availability: {
                select: {
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                  hasBreak: true,
                  breakStart: true,
                  breakEnd: true,
                },
              },
            },
          },
        },
      })

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      // Verify ownership
      if (appointment.patient.userId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Parse date range (default to next 14 days)
      const start = startDate 
        ? new Date(startDate as string) 
        : new Date()
      const end = endDate 
        ? new Date(endDate as string) 
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

      // Get existing appointments for the doctor in this range
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          doctorId: appointment.doctorId,
          dateTime: {
            gte: start,
            lte: end,
          },
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.ACCEPTED,
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.SCHEDULED,
            ],
          },
          id: { not: id }, // Exclude current appointment
        },
        select: {
          dateTime: true,
          duration: true,
        },
      })

      // Generate available slots based on doctor's availability
      const availableSlots: Array<{ date: string; time: string; dateTime: string }> = []
      const availability = appointment.doctor.availability || []

      // Iterate through each day in the range
      const current = new Date(start)
      current.setHours(0, 0, 0, 0)

      while (current <= end) {
        const dayOfWeek = current.getDay()
        const dayAvailability = availability.filter(a => a.dayOfWeek === dayOfWeek)

        for (const slot of dayAvailability) {
          // Parse slot times
          const [startHour, startMin] = slot.startTime.split(':').map(Number)
          const [endHour, endMin] = slot.endTime.split(':').map(Number)

          // Generate slots in 30-minute intervals
          let slotTime = new Date(current)
          slotTime.setHours(startHour, startMin, 0, 0)

          const endTime = new Date(current)
          endTime.setHours(endHour, endMin, 0, 0)

          while (slotTime < endTime) {
            const slotEnd = new Date(slotTime.getTime() + appointment.duration * 60 * 1000)
            
            // Skip if slot end is past availability end
            if (slotEnd > endTime) break

            // Check if during break
            if (slot.hasBreak && slot.breakStart && slot.breakEnd) {
              const [breakStartHour, breakStartMin] = slot.breakStart.split(':').map(Number)
              const [breakEndHour, breakEndMin] = slot.breakEnd.split(':').map(Number)
              
              const breakStart = new Date(current)
              breakStart.setHours(breakStartHour, breakStartMin, 0, 0)
              
              const breakEnd = new Date(current)
              breakEnd.setHours(breakEndHour, breakEndMin, 0, 0)

              // Skip if overlaps with break
              if (slotTime < breakEnd && slotEnd > breakStart) {
                slotTime = new Date(slotTime.getTime() + 30 * 60 * 1000)
                continue
              }
            }

            // Skip if in the past or within minimum reschedule window
            const minRescheduleTime = new Date(Date.now() + MIN_HOURS_BEFORE_RESCHEDULE * 60 * 60 * 1000)
            if (slotTime <= minRescheduleTime) {
              slotTime = new Date(slotTime.getTime() + 30 * 60 * 1000)
              continue
            }

            // Check for conflicts with existing appointments
            const hasConflict = existingAppointments.some(existing => {
              const existingStart = new Date(existing.dateTime)
              const existingEnd = new Date(existingStart.getTime() + existing.duration * 60 * 1000)
              return slotTime < existingEnd && slotEnd > existingStart
            })

            if (!hasConflict) {
              availableSlots.push({
                date: slotTime.toISOString().split('T')[0],
                time: slotTime.toTimeString().slice(0, 5),
                dateTime: slotTime.toISOString(),
              })
            }

            slotTime = new Date(slotTime.getTime() + 30 * 60 * 1000)
          }
        }

        current.setDate(current.getDate() + 1)
      }

      res.json({
        appointment: {
          id: appointment.id,
          currentDateTime: appointment.dateTime,
          duration: appointment.duration,
          doctor: {
            id: appointment.doctor.id,
            name: `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
          },
        },
        availableSlots,
        rules: {
          maxReschedules: MAX_RESCHEDULES,
          minHoursBeforeReschedule: MIN_HOURS_BEFORE_RESCHEDULE,
        },
      })
    } catch (error) {
      console.error('Error fetching available slots:', error)
      res.status(500).json({ error: 'Failed to fetch available slots' })
    }
  }
)

/**
 * POST /api/appointments/:id/reschedule
 * Reschedule an appointment to a new date/time
 */
router.post(
  '/:id/reschedule',
  requireAuth,
  requireRole(UserRole.PATIENT),
  rateLimiter(5, 60 * 1000), // Limit to 5 reschedules per minute
  validateSchema({ params: rescheduleParamsSchema, body: rescheduleBodySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const { newDateTime, reason } = req.body

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const result = await prisma.$transaction(async (tx) => {
        // Get the appointment with full details
        const appointment = await tx.appointment.findUnique({
          where: { id },
          include: {
            patient: { select: { id: true, userId: true, firstName: true, lastName: true } },
            doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
          },
        })

        if (!appointment) {
          const error: any = new Error('Appointment not found')
          error.status = 404
          throw error
        }

        // Verify ownership
        if (appointment.patient.userId !== req.user!.id) {
          const error: any = new Error('Access denied')
          error.status = 403
          throw error
        }

        // Check appointment status
        const rescheduleableStatuses: AppointmentStatus[] = [
          AppointmentStatus.PENDING,
          AppointmentStatus.ACCEPTED,
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.SCHEDULED,
        ]

        if (!rescheduleableStatuses.includes(appointment.status)) {
          const error: any = new Error(`Cannot reschedule an appointment with status: ${appointment.status}`)
          error.status = 400
          throw error
        }

        // Parse reschedule history from notes (stored as JSON)
        let rescheduleHistory: RescheduleRecord[] = []
        try {
          if (appointment.notes) {
            const notes = JSON.parse(appointment.notes)
            if (notes.rescheduleHistory && Array.isArray(notes.rescheduleHistory)) {
              rescheduleHistory = notes.rescheduleHistory
            }
          }
        } catch {
          // Notes is not JSON, that's fine
        }

        // Check reschedule count
        if (rescheduleHistory.length >= MAX_RESCHEDULES) {
          const error: any = new Error(`Maximum reschedules (${MAX_RESCHEDULES}) reached for this appointment`)
          error.status = 400
          throw error
        }

        // Check minimum time before appointment
        const now = new Date()
        const minRescheduleTime = new Date(appointment.dateTime.getTime() - MIN_HOURS_BEFORE_RESCHEDULE * 60 * 60 * 1000)
        
        if (now > minRescheduleTime) {
          const error: any = new Error(`Cannot reschedule within ${MIN_HOURS_BEFORE_RESCHEDULE} hours of the appointment`)
          error.status = 400
          throw error
        }

        // Parse new date/time
        const newDate = new Date(newDateTime)
        if (isNaN(newDate.getTime())) {
          const error: any = new Error('Invalid date/time format')
          error.status = 400
          throw error
        }

        // Ensure new time is in the future
        if (newDate <= now) {
          const error: any = new Error('New appointment time must be in the future')
          error.status = 400
          throw error
        }

        // Check doctor availability
        const isAvailable = await isDoctorAvailable(
          tx,
          appointment.doctorId,
          newDate,
          appointment.duration
        )

        if (!isAvailable) {
          const error: any = new Error('Doctor is not available at the requested time')
          error.status = 400
          throw error
        }

        // Check for conflicts (excluding current appointment)
        const conflicts = await findConflictingAppointments(
          tx,
          appointment.doctorId,
          newDate,
          appointment.duration,
          id // Exclude current appointment
        )

        if (conflicts.length > 0) {
          const error: any = new Error('The requested time slot conflicts with another appointment')
          error.status = 409
          throw error
        }

        // Create reschedule record
        const rescheduleRecord: RescheduleRecord = {
          previousDateTime: appointment.dateTime.toISOString(),
          newDateTime: newDate.toISOString(),
          rescheduleReason: reason || null,
          rescheduledAt: now.toISOString(),
          rescheduledBy: req.user!.id,
        }

        rescheduleHistory.push(rescheduleRecord)

        // Build updated notes with reschedule history
        let updatedNotes: any = {}
        try {
          if (appointment.notes) {
            updatedNotes = JSON.parse(appointment.notes)
          }
        } catch {
          // Notes was plain text, preserve it
          if (appointment.notes) {
            updatedNotes.originalNotes = appointment.notes
          }
        }
        updatedNotes.rescheduleHistory = rescheduleHistory

        // Update the appointment
        const updated = await tx.appointment.update({
          where: { id },
          data: {
            dateTime: newDate,
            notes: JSON.stringify(updatedNotes),
            status: AppointmentStatus.PENDING, // Reset to pending for doctor approval
          },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            doctor: { select: { id: true, firstName: true, lastName: true, specialization: true } },
          },
        })

        // Update activity record
        await tx.activity.updateMany({
          where: { appointmentId: id },
          data: {
            occurredAt: newDate,
            title: `Rescheduled: Appointment with Dr. ${updated.doctor?.firstName ?? ''} ${updated.doctor?.lastName ?? ''}`.trim(),
            status: AppointmentStatus.PENDING,
          },
        })

        return {
          appointment: updated,
          rescheduleHistory,
          rescheduleCount: rescheduleHistory.length,
          remainingReschedules: MAX_RESCHEDULES - rescheduleHistory.length,
        }
      })

      // Send notification emails (non-blocking)
      sendBookingUpdateEmails(id, 'rescheduled')
        .then(emailResult => console.log('📧 Reschedule emails:', emailResult.success ? '✅' : '❌'))
        .catch(err => console.error('📧 Email error:', err))

      res.json({
        message: 'Appointment rescheduled successfully',
        ...result,
      })
    } catch (error) {
      const status = (error as any)?.status || 500
      const message = (error as any)?.message || 'Failed to reschedule appointment'
      console.error('Error rescheduling appointment:', error)
      res.status(status).json({ error: message })
    }
  }
)

/**
 * GET /api/appointments/:id/reschedule/history
 * Get reschedule history for an appointment
 */
router.get(
  '/:id/reschedule/history',
  requireAuth,
  rateLimiter(30, 60 * 1000),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: { select: { userId: true } },
          doctor: { select: { userId: true } },
        },
      })

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      // Check access (patient, doctor, or admin)
      const isPatient = appointment.patient.userId === req.user.id
      const isDoctor = appointment.doctor.userId === req.user.id
      const isAdmin = req.user.role === 'ADMIN'

      if (!isPatient && !isDoctor && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Parse reschedule history from notes
      let rescheduleHistory: RescheduleRecord[] = []
      try {
        if (appointment.notes) {
          const notes = JSON.parse(appointment.notes)
          if (notes.rescheduleHistory && Array.isArray(notes.rescheduleHistory)) {
            rescheduleHistory = notes.rescheduleHistory
          }
        }
      } catch {
        // Notes is not JSON, no history
      }

      res.json({
        appointmentId: id,
        currentDateTime: appointment.dateTime,
        rescheduleHistory,
        rescheduleCount: rescheduleHistory.length,
        remainingReschedules: MAX_RESCHEDULES - rescheduleHistory.length,
        canReschedule: rescheduleHistory.length < MAX_RESCHEDULES,
      })
    } catch (error) {
      console.error('Error fetching reschedule history:', error)
      res.status(500).json({ error: 'Failed to fetch reschedule history' })
    }
  }
)

export default router
