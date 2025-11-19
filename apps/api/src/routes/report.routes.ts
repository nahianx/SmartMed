import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest } from '../types/auth'
import { uploadBufferToS3, getObjectStreamFromS3 } from '../services/s3_service'
import { createReportActivity } from '../services/activity_service'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
})

// Helper to sanitize file names for S3 keys
function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_')
}

router.post(
  '/',
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const file = req.file
      const { patientId, doctorId, appointmentId, notes } = req.body

      if (!file) {
        return res.status(400).json({ error: 'File is required' })
      }

      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Only PDF files are allowed' })
      }

      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required' })
      }

      const patient = await prisma.patient.findUnique({ where: { id: patientId } })
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' })
      }

      let doctor = null
      if (doctorId) {
        doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
        if (!doctor) {
          return res.status(404).json({ error: 'Doctor not found' })
        }
      }

      let appointment = null
      if (appointmentId) {
        appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } })
        if (!appointment) {
          return res.status(404).json({ error: 'Appointment not found' })
        }
      }

      const safeName = sanitizeFilename(file.originalname || 'report.pdf')
      const key = path.posix.join('reports', patientId, safeName)

      await uploadBufferToS3(key, file.buffer, file.mimetype)

      const report = await prisma.report.create({
        data: {
          patientId,
          doctorId: doctorId || null,
          appointmentId: appointmentId || null,
          fileKey: key,
          fileName: file.originalname || safeName,
          fileSize: file.size,
          mimeType: file.mimetype,
          notes: notes || null,
        },
      })

      // Create a corresponding Activity so the new report appears in the timeline
      await createReportActivity({ reportId: report.id })

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

    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) return res.status(404).json({ error: 'Report not found' })

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

router.get('/:id/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const disposition = String(req.query.disposition || 'inline')

    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) return res.status(404).json({ error: 'Report not found' })

    const { stream, contentType } = await getObjectStreamFromS3(report.fileKey)

    res.setHeader('Content-Type', contentType || report.mimeType)
    res.setHeader(
      'Content-Disposition',
      `${disposition === 'attachment' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(
        report.fileName,
      )}"`,
    )

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
})

export default router
