/**
 * Appointment Routes Index
 * 
 * Aggregates all appointment sub-routers and exports the combined router.
 * 
 * Route Structure:
 * - GET    /api/appointments/search     - Advanced search with RBAC
 * - GET    /api/appointments            - List appointments for user
 * - GET    /api/appointments/:id        - Get appointment by ID
 * - POST   /api/appointments/validate   - Validate appointment slot
 * - POST   /api/appointments            - Create appointment
 * - PATCH  /api/appointments/:id/accept - Doctor accepts appointment
 * - PATCH  /api/appointments/:id/reject - Doctor rejects appointment
 * - PATCH  /api/appointments/:id/complete - Mark as completed
 * - PATCH  /api/appointments/:id/no-show  - Mark as no-show
 * - PUT    /api/appointments/:id        - Update appointment details
 * - DELETE /api/appointments/:id        - Cancel appointment
 * - GET    /api/appointments/:id/reschedule/available-slots - Get available slots
 * - POST   /api/appointments/:id/reschedule - Reschedule appointment
 * - GET    /api/appointments/:id/reschedule/history - Get reschedule history
 */

import { Router } from 'express'
import queryRoutes from './query.routes'
import bookingRoutes from './booking.routes'
import managementRoutes from './management.routes'
import rescheduleRoutes from './reschedule.routes'

const router = Router()

// Mount query routes (search, list, get by ID) - order matters for path matching
// Search route must come before :id route to avoid /search being interpreted as an ID
router.use('/', queryRoutes)

// Mount booking routes (validate, create)
router.use('/', bookingRoutes)

// Mount management routes (accept, reject, complete, no-show, update, cancel)
router.use('/', managementRoutes)

// Mount reschedule routes (available-slots, reschedule, history)
router.use('/', rescheduleRoutes)

export default router

// Also export sub-routers for testing
export { queryRoutes, bookingRoutes, managementRoutes, rescheduleRoutes }
