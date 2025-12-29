import { Router, Response } from 'express'
import { prisma } from '@smartmed/database'
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth'
import { UserRole } from '@smartmed/types'
import {
  addPreferredDoctor,
  getPatientProfileByUserId,
  getPreferredDoctors,
  removePreferredDoctor,
} from '../services/patient.service'
import { validateSchema } from '../middleware/validation'
import { patientHistorySchema } from '../schemas/search.schemas'
import { getPatientHistory } from '../services/appointment.service'
import { getOrCreateDoctor } from '../services/doctor.service'
import { logPatientHistoryAccess } from '../utils/audit'

const router = Router()

// Search patients (for admin appointment creation)
router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = String(req.query.q || '')
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phoneNumber: { contains: q } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        dateOfBirth: true,
        gender: true,
      },
      take: 20,
      orderBy: { firstName: 'asc' },
    })
    res.json({ patients })
  } catch (error) {
    console.error('Error searching patients', error)
    res.status(500).json({ error: 'Failed to search patients' })
  }
})

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
      return res
        .status(403)
        .json({ error: 'Only patients have a /me resource' })
    }

    const patient = await prisma.patient.findFirst({
      where: { userId: req.user.id },
    })

    if (!patient) {
      return res
        .status(404)
        .json({ error: 'Patient profile not found for current user' })
    }

    res.json({ patient })
  } catch (error) {
    console.error('Error fetching current patient', error)
    res.status(500).json({ error: 'Failed to fetch current patient' })
  }
})

// Profile management routes - must come BEFORE /:id route
router.get(
  '/profile',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patient = await getPatientProfileByUserId(req.user!.id)
      res.json({ patient })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to load patient profile' })
    }
  }
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
  }
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
  }
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
  }
)

// Patient history with strict RBAC
router.get(
  '/:patientId/history',
  requireAuth,
  validateSchema({ query: patientHistorySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patientId } = req.params
      const filters = req.query as any

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      })
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' })
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Patients can view only themselves
      if (req.user.role === UserRole.PATIENT) {
        const selfPatient = await prisma.patient.findUnique({
          where: { userId: req.user.id },
        })
        if (!selfPatient || selfPatient.id !== patientId) {
          return res
            .status(403)
            .json({ error: 'Unauthorized access to patient history' })
        }
      }

      // Doctors can view only patients they have treated
      if (req.user.role === UserRole.DOCTOR) {
        const doctor = await getOrCreateDoctor(req.user.id)
        const hasAccess = await prisma.appointment.findFirst({
          where: { patientId, doctorId: doctor.id },
        })
        if (!hasAccess) {
          return res
            .status(403)
            .json({ error: 'You have not treated this patient' })
        }
      }

      const history = await getPatientHistory(patientId, filters)

      await logPatientHistoryAccess(
        req.user.id,
        req.user.role,
        patientId,
        req,
        filters
      )

      res.json(history)
    } catch (error) {
      console.error('Error fetching patient history', error)
      res.status(500).json({ error: 'Failed to fetch patient history' })
    }
  }
)

// Get patient by ID - must come AFTER specific routes
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

export default router
