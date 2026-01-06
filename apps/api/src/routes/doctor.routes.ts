import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth'
import { UserRole } from '@smartmed/types'
import {
  getDoctorProfileByUserId,
  updateDoctorSpecializations,
  updateDoctorStatus,
  upsertClinicForDoctor,
  getAvailability,
  setAvailability,
  removeAvailabilitySlot,
  searchDoctors,
  searchDoctorsAdvanced,
  getDoctorAvailabilityByDateRange,
} from '../services/doctor.service'
import { broadcastDoctorStatus } from '../services/queue.service'
import { getDoctorHistory } from '../services/appointment.service'
import {
  availabilityUpdateSchema,
  clinicUpdateSchema,
  specializationsUpdateSchema,
  validate,
} from '../services/validation.service'
import { prisma, DoctorAvailabilityStatus, QueueStatus, AuditAction } from '@smartmed/database'
import { validateSchema } from '../middleware/validation'
import { rateLimiter } from '../middleware/rateLimiter'
import {
  doctorHistorySchema,
  doctorSearchSchema,
} from '../schemas/search.schemas'
import {
  logDoctorHistoryAccess,
  logSearchOperation,
  logAuditEvent,
} from '../utils/audit'

const router = Router()

const doctorStatusSchema = {
  body: z.object({
    status: z.enum([
      DoctorAvailabilityStatus.AVAILABLE,
      DoctorAvailabilityStatus.BUSY,
      DoctorAvailabilityStatus.BREAK,
      DoctorAvailabilityStatus.OFF_DUTY,
    ]),
    isAvailable: z.boolean().optional(),
    currentPatientId: z.string().uuid().optional(),
    currentQueueEntryId: z.string().uuid().optional(),
  }),
}

const doctorIdParamSchema = {
  params: z.object({
    doctorId: z.string().uuid(),
  }),
}

const availabilityQuerySchema = {
  query: z.object({
    startDate: z
      .string()
      .datetime('Invalid startDate format. Use ISO 8601 format'),
    endDate: z
      .string()
      .datetime('Invalid endDate format. Use ISO 8601 format'),
    duration: z.coerce.number().int().min(15).max(480).optional(),
  }),
}

// Public search endpoint used by patients to find doctors
router.get('/search', rateLimiter(60, 60 * 1000), async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '')
    const specialization = req.query.specialization
      ? String(req.query.specialization)
      : undefined
    const location =
      (req.query.location && String(req.query.location)) ||
      (req.query.city && String(req.query.city)) ||
      (req.query.state && String(req.query.state)) ||
      (req.query.address && String(req.query.address)) ||
      undefined
    const doctors = await searchDoctors(q, { specialization, location })
    res.json({ doctors })
  } catch (error) {
    res.status(500).json({ error: 'Failed to search doctors' })
  }
})

// Available doctors list with queue stats
router.get('/available', async (req: Request, res: Response) => {
  try {
    const specialization = req.query.specialization
      ? String(req.query.specialization)
      : undefined

    const where: any = {
      availabilityStatus: DoctorAvailabilityStatus.AVAILABLE,
      isAvailable: true,
    }
    if (specialization) {
      where.specialization = { contains: specialization, mode: 'insensitive' }
    }

    const doctors = await prisma.doctor.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        availabilityStatus: true,
        isAvailable: true,
        averageConsultationTime: true,
      },
      take: 50,
    })

    const queueCounts = await prisma.queueEntry.groupBy({
      by: ['doctorId'],
      where: { status: QueueStatus.WAITING },
      _count: { _all: true },
    })
    const countMap = new Map(
      queueCounts.map((item) => [item.doctorId, item._count._all])
    )

    const payload = doctors.map((doctor) => {
      const waitingCount = countMap.get(doctor.id) || 0
      const estimatedWait = Math.round(
        waitingCount * (doctor.averageConsultationTime || 15)
      )
      return {
        ...doctor,
        queueLength: waitingCount,
        estimatedWaitTime: estimatedWait,
      }
    })

    res.json({ doctors: payload })
  } catch (error) {
    console.error('Error loading available doctors', error)
    res.status(500).json({ error: 'Failed to load available doctors' })
  }
})

// Public availability by date range for patients
router.get(
  '/:doctorId/availability',
  requireAuth,
  requireRole(UserRole.PATIENT),
  validateSchema({ ...doctorIdParamSchema, ...availabilityQuerySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { doctorId } = req.params
      const { startDate, endDate, duration } = req.query as any

      const slots = await getDoctorAvailabilityByDateRange({
        doctorId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        durationMinutes: duration ? Number(duration) : undefined,
      })

      res.json({ slots })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to load availability' })
    }
  }
)

// Public endpoint to get doctor's weekly schedule (for patients to see office hours)
router.get(
  '/:doctorId/schedule',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { doctorId } = req.params

      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true },
      })

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' })
      }

      const schedule = await prisma.doctorAvailability.findMany({
        where: { doctorId, isAvailable: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          hasBreak: true,
          breakStart: true,
          breakEnd: true,
        },
      })

      res.json({ schedule })
    } catch (error: any) {
      res
        .status(error.status || 500)
        .json({ error: error.message || 'Failed to load schedule' })
    }
  }
)

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

router.patch(
  '/:doctorId/status',
  requireAuth,
  requireRole([UserRole.DOCTOR, UserRole.ADMIN]),
  validateSchema(doctorStatusSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { doctorId } = req.params
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (req.user.role === UserRole.DOCTOR) {
        const self = await prisma.doctor.findUnique({
          where: { userId: req.user.id },
        })
        if (!self || self.id !== doctorId) {
          return res.status(403).json({ error: 'Unauthorized' })
        }
      }

      const updated = await updateDoctorStatus(doctorId, req.body.status, {
        isAvailable: req.body.isAvailable,
        currentPatientId: req.body.currentPatientId,
        currentQueueEntryId: req.body.currentQueueEntryId,
      })

      await logAuditEvent({
        userId: req.user.id,
        userRole: req.user.role,
        action: AuditAction.DOCTOR_STATUS_CHANGED,
        resourceType: 'Doctor',
        resourceId: doctorId,
        metadata: { status: req.body.status },
      })

      await broadcastDoctorStatus(doctorId)

      res.json({ success: true, doctorStatus: updated })
    } catch (error: any) {
      res.status(error.status || 500).json({ error: error.message })
    }
  }
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
