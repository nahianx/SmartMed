/**
 * Public Prescription Routes
 * 
 * These routes allow public access to prescriptions via secure tokens.
 * No authentication required - security is provided by the token itself.
 */

import { Router, Request, Response } from 'express'
import { prescriptionTokenService } from '../services/prescriptionToken.service'
import { rateLimiter } from '../middleware/rateLimiter'

const router = Router()

/**
 * GET /api/public/prescriptions/:token
 * 
 * View a prescription using a secure access token.
 * No authentication required - the token provides access control.
 */
router.get(
  '/prescriptions/:token',
  rateLimiter(10, 60 * 1000), // 10 requests per minute to prevent brute force
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params

      if (!token || token.length < 20) {
        return res.status(400).json({
          error: 'Invalid token format',
        })
      }

      // Get client IP for audit logging
      const clientIp = 
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        undefined

      // Validate token and get prescription
      const result = await prescriptionTokenService.validateAndConsume(
        token,
        clientIp
      )

      if (!result.valid) {
        const statusCode = result.errorCode === 'INVALID_TOKEN' ? 404 : 410 // 410 Gone for expired
        return res.status(statusCode).json({
          error: result.error,
          code: result.errorCode,
        })
      }

      // Format prescription for display
      const prescription = result.prescription!
      
      return res.json({
        success: true,
        prescription: {
          id: prescription.id,
          createdAt: prescription.createdAt,
          diagnosis: prescription.diagnosis,
          notes: prescription.notes,
          patient: {
            name: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
            dateOfBirth: prescription.patient.dateOfBirth,
          },
          doctor: {
            name: `Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
            specialization: prescription.doctor.specialization,
            licenseNumber: prescription.doctor.licenseNumber,
          },
          medications: prescription.prescriptionMedications.map((med) => ({
            name: med.medicineName,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            drug: med.drug ? {
              rxcui: med.drug.rxcui,
              genericName: med.drug.genericName,
              dosageForm: med.drug.dosageForm,
            } : null,
          })),
        },
        // Include metadata about the token access
        accessInfo: {
          message: 'This prescription was accessed via a secure link.',
          disclaimer: 'This prescription is for informational purposes. Present the original or verified copy to your pharmacy.',
        },
      })
    } catch (error) {
      console.error('Error accessing prescription via token:', error)
      return res.status(500).json({
        error: 'Failed to retrieve prescription',
      })
    }
  }
)

/**
 * GET /api/public/prescriptions/:token/print
 * 
 * Get a print-optimized version of the prescription.
 * Returns HTML or data formatted for printing.
 */
router.get(
  '/prescriptions/:token/print',
  rateLimiter(5, 60 * 1000),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params

      if (!token || token.length < 20) {
        return res.status(400).json({
          error: 'Invalid token format',
        })
      }

      const clientIp = 
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        undefined

      const result = await prescriptionTokenService.validateAndConsume(
        token,
        clientIp
      )

      if (!result.valid) {
        const statusCode = result.errorCode === 'INVALID_TOKEN' ? 404 : 410
        return res.status(statusCode).json({
          error: result.error,
          code: result.errorCode,
        })
      }

      const prescription = result.prescription!
      
      // Return data optimized for print view
      return res.json({
        success: true,
        printData: {
          header: {
            title: 'Medical Prescription',
            generatedAt: new Date().toISOString(),
          },
          patient: {
            name: `${prescription.patient.firstName} ${prescription.patient.lastName}`,
            dateOfBirth: prescription.patient.dateOfBirth,
          },
          prescriber: {
            name: `Dr. ${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
            specialization: prescription.doctor.specialization,
            licenseNumber: prescription.doctor.licenseNumber,
          },
          prescription: {
            id: prescription.id,
            date: prescription.createdAt,
            diagnosis: prescription.diagnosis,
            notes: prescription.notes,
          },
          medications: prescription.prescriptionMedications.map((med, index) => ({
            number: index + 1,
            name: med.medicineName,
            genericName: med.drug?.genericName || null,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions || 'Take as directed',
          })),
          footer: {
            disclaimer: 'This is a computer-generated prescription. Verify authenticity before dispensing.',
            validFor: '30 days from date of issue unless otherwise specified.',
          },
        },
      })
    } catch (error) {
      console.error('Error accessing prescription print view:', error)
      return res.status(500).json({
        error: 'Failed to retrieve prescription for printing',
      })
    }
  }
)

export default router
