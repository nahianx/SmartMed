/**
 * Drug Interaction Routes
 * 
 * Handles drug-drug interaction checking and override management.
 */

import { Router, Response } from 'express'
import { validateSchema } from '../../middleware/validation'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/auth'
import { UserRole } from '@smartmed/types'
import { drugService } from '../../services/drug.service'
import { AuthenticatedRequest } from '../../types/auth'
import {
  interactionCheckBodySchema,
  prescriptionInteractionParamSchema,
  interactionOverrideSchema,
} from '../../schemas/drug.schemas'
import { prisma, AuditAction } from '@smartmed/database'
import { logAuditEvent } from '../../utils/audit'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * POST /api/drugs/interactions/check
 * Check drug-drug interactions for a list of RxCUIs
 */
router.post(
  '/check',
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
  validateSchema({ body: interactionCheckBodySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rxcuis } = req.body

      const result = await drugService.checkInteractions(rxcuis, {
        userId: req.user?.id,
        req,
      })

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('[DrugRoutes] Interaction check error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to check drug interactions',
      })
    }
  }
)

/**
 * GET /api/drugs/prescriptions/:id/interactions
 * Check interactions for an existing prescription
 */
router.get(
  '/prescriptions/:id/interactions',
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
  validateSchema({ params: prescriptionInteractionParamSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params

      // Get prescription with medications
      const prescription = await prisma.prescription.findUnique({
        where: { id },
        include: {
          prescriptionMedications: true,
        },
      })

      if (!prescription) {
        return res.status(404).json({
          success: false,
          error: 'Prescription not found',
        })
      }

      // Extract RxCUIs from medications
      const rxcuis = prescription.prescriptionMedications
        .filter(med => med.drugRxcui)
        .map(med => med.drugRxcui as string)

      if (rxcuis.length < 2) {
        return res.json({
          success: true,
          data: {
            hasInteractions: false,
            interactions: [],
            checkedAt: new Date(),
            drugCount: rxcuis.length,
            message: 'Not enough resolved medications to check interactions',
          },
        })
      }

      const result = await drugService.checkInteractions(rxcuis, {
        userId: req.user?.id,
        prescriptionId: id,
        req,
      })

      res.json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error('[DrugRoutes] Prescription interaction check error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to check prescription interactions',
      })
    }
  }
)

/**
 * POST /api/drugs/interactions/override
 * Override/acknowledge interaction warnings with comprehensive audit trail
 * 
 * Requires:
 * - Clinical justification (overrideReason)
 * - Explicit confirmation of review (confirmedReview: true)
 * - List of interactions being acknowledged
 * 
 * Optional:
 * - Alternative medications considered
 * - Patient informed flag
 * - Detailed interaction acknowledgments with severity
 */
router.post(
  '/override',
  requireRole(UserRole.DOCTOR),
  validateSchema({ body: interactionOverrideSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        interactionCheckId, 
        prescriptionId,
        patientId,
        overrideReason, 
        acknowledgedInteractions,
        interactionDetails,
        confirmedReview,
        alternativesConsidered,
        patientInformed
      } = req.body
      
      const doctorId = req.user!.id
      const overrideTimestamp = new Date()

      // Get the doctor's full info for audit
      const doctor = await prisma.doctor.findUnique({
        where: { userId: doctorId },
        select: { id: true, firstName: true, lastName: true, licenseNumber: true }
      })

      if (!doctor) {
        return res.status(403).json({
          success: false,
          error: 'Doctor profile not found'
        })
      }

      // Verify the interactions exist and get their details for comprehensive logging
      const existingInteractions = await prisma.interactionCheck.findMany({
        where: { id: { in: acknowledgedInteractions } }
      })

      if (existingInteractions.length !== acknowledgedInteractions.length) {
        return res.status(400).json({
          success: false,
          error: 'Some interaction IDs are invalid'
        })
      }

      // Check for HIGH severity interactions and require extra validation
      const highSeverityInteractions = existingInteractions.filter(
        i => i.severity === 'HIGH'
      )

      if (highSeverityInteractions.length > 0 && !overrideReason.includes('HIGH')) {
        // Just a warning in metadata, not blocking
        console.warn(`[DrugRoutes] High severity interaction override by ${doctor.licenseNumber}`)
      }

      // Update interaction checks as overridden with comprehensive data
      await prisma.interactionCheck.updateMany({
        where: {
          id: { in: acknowledgedInteractions },
        },
        data: {
          wasOverridden: true,
          overrideReason,
          overriddenBy: doctorId,
          overriddenAt: overrideTimestamp,
        },
      })

      // Build comprehensive audit metadata
      const auditMetadata = {
        overrideReason,
        interactionCount: acknowledgedInteractions.length,
        highSeverityCount: highSeverityInteractions.length,
        confirmedReview,
        patientInformed,
        alternativesConsidered: alternativesConsidered || null,
        prescriptionId: prescriptionId || null,
        patientId: patientId || null,
        doctorLicense: doctor.licenseNumber,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        interactions: existingInteractions.map(i => ({
          id: i.id,
          severity: i.severity,
          drug1Rxcui: i.drug1Rxcui,
          drug2Rxcui: i.drug2Rxcui
        })),
        interactionDetails: interactionDetails || [],
        timestamp: overrideTimestamp.toISOString()
      }

      // Log comprehensive audit event
      await logAuditEvent({
        userId: doctorId,
        userRole: 'DOCTOR',
        action: AuditAction.INTERACTION_OVERRIDE,
        resourceType: 'InteractionCheck',
        resourceId: interactionCheckId,
        metadata: auditMetadata,
        request: req,
      })

      // If there are HIGH severity interactions, create a special audit entry
      if (highSeverityInteractions.length > 0) {
        await logAuditEvent({
          userId: doctorId,
          userRole: 'DOCTOR',
          action: AuditAction.SUSPICIOUS_ACTIVITY,
          resourceType: 'InteractionCheck',
          resourceId: interactionCheckId,
          metadata: {
            type: 'HIGH_SEVERITY_INTERACTION_OVERRIDE',
            interactionCount: highSeverityInteractions.length,
            doctorLicense: doctor.licenseNumber,
            reason: overrideReason,
            patientId,
            prescriptionId
          },
          request: req,
        })
      }

      res.json({
        success: true,
        message: 'Interactions acknowledged and logged successfully',
        data: {
          overriddenCount: acknowledgedInteractions.length,
          highSeverityCount: highSeverityInteractions.length,
          timestamp: overrideTimestamp,
          auditId: interactionCheckId
        }
      })
    } catch (error) {
      console.error('[DrugRoutes] Override error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to override interactions',
      })
    }
  }
)

export default router
