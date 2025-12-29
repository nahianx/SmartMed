import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma, AuditAction } from '@smartmed/database'
import { UserRole } from '@smartmed/types'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { rateLimiter } from '../middleware/rateLimiter'
import { uploadBufferToS3, getObjectStreamFromS3 } from '../services/s3_service'
import { createReportActivity } from '../services/activity_service'
import { MAX_UPLOAD_SIZE_BYTES } from '../config/upload'
import { logAuditEvent } from '../utils/audit'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
})
router.use(requireAuth)

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])
const MIME_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_')
}

function getSafeOriginalName(name?: string) {
  if (!name) return 'report'
  return path.basename(name)
}

function isMissingFileError(error: unknown) {
  const err = error as NodeJS.ErrnoException
  return err?.code === 'ENOENT'
}

router.post(
  '/',
  rateLimiter(10, 15 * 60 * 1000),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const file = req.file
      const { patientId, doctorId, appointmentId, notes } = req.body

      if (!file) {
        return res.status(400).json({ error: 'File is required' })
      }

      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required' })
      }

      if (
        !req.user ||
        ![UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN].includes(req.user.role)
      ) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const patient = await prisma.patient.findUnique({ where: { id: patientId } })
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' })
      }

      const { fileTypeFromBuffer } = await import('file-type')
      const detected = await fileTypeFromBuffer(file.buffer)
      if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
        return res
          .status(400)
          .json({ error: 'Only PDF, JPG, or PNG files are allowed' })
      }

      const extension = MIME_EXTENSION[detected.mime]
      if (!extension) {
        return res.status(400).json({ error: 'Unsupported file type' })
      }

      let appointment = null
      if (appointmentId) {
        appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { id: true, patientId: true, doctorId: true },
        })
        if (!appointment) {
          return res.status(404).json({ error: 'Appointment not found' })
        }
        if (appointment.patientId !== patientId) {
          return res
            .status(403)
            .json({ error: 'Appointment is not associated with the patient' })
        }
      }

      const originalName = getSafeOriginalName(file.originalname)
      const reportId = randomUUID()
      const key = path.posix.join('reports', patientId, `${reportId}.${extension}`)

      let doctorIdToUse: string | null = null

      if (req.user.role === UserRole.PATIENT) {
        const currentPatient = await prisma.patient.findFirst({ where: { userId: req.user.id } })
        if (!currentPatient || currentPatient.id !== patientId) {
          return res.status(403).json({ error: 'You can only upload reports for your own profile' })
        }
        if (appointment) {
          doctorIdToUse = appointment.doctorId
        }
        if (doctorId) {
          const doctorRecord = await prisma.doctor.findUnique({ where: { id: doctorId } })
          if (!doctorRecord) {
            return res.status(404).json({ error: 'Doctor not found' })
          }
          doctorIdToUse = doctorRecord.id
          if (appointment && appointment.doctorId !== doctorIdToUse) {
            return res
              .status(403)
              .json({ error: 'Appointment is not associated with the specified doctor' })
          }
        }
      } else if (req.user.role === UserRole.DOCTOR) {
        const currentDoctor = await prisma.doctor.findFirst({ where: { userId: req.user.id } })
        if (!currentDoctor) {
          return res.status(404).json({ error: 'Doctor profile not found' })
        }
        if (doctorId && doctorId !== currentDoctor.id) {
          return res.status(403).json({ error: 'You can only attach reports as yourself' })
        }
        doctorIdToUse = currentDoctor.id
        if (appointment && appointment.doctorId !== currentDoctor.id) {
          return res
            .status(403)
            .json({ error: 'Appointment is not associated with your profile' })
        }
        if (!appointment) {
          const hasRelationship = await prisma.appointment.findFirst({
            where: { patientId, doctorId: currentDoctor.id },
            select: { id: true },
          })
          if (!hasRelationship) {
            return res
              .status(403)
              .json({ error: 'You are not authorized to upload for this patient' })
          }
        }
      } else if (req.user.role === UserRole.ADMIN) {
        if (appointment) {
          doctorIdToUse = appointment.doctorId
        }
        if (doctorId) {
          const doctorRecord = await prisma.doctor.findUnique({ where: { id: doctorId } })
          if (!doctorRecord) {
            return res.status(404).json({ error: 'Doctor not found' })
          }
          doctorIdToUse = doctorRecord.id
          if (appointment && appointment.doctorId !== doctorIdToUse) {
            return res
              .status(403)
              .json({ error: 'Appointment is not associated with the specified doctor' })
          }
        }
      }

      await uploadBufferToS3(key, file.buffer, detected.mime)

      const report = await prisma.report.create({
        data: {
          id: reportId,
          patientId,
          doctorId: doctorIdToUse,
          appointmentId: appointment?.id || null,
          fileKey: key,
          fileName: originalName,
          fileSize: file.size,
          mimeType: detected.mime,
          notes: notes || null,
        },
      })

      // Create a corresponding Activity so the new report appears in the timeline
      await createReportActivity({ reportId: report.id })
      await logAuditEvent({
        userId: req.user.id,
        userRole: req.user.role,
        action: AuditAction.REPORT_UPLOAD,
        resourceType: 'Report',
        resourceId: report.id,
        metadata: {
          patientId: report.patientId,
          doctorId: report.doctorId,
          appointmentId: report.appointmentId,
        },
        request: req,
      })

      res.status(201).json({
        id: report.id,
        patientId: report.patientId,
        doctorId: report.doctorId,
        appointmentId: report.appointmentId,
        fileName: report.fileName,
        fileSize: report.fileSize,
        mimeType: report.mimeType,
        uploadedAt: report.uploadedAt,
        notes: report.notes,
      })
    } catch (error) {
      console.error('Error uploading report', error)
      res.status(500).json({ error: 'Failed to upload report' })
    }
  },
)

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    if (
      !req.user ||
      ![UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN].includes(req.user.role)
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: { appointment: true },
    })
    if (!report) return res.status(404).json({ error: 'Report not found' })

    // Authorization: patients can only see their own reports, doctors only theirs; admins allowed
    if (req.user?.role === UserRole.PATIENT) {
      const currentPatient = await prisma.patient.findFirst({ where: { userId: req.user.id } })
      if (!currentPatient || report.patientId !== currentPatient.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    } else if (req.user?.role === UserRole.DOCTOR) {
      const currentDoctor = await prisma.doctor.findFirst({ where: { userId: req.user.id } })
      if (
        !currentDoctor ||
        (report.doctorId && report.doctorId !== currentDoctor.id) ||
        (!report.doctorId && report.appointment?.doctorId !== currentDoctor.id)
      ) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    res.json({
      id: report.id,
      patientId: report.patientId,
      doctorId: report.doctorId,
      appointmentId: report.appointmentId,
      fileName: report.fileName,
      fileSize: report.fileSize,
      mimeType: report.mimeType,
      uploadedAt: report.uploadedAt,
      notes: report.notes,
    })
  } catch (error) {
    console.error('Error fetching report', error)
    res.status(500).json({ error: 'Failed to fetch report' })
  }
})

