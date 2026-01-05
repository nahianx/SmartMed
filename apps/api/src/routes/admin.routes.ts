import { Router } from 'express'
import { z } from 'zod'
import { AdminController } from '../controllers/admin.controller'
import { PermissionController } from '../controllers/permission.controller'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/roleCheck'
import { UserRole, PermissionAction } from '@smartmed/database'
import { validateBody } from '../middleware/validation'

const router = Router()

const updateRoleSchema = z.object({
  newRole: z.enum([
    UserRole.ADMIN,
    UserRole.DOCTOR,
    UserRole.PATIENT,
    UserRole.NURSE,
  ]),
})

const createPermissionSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  resource: z.string().min(1).max(50),
  action: z.enum([
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.MANAGE,
    PermissionAction.EXECUTE,
  ]),
})

const grantPermissionSchema = z.object({
  permissionId: z.string().uuid(),
})

const bulkPermissionSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1),
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

// =================================
// Permission Management Routes
// =================================

// Permission CRUD
router.get('/permissions', (req, res, next) =>
  PermissionController.getAllPermissions(req, res).catch(next)
)

router.get('/permissions/resources', (req, res, next) =>
  PermissionController.getResources(req, res).catch(next)
)

router.get('/permissions/:id', (req, res, next) =>
  PermissionController.getPermission(req, res).catch(next)
)

router.post(
  '/permissions',
  validateBody(createPermissionSchema),
  (req, res, next) => PermissionController.createPermission(req, res).catch(next)
)

router.put(
  '/permissions/:id',
  validateBody(createPermissionSchema.partial()),
  (req, res, next) => PermissionController.updatePermission(req, res).catch(next)
)

router.delete('/permissions/:id', (req, res, next) =>
  PermissionController.deletePermission(req, res).catch(next)
)

// Role permission mappings
router.get('/roles/permissions', (req, res, next) =>
  PermissionController.getAllRolePermissions(req, res).catch(next)
)

router.get('/roles/:role/permissions', (req, res, next) =>
  PermissionController.getRolePermissions(req, res).catch(next)
)

router.post(
  '/roles/:role/permissions',
  validateBody(grantPermissionSchema),
  (req, res, next) => PermissionController.grantPermission(req, res).catch(next)
)

router.delete('/roles/:role/permissions/:permissionId', (req, res, next) =>
  PermissionController.revokePermission(req, res).catch(next)
)

// Bulk operations
router.post(
  '/roles/:role/permissions/bulk',
  validateBody(bulkPermissionSchema),
  (req, res, next) => PermissionController.bulkGrantPermissions(req, res).catch(next)
)

router.delete(
  '/roles/:role/permissions/bulk',
  validateBody(bulkPermissionSchema),
  (req, res, next) => PermissionController.bulkRevokePermissions(req, res).catch(next)
)

// Clone permissions between roles
router.post('/roles/:sourceRole/clone/:targetRole', (req, res, next) =>
  PermissionController.cloneRolePermissions(req, res).catch(next)
)

export default router
