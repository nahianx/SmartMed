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
  searchDoctorsAdvanced,
} from '../services/doctor.service'
import { getDoctorHistory } from '../services/appointment.service'
import {
  availabilityUpdateSchema,
  clinicUpdateSchema,
  specializationsUpdateSchema,
  validate,
} from '../services/validation.service'
import { prisma } from '@smartmed/database'
import { validateSchema } from '../middleware/validation'
import {
  doctorHistorySchema,
  doctorSearchSchema,
} from '../schemas/search.schemas'
import {
  logDoctorHistoryAccess,
  logSearchOperation,
} from '../utils/audit'

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

// Authenticated advanced search with filters/pagination
router.get(
  '/search/advanced',
  requireAuth,
  validateSchema({ query: doctorSearchSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const filters = req.query as any
      const result = await searchDoctorsAdvanced(filters)
      if (req.user) {
        await logSearchOperation(
          req.user.id,
          req.user.role,
          'DOCTOR_SEARCH',
          filters,
          result.pagination?.totalResults ?? result.doctors?.length ?? 0,
          req,
        )
      }
      res.json(result)
    } catch (error) {
      console.error('Error searching doctors (advanced)', error)
      res.status(500).json({ error: 'Failed to search doctors' })
    }
  },
)

// Doctor history (doctor can view own, admin can view all)
router.get(
  '/:doctorId/history',
  requireAuth,
  validateSchema({ query: doctorHistorySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { doctorId } = req.params
      const filters = req.query as any

      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' })
      }

      if (req.user.role === UserRole.DOCTOR) {
        const self = await prisma.doctor.findUnique({
          where: { userId: req.user.id },
        })
        if (!self || self.id !== doctorId) {
          return res.status(403).json({ error: 'Unauthorized access to doctor history' })
        }
      } else if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ error: 'Unauthorized role' })
      }

      const history = await getDoctorHistory(doctorId, filters)

      await logDoctorHistoryAccess(
        req.user.id,
        req.user.role,
        doctorId,
        req,
        filters,
      )

      res.json(history)
    } catch (error) {
      console.error('Error fetching doctor history', error)
      res.status(500).json({ error: 'Failed to fetch doctor history' })
    }
  },
)

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
