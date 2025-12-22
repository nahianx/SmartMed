import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@smartmed/database'
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth'
import { UserRole } from '@smartmed/types'
import { validateSchema } from '../middleware/validation'
import {
  addWalkIn,
  callNextPatient,
  checkInAppointment,
  completeConsultation,
  getPatientActiveQueues,
  getQueueState,
  updateQueuePosition,
  updateQueueStatus,
} from '../services/queue.service'

const router = Router()

const walkInSchema = z.object({
  doctorId: z.string().uuid(),
  patientId: z.string().uuid(),
  priority: z.number().int().min(1).max(2).optional(),
})

const checkInSchema = z.object({
  appointmentId: z.string().uuid(),
})

const statusSchema = z.object({
  status: z.enum(['CANCELLED', 'NO_SHOW']),
})

const positionSchema = z.object({
  newPosition: z.number().int().min(1),
})

router.post(
  '/walk-in',
  requireAuth,
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
  validateSchema({ body: walkInSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await addWalkIn(req.body, req.user!)
      res.status(201).json({ success: true, entry })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

router.post(
  '/check-in',
  requireAuth,
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
  validateSchema({ body: checkInSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await checkInAppointment(req.body, req.user!)
      res.status(201).json({ success: true, entry })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

router.get(
  '/doctor/:doctorId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { doctorId } = req.params
      const state = await getQueueState(doctorId)
      res.json({ success: true, ...state })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

router.get(
  '/patient/:patientId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patientId } = req.params

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (req.user.role === UserRole.PATIENT) {
        const patient = await prisma.patient.findUnique({
          where: { userId: req.user.id },
        })
        if (!patient || patient.id !== patientId) {
          return res.status(403).json({ error: 'Unauthorized' })
        }
      }

      const activeQueues = await getPatientActiveQueues(patientId)
      res.json({ success: true, activeQueues })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

router.patch(
  '/:queueId/status',
  requireAuth,
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
  validateSchema({ body: statusSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await updateQueueStatus(
        req.params.queueId,
        req.body.status,
        req.user!
      )
      res.json({ success: true, entry })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

router.patch(
  '/:queueId/position',
  requireAuth,
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
  validateSchema({ body: positionSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await updateQueuePosition(
        req.params.queueId,
        req.body.newPosition,
        req.user!
      )
      res.json({ success: true, entry })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

router.post(
  '/doctor/:doctorId/call',
  requireAuth,
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await callNextPatient(req.params.doctorId, req.user!)
      res.json({ success: true, entry })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

router.post(
  '/:queueId/complete',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await completeConsultation(
        req.params.queueId,
        req.body?.notes,
        req.user!
      )
      res.json({ success: true, entry })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

router.delete(
  '/:queueId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await updateQueueStatus(
        req.params.queueId,
        'CANCELLED',
        req.user!
      )
      res.json({ success: true, entry })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
)

export default router
