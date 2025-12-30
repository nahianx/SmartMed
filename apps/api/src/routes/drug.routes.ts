/**
 * Drug Routes
 * 
 * REST API endpoints for drug search, lookup, and interaction checking.
 */

import { Router, Response } from 'express'
import { validateSchema } from '../middleware/validation'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/roleCheck'
import { UserRole } from '@smartmed/database'
import { drugService } from '../services/drug.service'
import { AuthenticatedRequest } from '../types/auth'
import {
  drugSearchQuerySchema,
  drugRxcuiParamSchema,
  interactionCheckBodySchema,
  prescriptionInteractionParamSchema,
  allergyCheckBodySchema,
  createAllergySchema,
  updateAllergySchema,
  allergyIdParamSchema,
  patientIdParamSchema,
  interactionOverrideSchema,
} from '../schemas/drug.schemas'
import { prisma, AuditAction } from '@smartmed/database'
import { logAuditEvent } from '../utils/audit'

const router = Router()

// All drug routes require authentication
router.use(authenticate)

// ==========================================
// Drug Search Endpoints
// ==========================================

/**
 * GET /api/drugs/search
 * Search for drugs by name
 * Query params: term (required), limit (optional, default 50)
 */
router.get(
  '/search',
  validateSchema({ query: drugSearchQuerySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { term, limit } = req.query as { term: string; limit: number }

      const results = await drugService.searchDrugs(term, {
        userId: req.user?.id,
        req,
      })

      // Apply limit
      const limitedResults = results.slice(0, limit)

      res.json({
        success: true,
        data: {
          results: limitedResults,
          total: results.length,
          truncated: results.length > limit,
        },
      })
    } catch (error) {
      console.error('[DrugRoutes] Search error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to search drugs',
      })
    }
  }
)

/**
 * GET /api/drugs/:rxcui
 * Get detailed drug information by RxCUI
 */
router.get(
  '/:rxcui',
  validateSchema({ params: drugRxcuiParamSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rxcui } = req.params

      const drug = await drugService.getDrugByRxCUI(rxcui, {
        userId: req.user?.id,
        req,
      })

      if (!drug) {
        return res.status(404).json({
          success: false,
          error: 'Drug not found',
        })
      }

      res.json({
        success: true,
        data: drug,
      })
    } catch (error) {
      console.error('[DrugRoutes] Get drug error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get drug information',
      })
    }
  }
)

/**
 * GET /api/drugs/:rxcui/synonyms
 * Get all synonyms/alternative names for a drug
 */
router.get(
  '/:rxcui/synonyms',
  validateSchema({ params: drugRxcuiParamSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rxcui } = req.params

      const synonyms = await drugService.getDrugSynonyms(rxcui)

      res.json({
        success: true,
        data: {
          rxcui,
          synonyms,
        },
      })
    } catch (error) {
      console.error('[DrugRoutes] Get synonyms error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get drug synonyms',
      })
    }
  }
)

/**
 * GET /api/drugs/:rxcui/classes
 * Get drug classes for a drug
 */
router.get(
  '/:rxcui/classes',
  validateSchema({ params: drugRxcuiParamSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rxcui } = req.params

      const classes = await drugService.getDrugClasses(rxcui)

      res.json({
        success: true,
        data: {
          rxcui,
          classes,
        },
      })
    } catch (error) {
      console.error('[DrugRoutes] Get classes error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get drug classes',
      })
    }
  }
)

// ==========================================
// Interaction Check Endpoints
// ==========================================

/**
 * POST /api/drugs/interactions/check
 * Check drug-drug interactions for a list of RxCUIs
 */
