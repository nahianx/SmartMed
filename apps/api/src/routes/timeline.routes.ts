import { Router, Response } from 'express'
import { prisma, ActivityType, AppointmentStatus } from '@smartmed/database'
import { UserRole } from '@smartmed/types'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { getOrCreateDoctor } from '../services/doctor.service'
import { getOrCreatePatient } from '../services/patient.service'

const router = Router()
router.use(requireAuth)

function mapActivityTypeToClient(
  type: string
): 'appointment' | 'prescription' | 'report' {
  switch (type) {
    case ActivityType.APPOINTMENT:
      return 'appointment'
    case ActivityType.PRESCRIPTION:
      return 'prescription'
    case ActivityType.REPORT:
    default:
      return 'report'
  }
}

function mapStatusToClient(
  status: string | null
): 'completed' | 'cancelled' | 'no-show' | null {
  if (!status) return null
  switch (status) {
    case AppointmentStatus.COMPLETED:
      return 'completed'
    case AppointmentStatus.CANCELLED:
      return 'cancelled'
    case AppointmentStatus.NO_SHOW:
      return 'no-show'
    default:
      return null
  }
}

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, types, statuses, search, limit } = req.query

    const take = Math.min(parseInt(String(limit || '50'), 10) || 50, 100)

    const where: any = {}

    // Role-based scoping: derive patient or doctor scope from user
    if (req.user?.role === UserRole.PATIENT) {
      const patient = await getOrCreatePatient(req.user.id)
      where.patientId = patient.id
    } else if (req.user?.role === UserRole.DOCTOR) {
      const doctor = await getOrCreateDoctor(req.user.id)
      where.doctorId = doctor.id
    } else {
      return res
        .status(403)
        .json({ error: 'Timeline is only available for patients and doctors' })
    }

    if (from) {
      const fromDate = new Date(String(from))
      if (!isNaN(fromDate.getTime())) {
        where.occurredAt = { ...(where.occurredAt || {}), gte: fromDate }
      }
    }

    if (to) {
      const toDate = new Date(String(to))
      if (!isNaN(toDate.getTime())) {
        where.occurredAt = { ...(where.occurredAt || {}), lte: toDate }
      }
    }

    if (types) {
      const typesArray = String(types)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      if (typesArray.length > 0) {
        const mappedTypes: ActivityType[] = []
        if (typesArray.includes('appointment'))
          mappedTypes.push(ActivityType.APPOINTMENT)
        if (typesArray.includes('prescription'))
          mappedTypes.push(ActivityType.PRESCRIPTION)
        if (typesArray.includes('report')) mappedTypes.push(ActivityType.REPORT)
        if (mappedTypes.length > 0) {
          where.type = { in: mappedTypes }
        }
      }
    }

    if (statuses) {
      const statusesArray = String(statuses)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)

      if (statusesArray.length > 0) {
        const mappedStatuses: AppointmentStatus[] = []
        if (statusesArray.includes('completed'))
          mappedStatuses.push(AppointmentStatus.COMPLETED)
        if (statusesArray.includes('cancelled'))
          mappedStatuses.push(AppointmentStatus.CANCELLED)
        if (statusesArray.includes('no-show'))
          mappedStatuses.push(AppointmentStatus.NO_SHOW)
        if (mappedStatuses.length > 0) {
          where.status = { in: mappedStatuses }
        }
      }
    }

    if (search) {
      const text = String(search).toLowerCase()
      // Note: SQLite doesn't support mode: 'insensitive', LIKE is case-insensitive by default
      where.OR = [
        { title: { contains: text } },
        { subtitle: { contains: text } },
        { notes: { contains: text } },
      ]
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: {
        occurredAt: 'desc',
      },
      take,
      include: {
        appointment: {
          include: {
            doctor: true,
          },
        },
        prescription: true,
        report: true,
        doctor: true,
      },
    })

    const mapped = activities.map((activity) => {
      const type = mapActivityTypeToClient(activity.type)
      const status = mapStatusToClient(activity.status ?? null)

      const doctor = activity.doctor ?? activity.appointment?.doctor ?? null

      // Parse tags from JSON value
      let tags: string[] = []
      if (activity.tags) {
        if (typeof activity.tags === 'string') {
          try {
            const parsed = JSON.parse(activity.tags)
            if (Array.isArray(parsed)) tags = parsed as string[]
          } catch {
            tags = []
          }
        } else if (Array.isArray(activity.tags)) {
          tags = activity.tags as string[]
        }
      }

      // Parse medications from JSON string
      let medications: any[] = []
      if (activity.prescription?.medications) {
        try {
          medications =
            typeof activity.prescription.medications === 'string'
              ? JSON.parse(activity.prescription.medications)
              : Array.isArray(activity.prescription.medications)
                ? (activity.prescription.medications as any[])
                : []
        } catch {
          medications = []
        }
      }

      return {
        // For appointments, use appointmentId; for other types, use activity.id
        id: type === 'appointment' ? activity.appointmentId : activity.id,
        type,
        date: activity.occurredAt,
        title: activity.title,
        subtitle: activity.subtitle ?? '',
        tags,
        status,
        doctorName: doctor
          ? `Dr. ${doctor.firstName} ${doctor.lastName}`
          : undefined,
        specialty: doctor?.specialization,
        clinic: undefined,
        medications: medications.map((m: any) => ({
          name: m.name,
          dose: m.dosage ?? m.dose,
          frequency: m.frequency,
          duration: m.duration,
        })),
        warnings: undefined,
        fileName: activity.report?.fileName,
        fileSize: activity.report?.fileSize
          ? `${activity.report.fileSize} bytes`
          : undefined,
        reportId: activity.report?.id,
        notes: activity.notes ?? undefined,
        vitals: activity.vitals ?? undefined,
        linkedReports: [],
        linkedPrescriptions: [],
      }
    })

    res.json({ items: mapped })
  } catch (error) {
    console.error('Error fetching timeline', error)
    res.status(500).json({ error: 'Failed to fetch activity timeline' })
  }
})

export default router
