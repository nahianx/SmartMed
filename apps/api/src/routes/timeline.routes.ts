import { Router, Response } from 'express'
import { prisma, ActivityType, AppointmentStatus } from '@smartmed/database'
import { UserRole } from '@smartmed/types'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { getOrCreateDoctor } from '../services/doctor.service'
import { getOrCreatePatient } from '../services/patient.service'
import { searchActivities, searchActivitiesSimple, getSearchSuggestions } from '../services/activity-search.service'

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
    const { from, to, types, statuses, search, limit, useFullTextSearch } = req.query

    const take = Math.min(parseInt(String(limit || '50'), 10) || 50, 100)

    // Role-based scoping: derive patient or doctor scope from user
    let patientId: string | undefined
    let doctorId: string | undefined

    if (req.user?.role === UserRole.PATIENT) {
      const patient = await getOrCreatePatient(req.user.id)
      patientId = patient.id
    } else if (req.user?.role === UserRole.DOCTOR) {
      const doctor = await getOrCreateDoctor(req.user.id)
      doctorId = doctor.id
    } else {
      return res
        .status(403)
        .json({ error: 'Timeline is only available for patients and doctors' })
    }

    // Parse activity types filter
    let parsedTypes: ActivityType[] | undefined
    if (types) {
      const typesArray = String(types)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      if (typesArray.length > 0) {
        parsedTypes = []
        if (typesArray.includes('appointment'))
          parsedTypes.push(ActivityType.APPOINTMENT)
        if (typesArray.includes('prescription'))
          parsedTypes.push(ActivityType.PRESCRIPTION)
        if (typesArray.includes('report')) parsedTypes.push(ActivityType.REPORT)
      }
    }

    // Parse statuses filter
    let parsedStatuses: AppointmentStatus[] | undefined
    if (statuses) {
      const statusesArray = String(statuses)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)

      if (statusesArray.length > 0) {
        parsedStatuses = []
        if (statusesArray.includes('completed'))
          parsedStatuses.push(AppointmentStatus.COMPLETED)
        if (statusesArray.includes('cancelled'))
          parsedStatuses.push(AppointmentStatus.CANCELLED)
        if (statusesArray.includes('no-show'))
          parsedStatuses.push(AppointmentStatus.NO_SHOW)
      }
    }

    // Parse dates
    const fromDate = from ? new Date(String(from)) : undefined
    const toDate = to ? new Date(String(to)) : undefined

    // Handle search
    if (search && String(search).trim().length > 0) {
      const searchQuery = String(search).trim()
      const useFullText = useFullTextSearch === 'true'

      try {
        if (useFullText) {
          // Use PostgreSQL full-text search with ranking and highlighting
          const searchResults = await searchActivities({
            query: searchQuery,
            patientId,
            doctorId,
            types: parsedTypes,
            statuses: parsedStatuses,
            from: fromDate && !isNaN(fromDate.getTime()) ? fromDate : undefined,
            to: toDate && !isNaN(toDate.getTime()) ? toDate : undefined,
            limit: take,
          })

          const mapped = searchResults.map((activity) => {
            const type = mapActivityTypeToClient(activity.type)
            const status = mapStatusToClient(activity.status ?? null)

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

            return {
              id: type === 'appointment' ? activity.appointmentId : activity.id,
              type,
              date: activity.occurredAt,
              title: activity.title,
              subtitle: activity.subtitle ?? '',
              tags,
              status,
              notes: activity.notes ?? undefined,
              vitals: activity.vitals ?? undefined,
              // Search metadata
              searchRank: activity.rank,
              highlightedTitle: activity.highlightedTitle,
              highlightedSubtitle: activity.highlightedSubtitle,
              highlightedNotes: activity.highlightedNotes,
            }
          })

          return res.json({ items: mapped, searchMode: 'fulltext' })
        }
      } catch (error) {
        console.error('Full-text search failed, falling back to simple search:', error)
        // Fall through to simple search
      }
    }

    // Build standard Prisma query (no search or fallback)
    const where: any = {}
    
    if (patientId) where.patientId = patientId
    if (doctorId) where.doctorId = doctorId

    if (fromDate && !isNaN(fromDate.getTime())) {
      where.occurredAt = { ...(where.occurredAt || {}), gte: fromDate }
    }

    if (toDate && !isNaN(toDate.getTime())) {
      where.occurredAt = { ...(where.occurredAt || {}), lte: toDate }
    }

    if (parsedTypes && parsedTypes.length > 0) {
      where.type = { in: parsedTypes }
    }

    if (parsedStatuses && parsedStatuses.length > 0) {
      where.status = { in: parsedStatuses }
    }

    if (search) {
      const text = String(search).toLowerCase()
      // Simple ILIKE search fallback
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
        mimeType: activity.report?.mimeType,
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

/**
 * GET /timeline/search/suggestions
 * 
 * Returns autocomplete suggestions based on partial search input.
 * Uses prefixes from existing activity titles.
 */
router.get('/search/suggestions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, limit } = req.query
    const prefix = String(q || '').trim()

    if (prefix.length < 2) {
      return res.json({ suggestions: [] })
    }

    // Determine scope based on user role
    let patientId: string | undefined
    let doctorId: string | undefined

    if (req.user?.role === UserRole.PATIENT) {
      const patient = await getOrCreatePatient(req.user.id)
      patientId = patient.id
    } else if (req.user?.role === UserRole.DOCTOR) {
      const doctor = await getOrCreateDoctor(req.user.id)
      doctorId = doctor.id
    } else {
      return res.status(403).json({ error: 'Suggestions only available for patients and doctors' })
    }

    const suggestions = await getSearchSuggestions(prefix, {
      patientId,
      doctorId,
      limit: parseInt(String(limit || '10'), 10),
    })

    res.json({ suggestions })
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    res.status(500).json({ error: 'Failed to get search suggestions' })
  }
})

export default router
