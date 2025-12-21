import { Router, Request, Response } from 'express'
import { prisma, AppointmentStatus, ActivityType } from '@smartmed/database'
import { AuthenticatedRequest } from '../types/auth'
import { validateSchema } from '../middleware/validation'
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentIdSchema,
  appointmentQuerySchema,
} from '../schemas/appointment.schemas'
import { appointmentSearchSchema } from '../schemas/search.schemas'
import { searchAppointments } from '../services/appointment.service'
import { logSearchOperation } from '../utils/audit'

const router = Router()

// Advanced appointment search with filters and RBAC
router.get(
  '/search',
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
        req,
      )

      res.json(result)
    } catch (error) {
      console.error('Error searching appointments:', error)
      res.status(500).json({ error: 'Failed to search appointments' })
    }
  },
)

// Get all appointments for authenticated user
router.get(
  '/',
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

// Create appointment
router.post(
  '/',
  validateSchema({ body: createAppointmentSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { patientId, doctorId, dateTime, duration, reason, notes } =
        req.body

      // Check for conflicting appointments for the doctor
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          doctorId,
          dateTime: new Date(dateTime),
          status: {
            not: AppointmentStatus.CANCELLED,
          },
        },
      })

      if (conflictingAppointment) {
        return res.status(409).json({
          error: 'Doctor already has an appointment at this time',
        })
      }

      // Create the appointment
      const appointment = await prisma.appointment.create({
        data: {
          patientId,
          doctorId,
          dateTime: new Date(dateTime),
          duration,
          reason: reason.trim(),
          notes: notes?.trim(),
          status: AppointmentStatus.SCHEDULED,
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

      // Create corresponding activity
      await prisma.activity.create({
        data: {
          type: ActivityType.APPOINTMENT,
          occurredAt: new Date(dateTime),
          patientId,
          doctorId,
          appointmentId: appointment.id,
          title: `Appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
          subtitle: reason.trim(),
          tags: JSON.stringify([appointment.doctor.specialization]),
          status: AppointmentStatus.SCHEDULED,
          notes,
        },
      })

      res.status(201).json({
        message: 'Appointment created successfully',
        appointment,
      })
    } catch (error) {
      console.error('Error creating appointment:', error)
      res.status(500).json({ error: 'Failed to create appointment' })
    }
  }
)

// Update appointment
router.put(
  '/:id',
  validateSchema({
    params: appointmentIdSchema,
    body: updateAppointmentSchema,
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { id } = req.params
      const { dateTime, duration, reason, notes, status } = req.body

      const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: true,
          doctor: true,
        },
      })

      if (!existingAppointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      // Check authorization
      let hasAccess: boolean = false

      if (req.user.role === 'ADMIN') {
        hasAccess = true
      } else if (req.user.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({
          where: { userId: req.user.id },
        })
        hasAccess = !!(patient && existingAppointment.patientId === patient.id)
      } else if (req.user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({
          where: { userId: req.user.id },
        })
        hasAccess = !!(doctor && existingAppointment.doctorId === doctor.id)
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Check for conflicts if datetime is being changed
      if (
        dateTime &&
        new Date(dateTime).getTime() !== existingAppointment.dateTime.getTime()
      ) {
        const conflictingAppointment = await prisma.appointment.findFirst({
          where: {
            id: { not: id },
            doctorId: existingAppointment.doctorId,
            dateTime: new Date(dateTime),
            status: {
              not: AppointmentStatus.CANCELLED,
            },
          },
        })

        if (conflictingAppointment) {
          return res.status(409).json({
            error: 'Doctor already has an appointment at this time',
          })
        }
      }

      // Update appointment
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          ...(dateTime && { dateTime: new Date(dateTime) }),
          ...(duration && { duration }),
          ...(reason && { reason: reason.trim() }),
          ...(notes !== undefined && { notes: notes?.trim() }),
          ...(status && { status }),
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

      // Update corresponding activity
      await prisma.activity.updateMany({
        where: { appointmentId: id },
        data: {
          ...(dateTime && { occurredAt: new Date(dateTime) }),
          ...(reason && {
            title: `Appointment with Dr. ${existingAppointment.doctor.firstName} ${existingAppointment.doctor.lastName}`,
            subtitle: reason.trim(),
          }),
          ...(status && { status }),
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
          patient: true,
          doctor: true,
        },
      })

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' })
      }

      // Check authorization
      let hasAccess: boolean = false

      if (req.user.role === 'ADMIN') {
        hasAccess = true
      } else if (req.user.role === 'PATIENT') {
        const patient = await prisma.patient.findUnique({
          where: { userId: req.user.id },
        })
        hasAccess = !!(patient && appointment.patientId === patient.id)
      } else if (req.user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findUnique({
          where: { userId: req.user.id },
        })
        hasAccess = !!(doctor && appointment.doctorId === doctor.id)
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Don't allow cancelling past appointments
      if (appointment.dateTime <= new Date()) {
        return res.status(400).json({
          error: 'Cannot cancel past appointments',
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
      })

      // Update corresponding activity
      await prisma.activity.updateMany({
        where: { appointmentId: id },
        data: {
          status: AppointmentStatus.CANCELLED,
          title: `[CANCELLED] Appointment with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
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
