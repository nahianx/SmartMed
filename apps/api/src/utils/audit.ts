/**
 * HIPAA-Compliant Audit Logging Utility
 *
 * Logs access to sensitive data and critical actions.
 * Failures are swallowed to avoid breaking request flow.
 */
import { Request } from 'express'
import { prisma, AuditAction } from '@smartmed/database'

export interface AuditLogOptions {
  userId: string
  userRole?: string
  action: AuditAction
  resourceType: string
  resourceId: string
  metadata?: Record<string, any>
  success?: boolean
  errorMessage?: string
  request?: Request
}

export async function logAuditEvent(options: AuditLogOptions): Promise<void> {
  try {
    const {
      userId,
      userRole,
      action,
      resourceType,
      resourceId,
      metadata,
      success = true,
      errorMessage,
      request,
    } = options

    const ipAddress = request
      ? (request.ip ||
          (request.headers['x-forwarded-for'] as string) ||
          request.socket.remoteAddress)
      : undefined

    const userAgent = request?.headers['user-agent']

    await prisma.auditLog.create({
      data: {
        userId,
        userRole,
        action,
        resourceType,
        resourceId,
        metadata: metadata ? metadata : undefined,
        ipAddress,
        userAgent,
        success,
        errorMessage,
      },
    })

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(
        `[AUDIT] ${action}: ${resourceType}/${resourceId} by ${userId} (${userRole ?? 'unknown'})`
      )
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[AUDIT ERROR] Failed to create audit log:', error)
  }
}

export async function logPatientHistoryAccess(
  userId: string,
  userRole: string,
  patientId: string,
  request?: Request,
  queryFilters?: Record<string, any>,
): Promise<void> {
  await logAuditEvent({
    userId,
    userRole,
    action: AuditAction.PATIENT_HISTORY_ACCESS,
    resourceType: 'Patient',
    resourceId: patientId,
    metadata: queryFilters ? { filters: queryFilters } : undefined,
    request,
  })
}

export async function logDoctorHistoryAccess(
  userId: string,
  userRole: string,
  doctorId: string,
  request?: Request,
  queryFilters?: Record<string, any>,
): Promise<void> {
  await logAuditEvent({
    userId,
    userRole,
    action: AuditAction.DOCTOR_HISTORY_ACCESS,
    resourceType: 'Doctor',
    resourceId: doctorId,
    metadata: queryFilters ? { filters: queryFilters } : undefined,
    request,
  })
}

export async function logSearchOperation(
  userId: string,
  userRole: string,
  searchType: 'DOCTOR_SEARCH' | 'APPOINTMENT_SEARCH' | 'PATIENT_SEARCH',
  filters: Record<string, any>,
  resultCount: number,
  request?: Request,
): Promise<void> {
  await logAuditEvent({
    userId,
    userRole,
    action: AuditAction[searchType],
    resourceType: searchType.replace('_SEARCH', ''),
    resourceId: 'SEARCH_OPERATION',
    metadata: { filters, resultCount },
    request,
  })
}

export async function logUnauthorizedAccess(
  userId: string,
  attemptedResource: string,
  attemptedAction: string,
  request?: Request,
): Promise<void> {
  await logAuditEvent({
    userId,
    action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
    resourceType: attemptedResource,
    resourceId: 'UNAUTHORIZED',
    success: false,
    errorMessage: `Attempted: ${attemptedAction}`,
    request,
  })
}

export async function getUserAuditHistory(
  userId: string,
  options?: {
    startDate?: Date
    endDate?: Date
    actions?: AuditAction[]
    limit?: number
  },
) {
  const { startDate, endDate, actions, limit = 100 } = options || {}

  const where: any = { userId }

  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp.gte = startDate
    if (endDate) where.timestamp.lte = endDate
  }

  if (actions && actions.length > 0) {
    where.action = { in: actions }
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  })
}

export async function getResourceAuditHistory(
  resourceType: string,
  resourceId: string,
  options?: { startDate?: Date; endDate?: Date; limit?: number },
) {
  const { startDate, endDate, limit = 100 } = options || {}

  const where: any = { resourceType, resourceId }
  if (startDate || endDate) {
    where.timestamp = {}
    if (startDate) where.timestamp.gte = startDate
    if (endDate) where.timestamp.lte = endDate
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  })
}

export async function cleanupExpiredAuditLogs(): Promise<number> {
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        retentionDate: { lt: new Date() },
      },
    })
    // eslint-disable-next-line no-console
    console.log(`[AUDIT CLEANUP] Deleted ${result.count} expired audit logs`)
    return result.count
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[AUDIT CLEANUP ERROR]', error)
    return 0
  }
}
