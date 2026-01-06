/**
 * Audit Service
 * Handles logging of security-relevant actions for compliance and monitoring
 */

import { prisma, AuditAction } from '@smartmed/database'

export interface AuditLogEntry {
  userId?: string
  userRole?: string
  action: AuditAction
  resourceType: string
  resourceId: string
  timestamp?: Date
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  success?: boolean
  errorMessage?: string
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Calculate retention date (90 days from now for most logs)
      const retentionDate = new Date()
      retentionDate.setDate(retentionDate.getDate() + 90)

      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          userRole: entry.userRole,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          timestamp: entry.timestamp || new Date(),
          metadata: entry.metadata || {},
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          success: entry.success ?? true,
          errorMessage: entry.errorMessage,
          retentionDate,
        },
      })
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      console.error('[AuditService] Error logging audit entry:', error)
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getLogsForUser(
    userId: string,
    options: {
      limit?: number
      offset?: number
      startDate?: Date
      endDate?: Date
      actions?: AuditAction[]
    } = {}
  ) {
    const { limit = 50, offset = 0, startDate, endDate, actions } = options

    const where: any = { userId }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    if (actions && actions.length > 0) {
      where.action = { in: actions }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total }
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getLogsForResource(
    resourceType: string,
    resourceId: string,
    options: {
      limit?: number
      offset?: number
    } = {}
  ) {
    const { limit = 50, offset = 0 } = options

    const where = { resourceType, resourceId }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total }
  }

  /**
   * Get all audit logs (admin only)
   */
  static async getAllLogs(options: {
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
    actions?: AuditAction[]
    userId?: string
    resourceType?: string
  } = {}) {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      actions,
      userId,
      resourceType,
    } = options

    const where: any = {}

    if (userId) where.userId = userId
    if (resourceType) where.resourceType = resourceType

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    if (actions && actions.length > 0) {
      where.action = { in: actions }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total }
  }

  /**
   * Get security-related audit logs (failed logins, unauthorized access attempts)
   */
  static async getSecurityLogs(options: {
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  } = {}) {
    const securityActions = [
      'FAILED_LOGIN',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'SUSPICIOUS_ACTIVITY',
      'MFA_VERIFICATION_FAILED',
    ] as AuditAction[]

    return this.getAllLogs({
      ...options,
      actions: securityActions,
    })
  }

  /**
   * Delete old audit logs based on retention date
   * Should be run periodically (e.g., daily cron job)
   */
  static async cleanupExpiredLogs(): Promise<number> {
    const result = await prisma.auditLog.deleteMany({
      where: {
        retentionDate: {
          lt: new Date(),
        },
      },
    })

    console.log(`[AuditService] Cleaned up ${result.count} expired audit logs`)
    return result.count
  }

  /**
   * Get audit statistics for a time period
   */
  static async getStatistics(options: {
    startDate?: Date
    endDate?: Date
  } = {}) {
    const { startDate, endDate } = options

    const where: any = {}
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const [totalLogs, actionCounts, failedLogins, unauthorizedAttempts] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.auditLog.count({
        where: { ...where, action: 'FAILED_LOGIN' },
      }),
      prisma.auditLog.count({
        where: { ...where, action: 'UNAUTHORIZED_ACCESS_ATTEMPT' },
      }),
    ])

    return {
      totalLogs,
      topActions: actionCounts.map((a) => ({
        action: a.action,
        count: a._count,
      })),
      securityMetrics: {
        failedLogins,
        unauthorizedAttempts,
      },
    }
  }
}
