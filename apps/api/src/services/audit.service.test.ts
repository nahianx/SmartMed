import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock Prisma
const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn(),
  },
}

jest.mock('@smartmed/database', () => ({
  prisma: mockPrisma,
  AuditAction: {
    CREATE: 'CREATE',
    READ: 'READ',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    PERMISSION_CHANGE: 'PERMISSION_CHANGE',
    EXPORT: 'EXPORT',
    DOWNLOAD: 'DOWNLOAD',
    UPLOAD: 'UPLOAD',
    SHARE: 'SHARE',
    MFA_ENABLED: 'MFA_ENABLED',
    MFA_DISABLED: 'MFA_DISABLED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  },
}))

import { AuditService, AuditLogEntry } from './audit.service'

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('log', () => {
    it('creates an audit log entry with all fields', async () => {
      const entry: AuditLogEntry = {
        userId: 'user-123',
        userRole: 'DOCTOR',
        action: 'READ' as const,
        resourceType: 'patient',
        resourceId: 'patient-456',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        metadata: { reason: 'consultation' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
      }

      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1', ...entry })

      await AuditService.log(entry)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          userRole: 'DOCTOR',
          action: 'READ',
          resourceType: 'patient',
          resourceId: 'patient-456',
          timestamp: entry.timestamp,
          metadata: { reason: 'consultation' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: true,
          errorMessage: undefined,
          retentionDate: expect.any(Date),
        },
      })
    })

    it('uses default timestamp when not provided', async () => {
      const entry: AuditLogEntry = {
        action: 'LOGIN' as const,
        resourceType: 'auth',
        resourceId: 'user-123',
      }

      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

      await AuditService.log(entry)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timestamp: expect.any(Date),
          metadata: {},
          success: true,
        }),
      })
    })

    it('logs failed action with error message', async () => {
      const entry: AuditLogEntry = {
        userId: 'user-123',
        action: 'LOGIN_FAILED' as const,
        resourceType: 'auth',
        resourceId: 'user-123',
        success: false,
        errorMessage: 'Invalid credentials',
      }

      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' })

      await AuditService.log(entry)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          errorMessage: 'Invalid credentials',
        }),
      })
    })

    it('does not throw when logging fails', async () => {
      const entry: AuditLogEntry = {
        action: 'READ' as const,
        resourceType: 'patient',
        resourceId: 'patient-123',
      }

      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'))

      // Should not throw
      await expect(AuditService.log(entry)).resolves.not.toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('getLogsForUser', () => {
    it('returns audit logs for a specific user with defaults', async () => {
      const logs = [
        { id: 'log-1', userId: 'user-123', action: 'LOGIN', timestamp: new Date() },
        { id: 'log-2', userId: 'user-123', action: 'READ', timestamp: new Date() },
      ]

      mockPrisma.auditLog.findMany.mockResolvedValue(logs)
      mockPrisma.auditLog.count.mockResolvedValue(2)

      const result = await AuditService.getLogsForUser('user-123')

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0,
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      })
      expect(result.logs).toEqual(logs)
      expect(result.total).toBe(2)
    })

    it('applies date filters', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)

      await AuditService.getLogsForUser('user-123', { startDate, endDate })

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-123',
            timestamp: { gte: startDate, lte: endDate },
          },
        })
      )
    })

    it('filters by action types', async () => {
      const actions = ['LOGIN', 'LOGOUT'] as const

      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)

      await AuditService.getLogsForUser('user-123', { actions: actions as any })

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-123',
            action: { in: actions },
          },
        })
      )
    })

    it('supports pagination', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(100)

      await AuditService.getLogsForUser('user-123', { limit: 20, offset: 40 })

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        })
      )
    })
  })

  describe('getLogsForResource', () => {
    it('returns audit logs for a specific resource', async () => {
      const logs = [
        { id: 'log-1', resourceType: 'patient', resourceId: 'patient-123', action: 'READ' },
        { id: 'log-2', resourceType: 'patient', resourceId: 'patient-123', action: 'UPDATE' },
      ]

      mockPrisma.auditLog.findMany.mockResolvedValue(logs)
      mockPrisma.auditLog.count.mockResolvedValue(2)

      const result = await AuditService.getLogsForResource('patient', 'patient-123')

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { resourceType: 'patient', resourceId: 'patient-123' },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0,
        include: {
          user: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
      })
      expect(result.logs).toEqual(logs)
      expect(result.total).toBe(2)
    })

    it('supports pagination for resource logs', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(50)

      await AuditService.getLogsForResource('appointment', 'appt-123', { limit: 10, offset: 20 })

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      )
    })
  })

  describe('getAllLogs', () => {
    it('returns all audit logs with filters', async () => {
      const logs = [
        { id: 'log-1', action: 'LOGIN' },
        { id: 'log-2', action: 'CREATE' },
      ]

      mockPrisma.auditLog.findMany.mockResolvedValue(logs)
      mockPrisma.auditLog.count.mockResolvedValue(2)

      const result = await AuditService.getAllLogs({
        limit: 100,
        offset: 0,
      })

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalled()
      expect(result.logs).toEqual(logs)
      expect(result.total).toBe(2)
    })
  })

  describe('getSecurityLogs', () => {
    it('returns only security-related logs', async () => {
      const securityLogs = [
        { id: 'log-1', action: 'FAILED_LOGIN' },
        { id: 'log-2', action: 'SUSPICIOUS_ACTIVITY' },
      ]

      mockPrisma.auditLog.findMany.mockResolvedValue(securityLogs)
      mockPrisma.auditLog.count.mockResolvedValue(2)

      const result = await AuditService.getSecurityLogs()

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: {
              in: expect.arrayContaining([
                'FAILED_LOGIN',
                'UNAUTHORIZED_ACCESS_ATTEMPT',
                'SUSPICIOUS_ACTIVITY',
                'MFA_VERIFICATION_FAILED',
              ]),
            },
          }),
        })
      )
      expect(result.logs).toEqual(securityLogs)
    })
  })

  describe('cleanupExpiredLogs', () => {
    it('deletes logs past retention date', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {})
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 150 })

      const result = await AuditService.cleanupExpiredLogs()

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          retentionDate: {
            lt: expect.any(Date),
          },
        },
      })
      expect(result).toBe(150)
    })
  })

  describe('getStatistics', () => {
    it('returns audit statistics', async () => {
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(1000)  // totalLogs
        .mockResolvedValueOnce(50)    // failedLogins
        .mockResolvedValueOnce(10)    // unauthorizedAttempts
      mockPrisma.auditLog.groupBy.mockResolvedValue([
        { action: 'LOGIN', _count: 500 },
        { action: 'READ', _count: 300 },
        { action: 'UPDATE', _count: 200 },
      ])

      const result = await AuditService.getStatistics()

      expect(result).toHaveProperty('totalLogs', 1000)
      expect(result).toHaveProperty('topActions')
      expect(result).toHaveProperty('securityMetrics')
      expect(result.securityMetrics).toHaveProperty('failedLogins')
      expect(result.securityMetrics).toHaveProperty('unauthorizedAttempts')
    })
  })
})
