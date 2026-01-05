import { Request, Response, NextFunction } from 'express'
import { prisma, UserRole, PermissionAction } from '@smartmed/database'

// Cache for role permissions to avoid repeated DB queries
interface PermissionCache {
  permissions: Map<string, boolean>
  timestamp: number
}

const permissionCache = new Map<UserRole, PermissionCache>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Check if a permission string is in cache for a given role
 */
function getCachedPermission(role: UserRole, permissionName: string): boolean | null {
  const roleCache = permissionCache.get(role)
  if (!roleCache) return null
  
  // Check if cache is expired
  if (Date.now() - roleCache.timestamp > CACHE_TTL) {
    permissionCache.delete(role)
    return null
  }
  
  if (roleCache.permissions.has(permissionName)) {
    return roleCache.permissions.get(permissionName)!
  }
  
  return null
}

/**
 * Set a permission in the cache
 */
function setCachedPermission(role: UserRole, permissionName: string, hasPermission: boolean): void {
  let roleCache = permissionCache.get(role)
  
  if (!roleCache) {
    roleCache = {
      permissions: new Map(),
      timestamp: Date.now()
    }
    permissionCache.set(role, roleCache)
  }
  
  roleCache.permissions.set(permissionName, hasPermission)
}

/**
 * Clear the permission cache for a specific role or all roles
 */
export function clearPermissionCache(role?: UserRole): void {
  if (role) {
    permissionCache.delete(role)
  } else {
    permissionCache.clear()
  }
}

/**
 * Check if a role has a specific permission
 */
export async function hasPermission(role: UserRole, permissionName: string): Promise<boolean> {
  // Check cache first
  const cached = getCachedPermission(role, permissionName)
  if (cached !== null) {
    return cached
  }
  
  // Query database
  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      role,
      permission: {
        name: permissionName
      }
    }
  })
  
  const hasPermission = !!rolePermission
  setCachedPermission(role, permissionName, hasPermission)
  
  return hasPermission
}

/**
 * Check if a role has permission for a resource and action combination
 */
export async function hasResourcePermission(
  role: UserRole,
  resource: string,
  action: PermissionAction
): Promise<boolean> {
  const permissionName = `${resource}:${action.toLowerCase()}`
  
  // First check for specific permission
  if (await hasPermission(role, permissionName)) {
    return true
  }
  
  // Check for MANAGE permission on the resource (implies all other permissions)
  if (action !== PermissionAction.MANAGE) {
    const managePermission = `${resource}:manage`
    if (await hasPermission(role, managePermission)) {
      return true
    }
  }
  
  return false
}

/**
 * Middleware to require a specific permission
 * Usage: requirePermission('appointments:create')
 */
export function requirePermission(permissionName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }
    
    try {
      const permitted = await hasPermission(user.role as UserRole, permissionName)
      
      if (!permitted) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `You do not have permission to perform this action`,
          requiredPermission: permissionName
        })
      }
      
      next()
    } catch (error) {
      console.error('[Permission Check Error]', error)
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to verify permissions'
      })
    }
  }
}

/**
 * Middleware to require permission for a resource and action
 * Usage: requireResourcePermission('appointments', PermissionAction.CREATE)
 */
export function requireResourcePermission(resource: string, action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }
    
    try {
      const permitted = await hasResourcePermission(user.role as UserRole, resource, action)
      
      if (!permitted) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `You do not have permission to ${action.toLowerCase()} ${resource}`,
          requiredResource: resource,
          requiredAction: action
        })
      }
      
      next()
    } catch (error) {
      console.error('[Permission Check Error]', error)
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to verify permissions'
      })
    }
  }
}

/**
 * Middleware to require any of the specified permissions
 * Usage: requireAnyPermission(['appointments:create', 'appointments:manage'])
 */
export function requireAnyPermission(permissionNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }
    
    try {
      for (const permissionName of permissionNames) {
        if (await hasPermission(user.role as UserRole, permissionName)) {
          return next()
        }
      }
      
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You do not have permission to perform this action',
        requiredPermissions: permissionNames,
        note: 'At least one of the listed permissions is required'
      })
    } catch (error) {
      console.error('[Permission Check Error]', error)
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to verify permissions'
      })
    }
  }
}

/**
 * Middleware to require all of the specified permissions
 * Usage: requireAllPermissions(['users:read', 'audit:read'])
 */
export function requireAllPermissions(permissionNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    }
    
    try {
      const missingPermissions: string[] = []
      
      for (const permissionName of permissionNames) {
        if (!(await hasPermission(user.role as UserRole, permissionName))) {
          missingPermissions.push(permissionName)
        }
      }
      
      if (missingPermissions.length > 0) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You do not have all required permissions to perform this action',
          missingPermissions
        })
      }
      
      next()
    } catch (error) {
      console.error('[Permission Check Error]', error)
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to verify permissions'
      })
    }
  }
}
