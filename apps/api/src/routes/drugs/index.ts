/**
 * Drug Routes Index
 * 
 * Aggregates all drug-related sub-routers and exports the combined router.
 * 
 * Route Structure:
 * - GET    /api/drugs/search            - Search drugs by name
 * - GET    /api/drugs/health            - Check RxNav API health
 * - GET    /api/drugs/:rxcui            - Get drug by RxCUI
 * - GET    /api/drugs/:rxcui/synonyms   - Get drug synonyms
 * - GET    /api/drugs/:rxcui/classes    - Get drug classes
 * 
 * Interactions:
 * - POST   /api/drugs/interactions/check           - Check drug interactions
 * - GET    /api/drugs/prescriptions/:id/interactions - Check prescription interactions
 * - POST   /api/drugs/interactions/override        - Override interaction warning
 * 
 * Allergies:
 * - POST   /api/drugs/allergies/check                    - Check allergy conflicts
 * - GET    /api/drugs/patients/:patientId/allergies      - Get patient allergies
 * - POST   /api/drugs/patients/:patientId/allergies      - Add patient allergy
 * - PATCH  /api/drugs/allergies/:id                      - Update allergy
 * - DELETE /api/drugs/allergies/:id                      - Deactivate allergy
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import searchRoutes from './search.routes'
import interactionRoutes from './interaction.routes'
import allergyRoutes from './allergy.routes'

const router = Router()

// All drug routes require authentication
router.use(authenticate)

// Mount interaction routes first (more specific paths)
router.use('/interactions', interactionRoutes)

// Mount allergy routes 
router.use('/allergies', allergyRoutes)

// Mount search routes last (includes catch-all :rxcui pattern)
router.use('/', searchRoutes)

export default router

// Also export sub-routers for testing
export { searchRoutes, interactionRoutes, allergyRoutes }
