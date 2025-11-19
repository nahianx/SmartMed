import { Router, Response } from 'express'
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { UserRole } from '@smartmed/types'
import {
  addPreferredDoctor,
  getPatientProfileByUserId,
  getPreferredDoctors,
  removePreferredDoctor,
} from '../services/patient.service'

const router = Router()

router.get(
  '/profile',
  requireAuth,
  requireRole(UserRole.PATIENT),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patient = await getPatientProfileByUserId(req.user!.id)
      res.json({ patient })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to load patient profile' })
    }
  },
)

router.get(
  '/preferred-doctors',
  requireAuth,
  requireRole(UserRole.PATIENT),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const preferred = await getPreferredDoctors(req.user!.id)
      res.json({ preferred })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to load preferred doctors' })
    }
  },
)

router.post(
  '/preferred-doctors/:doctorId',
  requireAuth,
  requireRole(UserRole.PATIENT),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { doctorId } = req.params
      await addPreferredDoctor(req.user!.id, doctorId)
      res.status(201).json({ message: 'Preferred doctor added' })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to add preferred doctor' })
    }
  },
)

router.delete(
  '/preferred-doctors/:doctorId',
  requireAuth,
  requireRole(UserRole.PATIENT),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { doctorId } = req.params
      await removePreferredDoctor(req.user!.id, doctorId)
      res.json({ message: 'Preferred doctor removed' })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to remove preferred doctor' })
    }
  },
)

export default router
