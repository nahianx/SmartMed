import { prisma, UserRole, PermissionAction } from '@smartmed/database'
import { clearPermissionCache } from '../middleware/requirePermission'

export interface CreatePermissionInput {
  name: string
  description?: string
  resource: string
  action: PermissionAction
  isSystem?: boolean
}

export interface GrantPermissionInput {
  role: UserRole
  permissionId: string
  grantedBy?: string
}

export class PermissionService {
  /**
   * Create a new permission
   */
  static async createPermission(input: CreatePermissionInput) {
    return prisma.permission.create({
      data: {
        name: input.name,
        description: input.description,
        resource: input.resource,
        action: input.action,
        isSystem: input.isSystem ?? false
      }
    })
  }

  /**
   * Get all permissions
   */
  static async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' }
      ]
    })
  }

  /**
   * Get permissions by resource
   */
  static async getPermissionsByResource(resource: string) {
    return prisma.permission.findMany({
      where: { resource },
      orderBy: { action: 'asc' }
    })
  }

  /**
   * Get a permission by name
   */
  static async getPermissionByName(name: string) {
    return prisma.permission.findUnique({
      where: { name }
    })
  }

  /**
   * Get a permission by ID
   */
  static async getPermissionById(id: string) {
    return prisma.permission.findUnique({
      where: { id }
    })
  }

  /**
   * Update a permission (cannot update system permissions)
   */
  static async updatePermission(id: string, data: Partial<CreatePermissionInput>) {
    const permission = await prisma.permission.findUnique({ where: { id } })
    
    if (!permission) {
      throw new Error('Permission not found')
    }
    
    if (permission.isSystem) {
      throw new Error('Cannot modify system permissions')
    }
    
    return prisma.permission.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        resource: data.resource,
        action: data.action
      }
    })
  }

  /**
   * Delete a permission (cannot delete system permissions)
   */
  static async deletePermission(id: string) {
    const permission = await prisma.permission.findUnique({ where: { id } })
    
    if (!permission) {
      throw new Error('Permission not found')
    }
    
    if (permission.isSystem) {
      throw new Error('Cannot delete system permissions')
    }
    
    // Delete permission and all related role assignments
    await prisma.permission.delete({ where: { id } })
    
    // Clear cache for all roles
    clearPermissionCache()
    
    return { success: true }
  }

  /**
   * Grant a permission to a role
   */
  static async grantPermissionToRole(input: GrantPermissionInput) {
    const result = await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: input.role,
          permissionId: input.permissionId
        }
      },
      update: {
        grantedBy: input.grantedBy,
        grantedAt: new Date()
      },
      create: {
        role: input.role,
        permissionId: input.permissionId,
        grantedBy: input.grantedBy
      },
      include: {
        permission: true
      }
    })
    
    // Clear cache for this role
    clearPermissionCache(input.role)
    
    return result
  }

  /**
   * Revoke a permission from a role
   */
  static async revokePermissionFromRole(role: UserRole, permissionId: string) {
    const result = await prisma.rolePermission.deleteMany({
      where: {
        role,
        permissionId
      }
    })
    
    // Clear cache for this role
    clearPermissionCache(role)
    
    return { success: true, deletedCount: result.count }
  }

  /**
   * Get all permissions for a role
   */
  static async getRolePermissions(role: UserRole) {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role },
      include: {
        permission: true
      },
      orderBy: {
        permission: {
          resource: 'asc'
        }
      }
    })
    
    return rolePermissions.map(rp => ({
      ...rp.permission,
      grantedBy: rp.grantedBy,
      grantedAt: rp.grantedAt
    }))
  }

  /**
   * Get all role-permission assignments grouped by role
   */
  static async getAllRolePermissions() {
    const allRolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: true
      },
      orderBy: [
        { role: 'asc' },
        { permission: { resource: 'asc' } }
      ]
    })
    
    // Group by role
    const grouped: Record<string, typeof allRolePermissions> = {}
    
    for (const rp of allRolePermissions) {
      if (!grouped[rp.role]) {
        grouped[rp.role] = []
      }
      grouped[rp.role].push(rp)
    }
    
    return grouped
  }

  /**
   * Bulk grant permissions to a role
   */
  static async bulkGrantPermissions(role: UserRole, permissionIds: string[], grantedBy?: string) {
    const results = await prisma.$transaction(
      permissionIds.map(permissionId =>
        prisma.rolePermission.upsert({
          where: {
            role_permissionId: {
              role,
              permissionId
            }
          },
          update: {
            grantedBy,
            grantedAt: new Date()
          },
          create: {
            role,
            permissionId,
            grantedBy
          }
        })
      )
    )
    
    // Clear cache for this role
    clearPermissionCache(role)
    
    return { success: true, count: results.length }
  }

  /**
   * Bulk revoke permissions from a role
   */
  static async bulkRevokePermissions(role: UserRole, permissionIds: string[]) {
    const result = await prisma.rolePermission.deleteMany({
      where: {
        role,
        permissionId: { in: permissionIds }
      }
    })
    
    // Clear cache for this role
    clearPermissionCache(role)
    
    return { success: true, deletedCount: result.count }
  }

  /**
   * Clone permissions from one role to another
   */
  static async cloneRolePermissions(sourceRole: UserRole, targetRole: UserRole, grantedBy?: string) {
    const sourcePermissions = await prisma.rolePermission.findMany({
      where: { role: sourceRole },
      select: { permissionId: true }
    })
    
    const permissionIds = sourcePermissions.map(p => p.permissionId)
    
    return this.bulkGrantPermissions(targetRole, permissionIds, grantedBy)
  }

  /**
   * Check if a role has a specific permission
   */
  static async roleHasPermission(role: UserRole, permissionName: string): Promise<boolean> {
    const result = await prisma.rolePermission.findFirst({
      where: {
        role,
        permission: {
          name: permissionName
        }
      }
    })
    
    return !!result
  }

  /**
   * Get unique resources from all permissions
   */
  static async getResources() {
    const permissions = await prisma.permission.findMany({
      select: { resource: true },
      distinct: ['resource'],
      orderBy: { resource: 'asc' }
    })
    
    return permissions.map(p => p.resource)
  }
}
