import { Router } from 'express'
import { z } from 'zod'
import { AdminController } from '../controllers/admin.controller'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/roleCheck'
import { UserRole } from '@smartmed/database'
import { validateBody } from '../middleware/validation'

const router = Router()

const updateRoleSchema = z.object({
  newRole: z.string(),
})

router.use(authenticate)
router.use(requireRole(UserRole.ADMIN))

router.get('/', (req, res, next) =>
  AdminController.getAllUsers(req, res).catch(next)
)

router.get('/stats', (req, res, next) =>
  AdminController.getDashboardStats(req, res).catch(next)
)

router.get('/:userId', (req, res, next) =>
  AdminController.getUserById(req, res).catch(next)
)

router.patch(
  '/:userId/role',
  validateBody(updateRoleSchema),
  (req, res, next) => AdminController.updateUserRole(req, res).catch(next)
)

router.patch('/:userId/activate', (req, res, next) =>
  AdminController.activateUser(req, res).catch(next)
)

router.patch('/:userId/deactivate', (req, res, next) =>
  AdminController.deactivateUser(req, res).catch(next)
)

router.patch('/:userId/promote', (req, res, next) =>
  AdminController.promoteUserToAdmin(req, res).catch(next)
)

router.patch('/:userId/demote', (req, res, next) =>
  AdminController.demoteUserFromAdmin(req, res).catch(next)
)

export default router
