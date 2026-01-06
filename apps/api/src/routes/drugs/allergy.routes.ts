/**
 * Patient Allergy Routes
 * 
 * Handles patient allergy management and drug-allergy conflict checking.
 */

import { Router, Response } from 'express'
import { validateSchema } from '../../middleware/validation'
import { authenticate } from '../../middleware/authenticate'
import { requireRole } from '../../middleware/auth'
import { UserRole } from '@smartmed/types'
import { prisma, AuditAction } from '@smartmed/database'
import { drugService } from '../../services/drug.service'
import { AuthenticatedRequest } from '../../types/auth'
import {
  allergyCheckBodySchema,
  createAllergySchema,
  updateAllergySchema,
  allergyIdParamSchema,
  patientIdParamSchema,
} from '../../schemas/drug.schemas'
import { logAuditEvent } from '../../utils/audit'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * POST /api/drugs/allergies/check
 * Check for allergy conflicts with prescribed drugs
 */
router.post(
  '/check',
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
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
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
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
  '/:id',
  requireRole([UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]),
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
  '/:id',
  requireRole([UserRole.DOCTOR, UserRole.ADMIN]),
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

export default router
