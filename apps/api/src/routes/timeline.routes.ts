import { Router, Response } from 'express'
import { prisma, ActivityType, AppointmentStatus } from '@smartmed/database'
import { AuthenticatedRequest } from '../types/auth'

const router = Router()

function mapActivityTypeToClient(type: ActivityType): 'appointment' | 'prescription' | 'report' {
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

function mapStatusToClient(status: AppointmentStatus | null): 'completed' | 'cancelled' | 'no-show' | null {
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
    if (req.user) {
      if (req.user.role === 'PATIENT') {
        const patient = await prisma.patient.findFirst({ where: { userId: req.user.id } })
        if (patient) {
          where.patientId = patient.id
        }
      } else if (req.user.role === 'DOCTOR') {
        const doctor = await prisma.doctor.findFirst({ where: { userId: req.user.id } })
        if (doctor) {
          where.doctorId = doctor.id
        }
      }
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
        if (typesArray.includes('appointment')) mappedTypes.push(ActivityType.APPOINTMENT)
        if (typesArray.includes('prescription')) mappedTypes.push(ActivityType.PRESCRIPTION)
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
        if (statusesArray.includes('completed')) mappedStatuses.push(AppointmentStatus.COMPLETED)
        if (statusesArray.includes('cancelled')) mappedStatuses.push(AppointmentStatus.CANCELLED)
        if (statusesArray.includes('no-show')) mappedStatuses.push(AppointmentStatus.NO_SHOW)
        if (mappedStatuses.length > 0) {
          where.status = { in: mappedStatuses }
        }
      }
    }

    if (search) {
      const text = String(search).toLowerCase()
      where.OR = [
        { title: { contains: text, mode: 'insensitive' } },
        { subtitle: { contains: text, mode: 'insensitive' } },
        { notes: { contains: text, mode: 'insensitive' } },
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

      return {
        id: activity.id,
        type,
        date: activity.occurredAt,
        title: activity.title,
        subtitle: activity.subtitle ?? '',
        tags: activity.tags,
        status,
        doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : undefined,
        specialty: doctor?.specialization,
        clinic: undefined,
        medications: activity.prescription
          ? (activity.prescription.medications as any[]).map((m) => ({
              name: m.name,
              dose: m.dosage ?? m.dose,
              frequency: m.frequency,
              duration: m.duration,
            }))
          : undefined,
        warnings: undefined,
        fileName: activity.report?.fileName,
        fileSize: activity.report?.fileSize ? `${activity.report.fileSize} bytes` : undefined,
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
