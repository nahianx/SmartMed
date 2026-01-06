import { Router, Response } from 'express'
import { PrescriptionController } from '../controllers/prescription.controller'
import { validateSchema } from '../middleware/validation'
import {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  prescriptionIdSchema,
  prescriptionQuerySchema,
} from '../schemas/prescription.schemas'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/roleCheck'
import { UserRole, prisma } from '@smartmed/database'
import { pdfService } from '../services/pdf.service'
import { AuthenticatedRequest } from '../types/auth'
import { rateLimiter } from '../middleware/rateLimiter'

const router = Router()

router.use(authenticate)

router.post(
  '/',
  requireRole(UserRole.DOCTOR),
  validateSchema({ body: createPrescriptionSchema }),
  PrescriptionController.createPrescription
)

router.patch(
  '/:id',
  requireRole(UserRole.DOCTOR),
  validateSchema({
    params: prescriptionIdSchema,
    body: updatePrescriptionSchema,
  }),
  PrescriptionController.updatePrescription
)

router.get(
  '/:id',
  validateSchema({ params: prescriptionIdSchema }),
  PrescriptionController.getPrescriptionById
)

router.get(
  '/patient/:patientId',
  validateSchema({ query: prescriptionQuerySchema }),
  PrescriptionController.getPrescriptionsByPatient
)

router.get(
  '/doctor/:doctorId',
  validateSchema({ query: prescriptionQuerySchema }),
  PrescriptionController.getPrescriptionsByDoctor
)

/**
 * GET /api/prescriptions/:id/download/pdf
 * Download prescription as PDF (authenticated users)
 */
router.get(
  '/:id/download/pdf',
  rateLimiter(10, 60 * 1000), // 10 downloads per minute
  validateSchema({ params: prescriptionIdSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const format = (req.query.format as 'A4' | 'Letter') || 'A4'
      const orientation = (req.query.orientation as 'portrait' | 'landscape') || 'portrait'

      // Check if user has access to this prescription
      const prescription = await prisma.prescription.findUnique({
        where: { id },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          patient: { select: { userId: true } },
          doctor: { select: { userId: true } },
        },
      })

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' })
      }

      // Only allow access to prescription owner (patient or doctor) or admin
      const userId = req.user?.id
      const userRole = req.user?.role

      const isPatient = prescription.patient.userId === userId
      const isDoctor = prescription.doctor.userId === userId
      const isAdmin = userRole === 'ADMIN'

      if (!isPatient && !isDoctor && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Get client IP for audit
      const clientIp = 
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        undefined

      // Generate PDF
      const { buffer, filename } = await pdfService.generatePrescriptionPdf(id, {
        format,
        orientation,
        includeQRCode: true,
        userId,
        clientIp,
      })

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', buffer.length)

      return res.send(buffer)
    } catch (error) {
      console.error('Error generating prescription PDF:', error)
      return res.status(500).json({ error: 'Failed to generate PDF' })
    }
  }
)

export default router
