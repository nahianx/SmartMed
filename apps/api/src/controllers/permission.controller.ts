import { Request, Response } from 'express'
import { PermissionService } from '../services/permission.service'
import { UserRole, PermissionAction } from '@smartmed/database'
import { AuditService } from '../services/audit.service'

export class PermissionController {
  /**
   * GET /api/admin/permissions
   * Get all permissions
   */
  static async getAllPermissions(req: Request, res: Response) {
    try {
      const permissions = await PermissionService.getAllPermissions()
      return res.json({ permissions })
    } catch (error) {
      console.error('[PermissionController] Error fetching permissions:', error)
      return res.status(500).json({ error: 'Failed to fetch permissions' })
    }
  }

  /**
   * GET /api/admin/permissions/:id
   * Get a specific permission
   */
  static async getPermission(req: Request, res: Response) {
    try {
      const { id } = req.params
      const permission = await PermissionService.getPermissionById(id)
      
      if (!permission) {
        return res.status(404).json({ error: 'Permission not found' })
      }
      
      return res.json({ permission })
    } catch (error) {
      console.error('[PermissionController] Error fetching permission:', error)
      return res.status(500).json({ error: 'Failed to fetch permission' })
    }
  }

  /**
   * POST /api/admin/permissions
   * Create a new permission
   */
  static async createPermission(req: Request, res: Response) {
    try {
      const { name, description, resource, action } = req.body
      const user = (req as any).user
      
      if (!name || !resource || !action) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, resource, action' 
        })
      }
      
      // Validate action enum
      if (!Object.values(PermissionAction).includes(action)) {
        return res.status(400).json({ 
          error: `Invalid action. Must be one of: ${Object.values(PermissionAction).join(', ')}` 
        })
      }
      
      const permission = await PermissionService.createPermission({
        name,
        description,
        resource,
        action: action as PermissionAction
      })
      
      // Audit log
      await AuditService.log({
        userId: user?.id,
        userRole: user?.role,
        action: 'PERMISSION_CREATED' as any,
        resourceType: 'Permission',
        resourceId: permission.id,
        metadata: { name, resource, action },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.status(201).json({ permission })
    } catch (error: any) {
      console.error('[PermissionController] Error creating permission:', error)
      
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Permission with this name already exists' })
      }
      
      return res.status(500).json({ error: 'Failed to create permission' })
    }
  }

  /**
   * PUT /api/admin/permissions/:id
   * Update a permission
   */
  static async updatePermission(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, description, resource, action } = req.body
      const user = (req as any).user
      
      if (action && !Object.values(PermissionAction).includes(action)) {
        return res.status(400).json({ 
          error: `Invalid action. Must be one of: ${Object.values(PermissionAction).join(', ')}` 
        })
      }
      
      const permission = await PermissionService.updatePermission(id, {
        name,
        description,
        resource,
        action: action as PermissionAction
      })
      
      // Audit log
      await AuditService.log({
        userId: user?.id,
        userRole: user?.role,
        action: 'PERMISSION_UPDATED' as any,
        resourceType: 'Permission',
        resourceId: id,
        metadata: { name, resource, action },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json({ permission })
    } catch (error: any) {
      console.error('[PermissionController] Error updating permission:', error)
      
      if (error.message === 'Permission not found') {
        return res.status(404).json({ error: 'Permission not found' })
      }
      
      if (error.message === 'Cannot modify system permissions') {
        return res.status(403).json({ error: 'Cannot modify system permissions' })
      }
      
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Permission with this name already exists' })
      }
      
      return res.status(500).json({ error: 'Failed to update permission' })
    }
  }

  /**
   * DELETE /api/admin/permissions/:id
   * Delete a permission
   */
  static async deletePermission(req: Request, res: Response) {
    try {
      const { id } = req.params
      const user = (req as any).user
      
      await PermissionService.deletePermission(id)
      
      // Audit log
      await AuditService.log({
        userId: user?.id,
        userRole: user?.role,
        action: 'PERMISSION_DELETED' as any,
        resourceType: 'Permission',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json({ success: true })
    } catch (error: any) {
      console.error('[PermissionController] Error deleting permission:', error)
      
      if (error.message === 'Permission not found') {
        return res.status(404).json({ error: 'Permission not found' })
      }
      
      if (error.message === 'Cannot delete system permissions') {
        return res.status(403).json({ error: 'Cannot delete system permissions' })
      }
      
      return res.status(500).json({ error: 'Failed to delete permission' })
    }
  }

  /**
   * GET /api/admin/permissions/resources
   * Get all unique resources
   */
  static async getResources(req: Request, res: Response) {
    try {
      const resources = await PermissionService.getResources()
      return res.json({ resources })
    } catch (error) {
      console.error('[PermissionController] Error fetching resources:', error)
      return res.status(500).json({ error: 'Failed to fetch resources' })
    }
  }

  /**
   * GET /api/admin/roles/:role/permissions
   * Get all permissions for a specific role
   */
  static async getRolePermissions(req: Request, res: Response) {
    try {
      const { role } = req.params
      
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ 
          error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}` 
        })
      }
      
      const permissions = await PermissionService.getRolePermissions(role as UserRole)
      return res.json({ role, permissions })
    } catch (error) {
      console.error('[PermissionController] Error fetching role permissions:', error)
      return res.status(500).json({ error: 'Failed to fetch role permissions' })
    }
  }

  /**
   * GET /api/admin/roles/permissions
   * Get all role-permission mappings
   */
  static async getAllRolePermissions(req: Request, res: Response) {
    try {
      const rolePermissions = await PermissionService.getAllRolePermissions()
      return res.json({ rolePermissions })
    } catch (error) {
      console.error('[PermissionController] Error fetching all role permissions:', error)
      return res.status(500).json({ error: 'Failed to fetch role permissions' })
    }
  }

  /**
   * POST /api/admin/roles/:role/permissions
   * Grant a permission to a role
   */
  static async grantPermission(req: Request, res: Response) {
    try {
      const { role } = req.params
      const { permissionId } = req.body
      const user = (req as any).user
      
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ 
          error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}` 
        })
      }
      
      if (!permissionId) {
        return res.status(400).json({ error: 'permissionId is required' })
      }
      
      const result = await PermissionService.grantPermissionToRole({
        role: role as UserRole,
        permissionId,
        grantedBy: user?.id
      })
      
      // Audit log
      await AuditService.log({
        userId: user?.id,
        userRole: user?.role,
        action: 'PERMISSION_GRANTED' as any,
        resourceType: 'RolePermission',
        resourceId: result.id,
        metadata: { role, permissionId, permissionName: result.permission.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.status(201).json({ 
        success: true,
        rolePermission: result
      })
    } catch (error: any) {
      console.error('[PermissionController] Error granting permission:', error)
      
      if (error.code === 'P2003') {
        return res.status(404).json({ error: 'Permission not found' })
      }
      
      return res.status(500).json({ error: 'Failed to grant permission' })
    }
  }

  /**
   * DELETE /api/admin/roles/:role/permissions/:permissionId
   * Revoke a permission from a role
   */
  static async revokePermission(req: Request, res: Response) {
    try {
      const { role, permissionId } = req.params
      const user = (req as any).user
      
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ 
          error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}` 
        })
      }
      
      const result = await PermissionService.revokePermissionFromRole(
        role as UserRole, 
        permissionId
      )
      
      // Audit log
      await AuditService.log({
        userId: user?.id,
        userRole: user?.role,
        action: 'PERMISSION_REVOKED' as any,
        resourceType: 'RolePermission',
        resourceId: permissionId,
        metadata: { role, permissionId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json(result)
    } catch (error) {
      console.error('[PermissionController] Error revoking permission:', error)
      return res.status(500).json({ error: 'Failed to revoke permission' })
    }
  }

  /**
   * POST /api/admin/roles/:role/permissions/bulk
   * Bulk grant permissions to a role
   */
  static async bulkGrantPermissions(req: Request, res: Response) {
    try {
      const { role } = req.params
      const { permissionIds } = req.body
      const user = (req as any).user
      
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ 
          error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}` 
        })
      }
      
      if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
        return res.status(400).json({ error: 'permissionIds must be a non-empty array' })
      }
      
      const result = await PermissionService.bulkGrantPermissions(
        role as UserRole,
        permissionIds,
        user?.id
      )
      
      // Audit log
      await AuditService.log({
        userId: user?.id,
        userRole: user?.role,
        action: 'PERMISSIONS_BULK_GRANTED' as any,
        resourceType: 'RolePermission',
        resourceId: role,
        metadata: { role, permissionIds, count: result.count },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json(result)
    } catch (error) {
      console.error('[PermissionController] Error bulk granting permissions:', error)
      return res.status(500).json({ error: 'Failed to grant permissions' })
    }
  }

  /**
   * DELETE /api/admin/roles/:role/permissions/bulk
   * Bulk revoke permissions from a role
   */
  static async bulkRevokePermissions(req: Request, res: Response) {
    try {
      const { role } = req.params
      const { permissionIds } = req.body
      const user = (req as any).user
      
      if (!Object.values(UserRole).includes(role as UserRole)) {
        return res.status(400).json({ 
          error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}` 
        })
      }
      
      if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
        return res.status(400).json({ error: 'permissionIds must be a non-empty array' })
      }
      
      const result = await PermissionService.bulkRevokePermissions(
        role as UserRole,
        permissionIds
      )
      
      // Audit log
      await AuditService.log({
        userId: user?.id,
        userRole: user?.role,
        action: 'PERMISSIONS_BULK_REVOKED' as any,
        resourceType: 'RolePermission',
        resourceId: role,
        metadata: { role, permissionIds, deletedCount: result.deletedCount },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json(result)
    } catch (error) {
      console.error('[PermissionController] Error bulk revoking permissions:', error)
      return res.status(500).json({ error: 'Failed to revoke permissions' })
    }
  }

  /**
   * POST /api/admin/roles/:sourceRole/clone/:targetRole
   * Clone permissions from one role to another
   */
  static async cloneRolePermissions(req: Request, res: Response) {
    try {
      const { sourceRole, targetRole } = req.params
      const user = (req as any).user
      
      if (!Object.values(UserRole).includes(sourceRole as UserRole)) {
        return res.status(400).json({ error: `Invalid source role` })
      }
      
      if (!Object.values(UserRole).includes(targetRole as UserRole)) {
        return res.status(400).json({ error: `Invalid target role` })
      }
      
      const result = await PermissionService.cloneRolePermissions(
        sourceRole as UserRole,
        targetRole as UserRole,
        user?.id
      )
      
      // Audit log
      await AuditService.log({
        userId: user?.id,
        userRole: user?.role,
        action: 'PERMISSIONS_CLONED' as any,
        resourceType: 'RolePermission',
        resourceId: targetRole,
        metadata: { sourceRole, targetRole, count: result.count },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json(result)
    } catch (error) {
      console.error('[PermissionController] Error cloning permissions:', error)
      return res.status(500).json({ error: 'Failed to clone permissions' })
    }
  }
}
