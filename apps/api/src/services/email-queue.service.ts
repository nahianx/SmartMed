/**
 * Email Notification Queue Service
 * 
 * Provides a simple email queue for:
 * - Tracking email delivery status
 * - Rate limiting to stay within free tier limits
 * - Retry logic for failed emails
 * - Email logging for debugging
 * 
 * For a university project, this uses in-memory storage.
 * For production, use Redis or database-backed queue.
 */

import { prisma } from '@smartmed/database'

// In-memory tracking (replace with Redis/DB in production)
const emailLog: EmailLogEntry[] = []
const DAILY_LIMIT = 100 // Resend free tier
const MONTHLY_LIMIT = 3000

interface EmailLogEntry {
  id: string
  to: string
  subject: string
  type: 'confirmation' | 'update' | 'cancellation' | 'reminder' | 'doctor_notification'
  appointmentId?: string
  status: 'pending' | 'sent' | 'failed'
  messageId?: string
  error?: string
  sentAt: Date
  retryCount: number
}

interface QueueStats {
  todaySent: number
  monthSent: number
  pending: number
  failed: number
  dailyRemaining: number
  monthlyRemaining: number
}

/**
 * Log an email send attempt
 */
export function logEmailSend(entry: Omit<EmailLogEntry, 'id' | 'sentAt' | 'retryCount'>): string {
  const id = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const logEntry: EmailLogEntry = {
    ...entry,
    id,
    sentAt: new Date(),
    retryCount: 0,
  }
  emailLog.push(logEntry)
  
  // Keep only last 1000 entries in memory
  if (emailLog.length > 1000) {
    emailLog.shift()
  }
  
  return id
}

/**
 * Update email log entry status
 */
export function updateEmailStatus(
  id: string, 
  status: 'sent' | 'failed', 
  messageId?: string, 
  error?: string
): void {
  const entry = emailLog.find(e => e.id === id)
  if (entry) {
    entry.status = status
    if (messageId) entry.messageId = messageId
    if (error) entry.error = error
  }
}

/**
 * Get email queue statistics
 */
export function getEmailQueueStats(): QueueStats {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const todaySent = emailLog.filter(
    e => e.sentAt >= todayStart && e.status === 'sent'
  ).length
  
  const monthSent = emailLog.filter(
    e => e.sentAt >= monthStart && e.status === 'sent'
  ).length
  
  const pending = emailLog.filter(e => e.status === 'pending').length
  const failed = emailLog.filter(e => e.status === 'failed').length
  
  return {
    todaySent,
    monthSent,
    pending,
    failed,
    dailyRemaining: DAILY_LIMIT - todaySent,
    monthlyRemaining: MONTHLY_LIMIT - monthSent,
  }
}

/**
 * Check if we can send more emails (within free tier limits)
 */
export function canSendEmail(): { allowed: boolean; reason?: string } {
  const stats = getEmailQueueStats()
  
  if (stats.dailyRemaining <= 0) {
    return { allowed: false, reason: 'Daily email limit reached (100/day)' }
  }
  
  if (stats.monthlyRemaining <= 0) {
    return { allowed: false, reason: 'Monthly email limit reached (3000/month)' }
  }
  
  return { allowed: true }
}

/**
 * Get recent email log entries
 */
export function getRecentEmails(limit: number = 50): EmailLogEntry[] {
  return emailLog
    .slice(-limit)
    .reverse()
}

/**
 * Get failed emails for retry
 */
export function getFailedEmails(): EmailLogEntry[] {
  return emailLog.filter(e => e.status === 'failed' && e.retryCount < 3)
}

/**
 * Mark email as retried
 */
export function markEmailRetried(id: string): void {
  const entry = emailLog.find(e => e.id === id)
  if (entry) {
    entry.retryCount++
    entry.status = 'pending'
  }
}

/**
 * Clear old log entries (for cleanup)
 */
export function clearOldLogs(daysToKeep: number = 7): number {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  const initialLength = emailLog.length
  const remaining = emailLog.filter(e => e.sentAt > cutoffDate)
  emailLog.length = 0
  emailLog.push(...remaining)
  
  return initialLength - emailLog.length
}

/**
 * Export email logs to database for persistence (optional)
 * Call this periodically to save logs to database
 */
export async function persistEmailLogs(): Promise<void> {
  // This is a placeholder - implement if you want to persist email logs to DB
  // You would need to add an EmailLog model to your Prisma schema
  console.log('[EMAIL-QUEUE] Log persistence not implemented - using in-memory storage')
}

/**
 * Simple rate limiter for email sending
 * Ensures we don't exceed 1 email per second (to avoid API rate limits)
 */
let lastEmailSent = 0
const MIN_EMAIL_INTERVAL_MS = 1000 // 1 second between emails

export async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastEmail = now - lastEmailSent
  
  if (timeSinceLastEmail < MIN_EMAIL_INTERVAL_MS) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_EMAIL_INTERVAL_MS - timeSinceLastEmail)
    )
  }
  
  lastEmailSent = Date.now()
}
