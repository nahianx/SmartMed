/**
 * Drug Search Routes
 * 
 * Handles drug search, lookup, and information retrieval.
 */

import { Router, Response } from 'express'
import { validateSchema } from '../../middleware/validation'
import { authenticate } from '../../middleware/authenticate'
import { drugService } from '../../services/drug.service'
import { AuthenticatedRequest } from '../../types/auth'
import {
  drugSearchQuerySchema,
  drugRxcuiParamSchema,
} from '../../schemas/drug.schemas'

const router = Router()

// All drug routes require authentication
router.use(authenticate)

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
