/**
 * Email Logging Service
 * 
 * Provides persistent logging for all email communications.
 * Essential for debugging, compliance, and tracking delivery issues.
 */

import { prisma } from '@smartmed/database'

// Email types that match the Prisma enum
export type EmailType =
  | 'APPOINTMENT_CONFIRMATION'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CANCELLATION'
  | 'PRESCRIPTION_NOTIFICATION'
  | 'HEALTH_TIP'
  | 'PASSWORD_RESET'
  | 'EMAIL_VERIFICATION'
  | 'WELCOME'
  | 'GENERAL'

// Email status that matches the Prisma enum
export type EmailStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'FAILED'
  | 'SPAM_COMPLAINT'

interface CreateEmailLogParams {
  recipientEmail: string
  recipientUserId?: string
  templateType: EmailType
  subject: string
  metadata?: Record<string, any>
}

interface UpdateEmailStatusParams {
  logId: string
  status: EmailStatus
  providerId?: string
  errorMessage?: string
  errorCode?: string
}

interface EmailLogQueryParams {
  recipientEmail?: string
  recipientUserId?: string
  templateType?: EmailType
  status?: EmailStatus
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

class EmailLogService {
  private static instance: EmailLogService

  private constructor() {}

  static getInstance(): EmailLogService {
    if (!EmailLogService.instance) {
      EmailLogService.instance = new EmailLogService()
    }
    return EmailLogService.instance
  }

  /**
   * Create a new email log entry
   */
  async createLog(params: CreateEmailLogParams): Promise<string> {
    try {
      const log = await prisma.emailLog.create({
        data: {
          recipientEmail: params.recipientEmail,
          recipientUserId: params.recipientUserId,
          templateType: params.templateType,
          subject: params.subject,
          status: 'PENDING',
          metadata: params.metadata || {},
        },
      })
      return log.id
    } catch (error) {
      console.error('Failed to create email log:', error)
      throw error
    }
  }

  /**
   * Update email status after sending
   */
  async updateStatus(params: UpdateEmailStatusParams): Promise<void> {
    try {
      const updateData: any = {
        status: params.status,
        updatedAt: new Date(),
      }

      if (params.providerId) {
        updateData.providerId = params.providerId
      }

      if (params.errorMessage) {
        updateData.errorMessage = params.errorMessage
      }

      if (params.errorCode) {
        updateData.errorCode = params.errorCode
      }

      // Set timestamp based on status
      switch (params.status) {
        case 'SENT':
          updateData.sentAt = new Date()
          break
        case 'DELIVERED':
          updateData.deliveredAt = new Date()
          break
        case 'OPENED':
          updateData.openedAt = new Date()
          break
        case 'CLICKED':
          updateData.clickedAt = new Date()
          break
        case 'BOUNCED':
          updateData.bouncedAt = new Date()
          break
        case 'FAILED':
          // Increment attempts on failure
          await prisma.emailLog.update({
            where: { id: params.logId },
            data: {
              ...updateData,
              attempts: { increment: 1 },
            },
          })
          return
      }

      await prisma.emailLog.update({
        where: { id: params.logId },
        data: updateData,
      })
    } catch (error) {
      console.error('Failed to update email log status:', error)
      // Don't throw - logging should not break email sending
    }
  }

  /**
   * Mark email as sent with provider ID
   */
  async markAsSent(logId: string, providerId?: string): Promise<void> {
    await this.updateStatus({
      logId,
      status: 'SENT',
      providerId,
    })
  }

  /**
   * Mark email as failed with error details
   */
  async markAsFailed(
    logId: string,
    errorMessage: string,
    errorCode?: string
  ): Promise<void> {
    await this.updateStatus({
      logId,
      status: 'FAILED',
      errorMessage,
      errorCode,
    })
  }

  /**
   * Query email logs with filters
   */
  async queryLogs(params: EmailLogQueryParams): Promise<{
    logs: any[]
    total: number
  }> {
    const where: any = {}

    if (params.recipientEmail) {
      where.recipientEmail = params.recipientEmail
    }

    if (params.recipientUserId) {
      where.recipientUserId = params.recipientUserId
    }

    if (params.templateType) {
      where.templateType = params.templateType
    }

    if (params.status) {
      where.status = params.status
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {}
      if (params.startDate) {
        where.createdAt.gte = params.startDate
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate
      }
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      prisma.emailLog.count({ where }),
    ])

    return { logs, total }
  }

  /**
   * Get email statistics for a time period
   */
  async getStats(startDate: Date, endDate: Date): Promise<{
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    deliveryRate: number
    bounceRate: number
  }> {
    const logs = await prisma.emailLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
        templateType: true,
      },
    })

    const byStatus: Record<string, number> = {}
    const byType: Record<string, number> = {}

    logs.forEach((log) => {
      byStatus[log.status] = (byStatus[log.status] || 0) + 1
      byType[log.templateType] = (byType[log.templateType] || 0) + 1
    })

    const total = logs.length
    const delivered = byStatus['DELIVERED'] || 0
    const bounced = byStatus['BOUNCED'] || 0
    const sent = byStatus['SENT'] || 0

    return {
      total,
      byStatus,
      byType,
      deliveryRate: total > 0 ? ((delivered + sent) / total) * 100 : 0,
      bounceRate: total > 0 ? (bounced / total) * 100 : 0,
    }
  }

  /**
   * Get recent failed emails for retry
   */
  async getFailedEmails(limit: number = 100): Promise<any[]> {
    return prisma.emailLog.findMany({
      where: {
        status: 'FAILED',
        attempts: { lt: 3 }, // Only retry if less than 3 attempts
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Clean up old logs (retention policy)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await prisma.emailLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return result.count
  }
}

// Export singleton instance
export const emailLogService = EmailLogService.getInstance()

// Export types
export type { CreateEmailLogParams, UpdateEmailStatusParams, EmailLogQueryParams }
