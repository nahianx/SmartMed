/**
 * Appointment Query Routes
 * 
 * Handles listing, searching, and retrieving appointments.
 */

import { Router, Response } from 'express'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest } from '../../types/auth'
import { validateSchema } from '../../middleware/validation'
import { requireAuth } from '../../middleware/auth'
import {
  appointmentIdSchema,
  appointmentQuerySchema,
} from '../../schemas/appointment.schemas'
import { appointmentSearchSchema } from '../../schemas/search.schemas'
import { searchAppointments } from '../../services/appointment.service'
import { logSearchOperation } from '../../utils/audit'

const router = Router()

/**
 * GET /api/appointments/search
 * Advanced appointment search with filters and RBAC
 */
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

/**
 * GET /api/appointments
 * Get all appointments for authenticated user
 */
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

/**
 * GET /api/appointments/:id
 * Get appointment by ID
 */
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

export default router