router.post(
  '/interactions/check',
  requireRole(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
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
  requireRole(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
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
 * Override/acknowledge interaction warnings
 */
router.post(
  '/interactions/override',
  requireRole(UserRole.DOCTOR),
  validateSchema({ body: interactionOverrideSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { interactionCheckId, overrideReason, acknowledgedInteractions } = req.body
      const doctorId = req.user!.id

      // Update interaction checks as overridden
      await prisma.interactionCheck.updateMany({
        where: {
          id: { in: acknowledgedInteractions },
        },
        data: {
          wasOverridden: true,
          overrideReason,
          overriddenBy: doctorId,
          overriddenAt: new Date(),
        },
      })

      // Log audit event
      await logAuditEvent({
        userId: doctorId,
        action: AuditAction.INTERACTION_OVERRIDE,
        resourceType: 'InteractionCheck',
        resourceId: interactionCheckId,
        metadata: {
          overrideReason,
          interactionCount: acknowledgedInteractions.length,
        },
        request: req,
      })

      res.json({
        success: true,
        message: 'Interactions acknowledged successfully',
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

// ==========================================
// Allergy Check Endpoints
// ==========================================

/**
 * POST /api/drugs/allergies/check
 * Check for allergy conflicts with prescribed drugs
 */
router.post(
  '/allergies/check',
  requireRole(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validateSchema({ body: allergyCheckBodySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patientId, rxcuis } = req.body

      const conflicts = await drugService.checkAllergyConflicts(patientId, rxcuis, {
        userId: req.user?.id,
        req,
      })

      res.json({
        success: true,
        data: {
          hasConflicts: conflicts.length > 0,
          conflicts,
          checkedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('[DrugRoutes] Allergy check error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to check allergy conflicts',
      })
    }
  }
)

/**
 * GET /api/drugs/patients/:patientId/allergies
 * Get all allergies for a patient
 */
router.get(
  '/patients/:patientId/allergies',
  validateSchema({ params: patientIdParamSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patientId } = req.params

      const allergies = await prisma.patientAllergy.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      })

      res.json({
        success: true,
        data: allergies,
      })
    } catch (error) {
      console.error('[DrugRoutes] Get allergies error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get patient allergies',
      })
    }
  }
)

/**
 * POST /api/drugs/patients/:patientId/allergies
 * Add a new allergy for a patient
 */
router.post(
  '/patients/:patientId/allergies',
  requireRole(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validateSchema({ params: patientIdParamSchema, body: createAllergySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patientId } = req.params
      const allergyData = req.body

      const allergy = await prisma.patientAllergy.create({
        data: {
          patientId,
          ...allergyData,
          verifiedBy: req.user?.role === 'DOCTOR' ? req.user.id : null,
          verifiedAt: req.user?.role === 'DOCTOR' ? new Date() : null,
        },
      })

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        action: AuditAction.ALLERGY_ADDED,
        resourceType: 'PatientAllergy',
        resourceId: allergy.id,
        metadata: {
          patientId,
          allergenName: allergyData.allergenName,
          severity: allergyData.severity,
        },
        request: req,
      })

      res.status(201).json({
        success: true,
        data: allergy,
      })
    } catch (error) {
      console.error('[DrugRoutes] Add allergy error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to add allergy',
      })
    }
  }
)

/**
 * PATCH /api/drugs/allergies/:id
 * Update an existing allergy
 */
router.patch(
  '/allergies/:id',
  requireRole(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN),
  validateSchema({ params: allergyIdParamSchema, body: updateAllergySchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params
      const updateData = req.body

      const allergy = await prisma.patientAllergy.update({
        where: { id },
        data: updateData,
      })

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        action: AuditAction.ALLERGY_UPDATED,
        resourceType: 'PatientAllergy',
        resourceId: id,
        metadata: updateData,
        request: req,
      })

      res.json({
        success: true,
        data: allergy,
      })
    } catch (error) {
      console.error('[DrugRoutes] Update allergy error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update allergy',
      })
    }
  }
)

/**
 * DELETE /api/drugs/allergies/:id
 * Soft delete an allergy (mark as inactive)
 */
router.delete(
  '/allergies/:id',
  requireRole(UserRole.DOCTOR, UserRole.ADMIN),
  validateSchema({ params: allergyIdParamSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params

      await prisma.patientAllergy.update({
        where: { id },
        data: { isActive: false },
      })

      // Log audit event
      await logAuditEvent({
        userId: req.user!.id,
        action: AuditAction.ALLERGY_DELETED,
        resourceType: 'PatientAllergy',
        resourceId: id,
        request: req,
      })

      res.json({
        success: true,
        message: 'Allergy deactivated successfully',
      })
    } catch (error) {
      console.error('[DrugRoutes] Delete allergy error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete allergy',
      })
    }
  }
)

// ==========================================
// Health Check Endpoint
// ==========================================

/**
 * GET /api/drugs/health
 * Check RxNav API health status
 */
router.get('/health', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const health = await drugService.healthCheck()

    res.json({
      success: true,
      data: health,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
    })
  }
})

export default router
