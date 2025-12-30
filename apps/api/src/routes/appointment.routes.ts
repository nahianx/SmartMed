import { Router, Response } from 'express'
import { prisma, AppointmentStatus, ActivityType, Prisma, PrismaClient } from '@smartmed/database'
import { AuthenticatedRequest } from '../types/auth'
import { validateSchema } from '../middleware/validation'
import { requireAuth, requireRole } from '../middleware/auth'
import { requireAppointmentOwnership } from '../middleware/appointmentOwnership'
import { rateLimiter } from '../middleware/rateLimiter'
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentIdSchema,
  appointmentQuerySchema,
} from '../schemas/appointment.schemas'
import { appointmentSearchSchema } from '../schemas/search.schemas'
import { searchAppointments } from '../services/appointment.service'
import { logSearchOperation } from '../utils/audit'
import { UserRole } from '@smartmed/types'

const router = Router()

type DbClient = PrismaClient | Prisma.TransactionClient

const BLOCKING_STATUSES = [
  AppointmentStatus.PENDING,
  AppointmentStatus.ACCEPTED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.SCHEDULED,
]

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10))
  return hours * 60 + minutes
}

function getUtcMinutes(date: Date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes()
}

function timeRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
) {
  return startA < endB && endA > startB
}

function slotAllowsTime(
  slot: {
    startTime: string
    endTime: string
    hasBreak: boolean
    breakStart: string | null
    breakEnd: string | null
  },
  startMinutes: number,
  endMinutes: number
) {
  const slotStart = parseTimeToMinutes(slot.startTime)
  const slotEnd = parseTimeToMinutes(slot.endTime)
  if (startMinutes < slotStart || endMinutes > slotEnd) return false

  if (slot.hasBreak && slot.breakStart && slot.breakEnd) {
    const breakStart = parseTimeToMinutes(slot.breakStart)
    const breakEnd = parseTimeToMinutes(slot.breakEnd)
    const overlapsBreak =
      startMinutes < breakEnd && endMinutes > breakStart
    if (overlapsBreak) return false
  }

  return true
}

async function isDoctorAvailable(
  db: DbClient,
  doctorId: string,
  startTime: Date,
  duration: number
) {
  const dayOfWeek = startTime.getUTCDay()
  const startMinutes = getUtcMinutes(startTime)
  const endMinutes = startMinutes + duration

  const slots = await db.doctorAvailability.findMany({
    where: { doctorId, dayOfWeek, isAvailable: true },
  })

  return slots.some((slot) =>
    slotAllowsTime(
      {
        startTime: slot.startTime,
        endTime: slot.endTime,
        hasBreak: slot.hasBreak,
        breakStart: slot.breakStart,
        breakEnd: slot.breakEnd,
      },
      startMinutes,
      endMinutes
    )
  )
}

async function findConflictingAppointments(
  db: DbClient,
  doctorId: string,
  startTime: Date,
  duration: number,
  excludeId?: string
) {
  const endTime = new Date(startTime.getTime() + duration * 60000)
  const conflicts = await db.appointment.findMany({
    where: {
      doctorId,
      status: { in: BLOCKING_STATUSES },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      dateTime: { lt: endTime },
    },
    select: {
      id: true,
      dateTime: true,
      duration: true,
      status: true,
    },
  })

  return conflicts.filter((existing) => {
    const existingStart = existing.dateTime
    const existingEnd = new Date(
      existingStart.getTime() + existing.duration * 60000
    )
    return timeRangesOverlap(startTime, endTime, existingStart, existingEnd)
  })
}

// Advanced appointment search with filters and RBAC
router.get(
  '/search',
  requireAuth,
  validateSchema({ query: appointmentSearchSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const filters = req.query as any
      const result = await searchAppointments({
        ...filters,
        userId: req.user.id,
        userRole: req.user.role,
      })

      await logSearchOperation(
        req.user.id,
        req.user.role,
        'APPOINTMENT_SEARCH',
        filters,
        result.pagination.totalResults,
        req
      )

      res.json(result)
    } catch (error) {
      console.error('Error searching appointments:', error)
      res.status(500).json({ error: 'Failed to search appointments' })
    }
  }
)

// Get all appointments for authenticated user
router.get(
  '/',
  requireAuth,
  validateSchema({ query: appointmentQuerySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      let appointments

      if (req.user.role === 'ADMIN') {
        // Admins can see all appointments
        appointments = await prisma.appointment.findMany({
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                dateOfBirth: true,
                gender: true,
                bloodGroup: true,
                allergies: true,
                medicalHistory: true,
                address: true,
                emergencyContact: true,
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                consultationFee: true,
              },
            },
            prescriptions: true,
            reports: true,
          },
          orderBy: { dateTime: 'desc' },
        })
      } else if (req.user.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({
          where: { userId: req.user.id },
        })

        if (!patient) {
          return res.status(404).json({ error: 'Patient profile not found' })
        }

        appointments = await prisma.appointment.findMany({
          where: { patientId: patient.id },
          include: {
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
              },
            },
            prescriptions: true,
            reports: true,
          },
          orderBy: { dateTime: 'desc' },
        })
      } else if (req.user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({
          where: { userId: req.user.id },
        })

        if (!doctor) {
          return res.status(404).json({ error: 'Doctor profile not found' })
        }

        appointments = await prisma.appointment.findMany({
          where: { doctorId: doctor.id },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                dateOfBirth: true,
                gender: true,
                bloodGroup: true,
                allergies: true,
                medicalHistory: true,
                address: true,
                emergencyContact: true,
              },
            },
            prescriptions: true,
            reports: true,
          },
          orderBy: { dateTime: 'desc' },
        })
      } else {
        return res.status(403).json({ error: 'Unauthorized role' })
      }

      res.json({ appointments })
    } catch (error) {
      console.error('Error fetching appointments:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      res.status(500).json({
        error: 'Failed to fetch appointments',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
)

// Get appointment by ID
router.get(
  '/:id',
  requireAuth,
  validateSchema({ params: appointmentIdSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const { id } = req.params

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true,
              consultationFee: true,
            },
          },
          prescriptions: true,
          reports: true,
        },
      })

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      // Check if user has access to this appointment
      let hasAccess: boolean = false

      if (req.user.role === 'ADMIN') {
        hasAccess = true
      } else if (req.user.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({
          where: { userId: req.user.id },
        })
        hasAccess = !!(patient && appointment.patient.id === patient.id)
      } else if (req.user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({
          where: { userId: req.user.id },
        })
        hasAccess = !!(doctor && appointment.doctor.id === doctor.id)
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' })
      }

      res.json({ appointment })
    } catch (error) {
      console.error('Error fetching appointment:', error)
      res.status(500).json({ error: 'Failed to fetch appointment' })
    }
  }
)

// Validate appointment availability
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

// Create appointment
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

// Doctor accepts appointment request
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

// Doctor rejects appointment request
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

// Doctor marks appointment as completed
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

// Doctor marks appointment as no-show
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

// Update appointment
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

// Cancel appointment
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
