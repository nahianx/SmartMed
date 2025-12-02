import { Router, Response } from 'express'
import { prisma } from '@smartmed/database'
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { UserRole } from '@smartmed/types'
import {
  addPreferredDoctor,
  getPatientProfileByUserId,
  getPreferredDoctors,
  removePreferredDoctor,
} from '../services/patient.service'

const router = Router()

// List patients (simple paginated list, mainly for admin tools)
router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const patients = await prisma.patient.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ patients })
  } catch (error) {
    console.error('Error fetching patients', error)
    res.status(500).json({ error: 'Failed to fetch patients' })
  }
})

// Get current patient for authenticated PATIENT user
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients have a /me resource' })
    }

    const patient = await prisma.patient.findFirst({ where: { userId: req.user.id } })

    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found for current user' })
    }

    res.json({ patient })
  } catch (error) {
    console.error('Error fetching current patient', error)
    res.status(500).json({ error: 'Failed to fetch current patient' })
  }
})

// Get patient by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const patient = await prisma.patient.findUnique({ where: { id } })
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    res.json({ patient })
  } catch (error) {
    console.error('Error fetching patient', error)
    res.status(500).json({ error: 'Failed to fetch patient' })
  }
})

// Profile management routes
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