router.get(
  '/:id/download',
  rateLimiter(60, 15 * 60 * 1000),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const disposition =
        req.query.disposition === 'attachment' ? 'attachment' : 'inline'

      if (
        !req.user ||
        ![UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN].includes(req.user.role)
      ) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const report = await prisma.report.findUnique({
        where: { id },
        include: { appointment: true },
      })
      if (!report) return res.status(404).json({ error: 'Report not found' })

      // Authorization: patients can only download their reports, doctors only theirs; admins allowed
      if (req.user?.role === UserRole.PATIENT) {
        const currentPatient = await prisma.patient.findFirst({
          where: { userId: req.user.id },
        })
        if (!currentPatient || report.patientId !== currentPatient.id) {
          return res.status(403).json({ error: 'Forbidden' })
        }
      } else if (req.user?.role === UserRole.DOCTOR) {
        const currentDoctor = await prisma.doctor.findFirst({
          where: { userId: req.user.id },
        })
        if (
          !currentDoctor ||
          (report.doctorId && report.doctorId !== currentDoctor.id) ||
          (!report.doctorId && report.appointment?.doctorId !== currentDoctor.id)
        ) {
          return res.status(403).json({ error: 'Forbidden' })
        }
      }

      let stream
      let contentType
      try {
        const result = await getObjectStreamFromS3(report.fileKey)
        stream = result.stream
        contentType = result.contentType
      } catch (error) {
        if (isMissingFileError(error)) {
          return res.status(404).json({ error: 'Report file not found' })
        }
        throw error
      }

      const headerFileName = sanitizeFilename(report.fileName || 'report')

      res.setHeader('Content-Type', contentType || report.mimeType)
      res.setHeader('Cache-Control', 'private, no-store')
      res.setHeader('Pragma', 'no-cache')
      res.setHeader(
        'Content-Disposition',
        `${disposition}; filename="${encodeURIComponent(headerFileName)}"`,
      )

      await logAuditEvent({
        userId: req.user?.id,
        userRole: req.user?.role,
        action: AuditAction.REPORT_VIEW,
        resourceType: 'Report',
        resourceId: report.id,
        metadata: { patientId: report.patientId },
        request: req,
      })

      stream.on('error', (err) => {
        console.error('Error streaming report from S3', err)
        if (!res.headersSent) {
          res.status(500).end()
        } else {
          res.end()
        }
      })

      stream.pipe(res)
    } catch (error) {
      console.error('Error downloading report', error)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download report' })
      }
    }
  },
)

export default router
