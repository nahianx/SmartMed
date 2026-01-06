import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock the clearPermissionCache function
const mockClearPermissionCache = jest.fn()
jest.mock('../middleware/requirePermission', () => ({
  clearPermissionCache: mockClearPermissionCache,
}))

// Mock Prisma
const mockPrisma = {
  permission: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  rolePermission: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}

jest.mock('@smartmed/database', () => ({
  prisma: mockPrisma,
  UserRole: {
    ADMIN: 'ADMIN',
    DOCTOR: 'DOCTOR',
    PATIENT: 'PATIENT',
    STAFF: 'STAFF',
  },
  PermissionAction: {
    CREATE: 'CREATE',
    READ: 'READ',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    MANAGE: 'MANAGE',
    EXECUTE: 'EXECUTE',
  },
}))

import { PermissionService } from './permission.service'

describe('PermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createPermission', () => {
    it('creates a new permission with all fields', async () => {
      const input = {
        name: 'patients:read',
        description: 'Read patient records',
        resource: 'patients',
        action: 'READ' as const,
        isSystem: true,
      }

      const expectedPermission = {
        id: 'perm-1',
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.permission.create.mockResolvedValue(expectedPermission)

      const result = await PermissionService.createPermission(input)

      expect(mockPrisma.permission.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: input.description,
          resource: input.resource,
          action: input.action,
          isSystem: true,
        },
      })
      expect(result).toEqual(expectedPermission)
    })

    it('defaults isSystem to false when not provided', async () => {
      const input = {
        name: 'reports:read',
        resource: 'reports',
        action: 'READ' as const,
      }

      mockPrisma.permission.create.mockResolvedValue({ id: 'perm-2', ...input, isSystem: false })

      await PermissionService.createPermission(input)

      expect(mockPrisma.permission.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          description: undefined,
          resource: input.resource,
          action: input.action,
          isSystem: false,
        },
      })
    })
  })

  describe('getAllPermissions', () => {
    it('returns all permissions ordered by resource and action', async () => {
      const permissions = [
        { id: 'perm-1', name: 'appointments:create', resource: 'appointments', action: 'CREATE' },
        { id: 'perm-2', name: 'appointments:read', resource: 'appointments', action: 'READ' },
        { id: 'perm-3', name: 'patients:read', resource: 'patients', action: 'READ' },
      ]

      mockPrisma.permission.findMany.mockResolvedValue(permissions)

      const result = await PermissionService.getAllPermissions()

      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      })
      expect(result).toEqual(permissions)
    })
  })

  describe('getPermissionsByResource', () => {
    it('returns permissions for a specific resource', async () => {
      const permissions = [
        { id: 'perm-1', name: 'patients:create', resource: 'patients', action: 'CREATE' },
        { id: 'perm-2', name: 'patients:read', resource: 'patients', action: 'READ' },
      ]

      mockPrisma.permission.findMany.mockResolvedValue(permissions)

      const result = await PermissionService.getPermissionsByResource('patients')

      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        where: { resource: 'patients' },
        orderBy: { action: 'asc' },
      })
      expect(result).toEqual(permissions)
    })
  })

  describe('getPermissionByName', () => {
    it('returns permission by name', async () => {
      const permission = { id: 'perm-1', name: 'patients:read', resource: 'patients', action: 'READ' }

      mockPrisma.permission.findUnique.mockResolvedValue(permission)

      const result = await PermissionService.getPermissionByName('patients:read')

      expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
        where: { name: 'patients:read' },
      })
      expect(result).toEqual(permission)
    })

    it('returns null for non-existent permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)

      const result = await PermissionService.getPermissionByName('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getPermissionById', () => {
    it('returns permission by ID', async () => {
      const permission = { id: 'perm-1', name: 'patients:read', resource: 'patients', action: 'READ' }

      mockPrisma.permission.findUnique.mockResolvedValue(permission)

      const result = await PermissionService.getPermissionById('perm-1')

      expect(mockPrisma.permission.findUnique).toHaveBeenCalledWith({
        where: { id: 'perm-1' },
      })
      expect(result).toEqual(permission)
    })
  })

  describe('updatePermission', () => {
    it('updates a non-system permission', async () => {
      const existingPermission = {
        id: 'perm-1',
        name: 'old-name',
        resource: 'patients',
        action: 'READ',
        isSystem: false,
      }

      const updateData = { name: 'new-name', description: 'Updated description' }

      mockPrisma.permission.findUnique.mockResolvedValue(existingPermission)
      mockPrisma.permission.update.mockResolvedValue({ ...existingPermission, ...updateData })

      const result = await PermissionService.updatePermission('perm-1', updateData)

      expect(mockPrisma.permission.update).toHaveBeenCalledWith({
        where: { id: 'perm-1' },
        data: {
          name: 'new-name',
          description: 'Updated description',
          resource: undefined,
          action: undefined,
        },
      })
      expect(result.name).toBe('new-name')
    })

    it('throws error when permission not found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)

      await expect(PermissionService.updatePermission('non-existent', { name: 'new-name' })).rejects.toThrow(
        'Permission not found'
      )
    })

    it('throws error when trying to modify system permission', async () => {
      const systemPermission = {
        id: 'perm-1',
        name: 'system-perm',
        resource: 'system',
        action: 'MANAGE',
        isSystem: true,
      }

      mockPrisma.permission.findUnique.mockResolvedValue(systemPermission)

      await expect(PermissionService.updatePermission('perm-1', { name: 'new-name' })).rejects.toThrow(
        'Cannot modify system permissions'
      )
    })
  })

  describe('deletePermission', () => {
    it('deletes a non-system permission', async () => {
      const permission = { id: 'perm-1', name: 'deletable', isSystem: false }

      mockPrisma.permission.findUnique.mockResolvedValue(permission)
      mockPrisma.permission.delete.mockResolvedValue(permission)

      const result = await PermissionService.deletePermission('perm-1')

      expect(mockPrisma.permission.delete).toHaveBeenCalledWith({ where: { id: 'perm-1' } })
      expect(mockClearPermissionCache).toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('throws error when permission not found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null)

      await expect(PermissionService.deletePermission('non-existent')).rejects.toThrow('Permission not found')
    })

    it('throws error when trying to delete system permission', async () => {
      const systemPermission = { id: 'perm-1', name: 'system', isSystem: true }

      mockPrisma.permission.findUnique.mockResolvedValue(systemPermission)

      await expect(PermissionService.deletePermission('perm-1')).rejects.toThrow('Cannot delete system permissions')
    })
  })

  describe('grantPermissionToRole', () => {
    it('grants permission to a role', async () => {
      const input = {
        role: 'DOCTOR' as const,
        permissionId: 'perm-1',
        grantedBy: 'admin-user-id',
      }

      const expectedResult = {
        role: 'DOCTOR',
        permissionId: 'perm-1',
        grantedBy: 'admin-user-id',
        permission: { id: 'perm-1', name: 'patients:read' },
      }

      mockPrisma.rolePermission.upsert.mockResolvedValue(expectedResult)

      const result = await PermissionService.grantPermissionToRole(input)

      expect(mockPrisma.rolePermission.upsert).toHaveBeenCalledWith({
        where: {
          role_permissionId: {
            role: 'DOCTOR',
            permissionId: 'perm-1',
          },
        },
        update: {
          grantedBy: 'admin-user-id',
          grantedAt: expect.any(Date),
        },
        create: {
          role: 'DOCTOR',
          permissionId: 'perm-1',
          grantedBy: 'admin-user-id',
        },
        include: {
          permission: true,
        },
      })
      expect(mockClearPermissionCache).toHaveBeenCalledWith('DOCTOR')
      expect(result).toEqual(expectedResult)
    })
  })

  describe('revokePermissionFromRole', () => {
    it('revokes permission from a role', async () => {
      mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 1 })

      const result = await PermissionService.revokePermissionFromRole('DOCTOR', 'perm-1')

      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: {
          role: 'DOCTOR',
          permissionId: 'perm-1',
        },
      })
      expect(mockClearPermissionCache).toHaveBeenCalledWith('DOCTOR')
      expect(result).toEqual({ success: true, deletedCount: 1 })
    })

    it('returns deletedCount 0 when permission was not granted', async () => {
      mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 })

      const result = await PermissionService.revokePermissionFromRole('PATIENT', 'perm-1')

      expect(result).toEqual({ success: true, deletedCount: 0 })
    })
  })

  describe('getRolePermissions', () => {
    it('returns all permissions for a role', async () => {
      const rolePermissions = [
        {
          role: 'DOCTOR',
          permissionId: 'perm-1',
          grantedBy: 'admin',
          grantedAt: new Date('2024-01-01'),
          permission: { id: 'perm-1', name: 'patients:read', resource: 'patients', action: 'READ' },
        },
        {
          role: 'DOCTOR',
          permissionId: 'perm-2',
          grantedBy: 'admin',
          grantedAt: new Date('2024-01-01'),
          permission: { id: 'perm-2', name: 'patients:update', resource: 'patients', action: 'UPDATE' },
        },
      ]

      mockPrisma.rolePermission.findMany.mockResolvedValue(rolePermissions)

      const result = await PermissionService.getRolePermissions('DOCTOR')

      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: 'DOCTOR' },
        include: { permission: true },
        orderBy: { permission: { resource: 'asc' } },
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('grantedBy', 'admin')
      expect(result[0]).toHaveProperty('name', 'patients:read')
    })
  })

  describe('getAllRolePermissions', () => {
    it('returns all role-permission assignments grouped by role', async () => {
      const allRolePermissions = [
        { role: 'ADMIN', permissionId: 'perm-1', permission: { name: 'all:manage' } },
        { role: 'DOCTOR', permissionId: 'perm-2', permission: { name: 'patients:read' } },
        { role: 'DOCTOR', permissionId: 'perm-3', permission: { name: 'patients:update' } },
      ]

      mockPrisma.rolePermission.findMany.mockResolvedValue(allRolePermissions)

      const result = await PermissionService.getAllRolePermissions()

      expect(result).toHaveProperty('ADMIN')
      expect(result).toHaveProperty('DOCTOR')
      expect(result['ADMIN']).toHaveLength(1)
      expect(result['DOCTOR']).toHaveLength(2)
    })
  })

  describe('bulkGrantPermissions', () => {
    it('grants multiple permissions to a role', async () => {
      const role = 'STAFF' as const
      const permissionIds = ['perm-1', 'perm-2', 'perm-3']
      const grantedBy = 'admin-id'

      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}])

      const result = await PermissionService.bulkGrantPermissions(role, permissionIds, grantedBy)

      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(mockClearPermissionCache).toHaveBeenCalledWith('STAFF')
      expect(result).toEqual({ success: true, count: 3 })
    })
  })

  describe('bulkRevokePermissions', () => {
    it('revokes multiple permissions from a role', async () => {
      const role = 'STAFF' as const
      const permissionIds = ['perm-1', 'perm-2']

      mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 2 })

      const result = await PermissionService.bulkRevokePermissions(role, permissionIds)

      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: {
          role: 'STAFF',
          permissionId: { in: permissionIds },
        },
      })
      expect(mockClearPermissionCache).toHaveBeenCalledWith('STAFF')
      expect(result).toEqual({ success: true, deletedCount: 2 })
    })
  })

  describe('cloneRolePermissions', () => {
    it('clones permissions from source role to target role', async () => {
      const sourcePermissions = [{ permissionId: 'perm-1' }, { permissionId: 'perm-2' }]

      mockPrisma.rolePermission.findMany.mockResolvedValue(sourcePermissions)
      mockPrisma.$transaction.mockResolvedValue([{}, {}])

      const result = await PermissionService.cloneRolePermissions('DOCTOR', 'STAFF', 'admin-id')

      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: 'DOCTOR' },
        select: { permissionId: true },
      })
      expect(result).toEqual({ success: true, count: 2 })
    })
  })

  describe('roleHasPermission', () => {
    it('returns true when role has the permission', async () => {
      mockPrisma.rolePermission.findFirst.mockResolvedValue({
        role: 'DOCTOR',
        permissionId: 'perm-1',
      })

      const result = await PermissionService.roleHasPermission('DOCTOR', 'patients:read')

      expect(mockPrisma.rolePermission.findFirst).toHaveBeenCalledWith({
        where: {
          role: 'DOCTOR',
          permission: { name: 'patients:read' },
        },
      })
      expect(result).toBe(true)
    })

    it('returns false when role does not have the permission', async () => {
      mockPrisma.rolePermission.findFirst.mockResolvedValue(null)

      const result = await PermissionService.roleHasPermission('PATIENT', 'admin:manage')

      expect(result).toBe(false)
    })
  })

  describe('getResources', () => {
    it('returns unique resources from all permissions', async () => {
      const permissions = [{ resource: 'appointments' }, { resource: 'patients' }, { resource: 'prescriptions' }]

      mockPrisma.permission.findMany.mockResolvedValue(permissions)

      const result = await PermissionService.getResources()

      expect(mockPrisma.permission.findMany).toHaveBeenCalledWith({
        select: { resource: true },
        distinct: ['resource'],
        orderBy: { resource: 'asc' },
      })
      expect(result).toEqual(['appointments', 'patients', 'prescriptions'])
    })
  })
})
