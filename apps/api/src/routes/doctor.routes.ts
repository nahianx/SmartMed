import { Router, Request, Response } from 'express'
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { UserRole } from '@smartmed/types'
import {
  getDoctorProfileByUserId,
  updateDoctorSpecializations,
  upsertClinicForDoctor,
  getAvailability,
  setAvailability,
  removeAvailabilitySlot,
  searchDoctors,
} from '../services/doctor.service'
import {
  availabilityUpdateSchema,
  clinicUpdateSchema,
  specializationsUpdateSchema,
  validate,
} from '../services/validation.service'
import { prisma } from '@smartmed/database'

const router = Router()

// Public search endpoint used by patients to find doctors
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '')
    const doctors = await searchDoctors(q)
    res.json({ doctors })
  } catch (error) {
    res.status(500).json({ error: 'Failed to search doctors' })
  }
})

// Public list of specializations (for dropdowns/search)
router.get('/specializations/list', async (_req: Request, res: Response) => {
  try {
    const specializations = await prisma.specialization.findMany({
      orderBy: { name: 'asc' },
    })
    res.json({ specializations })
  } catch (error) {
    res.status(500).json({ error: 'Failed to load specializations' })
  }
})

// Doctor-specific profile
router.get(
  '/profile',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId =
        (typeof req.query.userId === 'string' ? req.query.userId : undefined) ||
        req.user?.id

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' })
      }

      const doctor = await getDoctorProfileByUserId(userId)
      res.json({ doctor })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to load doctor profile' })
    }
  },
)

router.put(
  '/specialization',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = validate(specializationsUpdateSchema, req.body)
      const doctor = await updateDoctorSpecializations(
        req.user!.id,
        body.specializations,
      )
      res.json({ message: 'Specializations updated', doctor })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to update specializations' })
    }
  },
)

router.put(
  '/clinic',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = validate(clinicUpdateSchema, req.body)
      const clinic = await upsertClinicForDoctor(req.user!.id, body)
      res.json({ message: 'Clinic updated', clinic })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to update clinic' })
    }
  },
)

router.get(
  '/availability',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const slots = await getAvailability(req.user!.id)
      res.json({ slots })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to load availability' })
    }
  },
)

router.put(
  '/availability',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = validate(availabilityUpdateSchema, req.body)
      const slots = await setAvailability(req.user!.id, body.slots as any)
      res.json({ message: 'Availability updated', slots })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to update availability' })
    }
  },
)

router.delete(
  '/availability/:slotId',
  requireAuth,
  requireRole(UserRole.DOCTOR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { slotId } = req.params
      await removeAvailabilitySlot(req.user!.id, slotId)
      res.json({ message: 'Slot removed' })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to remove slot' })
    }
  },
)

export default router
