/**
 * Push Notification Service
 * 
 * Handles Web Push notifications for real-time alerts.
 * Uses the Web Push Protocol (RFC 8291) for secure delivery.
 */

import webpush, { PushSubscription as WebPushSubscription, SendResult } from 'web-push'
import { prisma } from '@smartmed/database'

// Configure VAPID keys
// Generate using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@smartmed.local'

// Notification types
export type PushNotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'PRESCRIPTION_READY'
  | 'HEALTH_TIP'
  | 'QUEUE_UPDATE'
  | 'DOCTOR_AVAILABLE'
  | 'GENERAL'

// Notification payload structure
export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  vibrate?: number[]
}

// Subscription input from client
export interface SubscriptionInput {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
  deviceName?: string
}

// Result of sending notification
export interface SendPushResult {
  success: boolean
  subscriptionId: string
  error?: string
}

class PushNotificationService {
  private static instance: PushNotificationService
  private initialized = false

  private constructor() {
    this.initialize()
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService()
    }
    return PushNotificationService.instance
  }

  private initialize(): void {
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
      this.initialized = true
      console.log('✅ Web Push notifications initialized')
    } else {
      console.warn('⚠️ Web Push not configured - VAPID keys missing')
      console.log('Generate keys with: npx web-push generate-vapid-keys')
    }
  }

  /**
   * Check if push notifications are enabled
   */
  isEnabled(): boolean {
    return this.initialized
  }

  /**
   * Get the public VAPID key for client-side subscription
   */
  getPublicKey(): string {
    return VAPID_PUBLIC_KEY
  }

  /**
   * Save a push subscription for a user
   */
  async saveSubscription(
    userId: string,
    subscription: SubscriptionInput
  ): Promise<string> {
    // Check for existing subscription with same endpoint
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    })

    if (existing) {
      // Update existing subscription
      const updated = await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          userId, // Update user if different (e.g., re-login)
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: subscription.userAgent,
          deviceName: subscription.deviceName,
          isActive: true,
          failureCount: 0,
          updatedAt: new Date(),
        },
      })
      return updated.id
    }

    // Create new subscription
    const created = await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: subscription.userAgent,
        deviceName: subscription.deviceName,
      },
    })

    return created.id
  }

  /**
   * Remove a push subscription
   */
  async removeSubscription(endpoint: string): Promise<boolean> {
    try {
      await prisma.pushSubscription.delete({
        where: { endpoint },
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get all active subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<Array<{
    id: string
    deviceName: string | null
    userAgent: string | null
    lastUsedAt: Date | null
    createdAt: Date
  }>> {
    return prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Send a push notification to a specific subscription
   */
  private async sendToSubscription(
    subscription: { id: string; endpoint: string; p256dh: string; auth: string },
    payload: PushNotificationPayload
  ): Promise<SendPushResult> {
    if (!this.initialized) {
      return {
        success: false,
        subscriptionId: subscription.id,
        error: 'Push notifications not initialized',
      }
    }

    const webPushSubscription: WebPushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    }

    try {
      await webpush.sendNotification(
        webPushSubscription,
        JSON.stringify(payload)
      )

      // Update last used timestamp
      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: {
          lastUsedAt: new Date(),
          failureCount: 0, // Reset failure count on success
        },
      })

      return {
        success: true,
        subscriptionId: subscription.id,
      }
    } catch (error: any) {
      console.error(`Push notification failed for ${subscription.id}:`, error)

      // Handle specific errors
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription is no longer valid - remove it
        await prisma.pushSubscription.delete({
          where: { id: subscription.id },
        }).catch(() => {})

        return {
          success: false,
          subscriptionId: subscription.id,
          error: 'Subscription expired or invalid',
        }
      }

      // Increment failure count
      await prisma.pushSubscription.update({
        where: { id: subscription.id },
        data: {
          failureCount: { increment: 1 },
        },
      })

      // Deactivate if too many failures
      const updated = await prisma.pushSubscription.findUnique({
        where: { id: subscription.id },
      })
      if (updated && updated.failureCount >= 5) {
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false },
        })
      }

      return {
        success: false,
        subscriptionId: subscription.id,
        error: error.message || 'Unknown error',
      }
    }
  }

  /**
   * Send a notification to all of a user's devices
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<{
    sent: number
    failed: number
    results: SendPushResult[]
  }> {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    })

    const results: SendPushResult[] = []
    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      const result = await this.sendToSubscription(sub, payload)
      results.push(result)
      if (result.success) sent++
      else failed++
    }

    return { sent, failed, results }
  }

  /**
   * Send a notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{
    totalSent: number
    totalFailed: number
    byUser: Record<string, { sent: number; failed: number }>
  }> {
    const byUser: Record<string, { sent: number; failed: number }> = {}
    let totalSent = 0
    let totalFailed = 0

    for (const userId of userIds) {
      const result = await this.sendToUser(userId, payload)
      byUser[userId] = { sent: result.sent, failed: result.failed }
      totalSent += result.sent
      totalFailed += result.failed
    }

    return { totalSent, totalFailed, byUser }
  }

  /**
   * Send appointment reminder notification
   */
  async sendAppointmentReminder(
    userId: string,
    appointmentData: {
      id: string
      doctorName: string
      dateTime: Date
      reminderType: '24h' | '1h'
    }
  ): Promise<{ sent: number; failed: number }> {
    const timeText = appointmentData.reminderType === '24h' ? 'tomorrow' : 'in 1 hour'
    
    const payload: PushNotificationPayload = {
      title: '📅 Appointment Reminder',
      body: `Your appointment with ${appointmentData.doctorName} is ${timeText}`,
      icon: '/icons/appointment-192.png',
      badge: '/icons/badge-72.png',
      tag: `appointment-reminder-${appointmentData.id}`,
      data: {
        type: 'APPOINTMENT_REMINDER',
        appointmentId: appointmentData.id,
        url: `/appointments/${appointmentData.id}`,
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [200, 100, 200],
      requireInteraction: appointmentData.reminderType === '1h',
    }

    return this.sendToUser(userId, payload)
  }

  /**
   * Send queue update notification
   */
  async sendQueueUpdate(
    userId: string,
    queueData: {
      position: number
      estimatedWait: number
      doctorName: string
    }
  ): Promise<{ sent: number; failed: number }> {
    const payload: PushNotificationPayload = {
      title: '🏥 Queue Update',
      body: `You are #${queueData.position} in line for ${queueData.doctorName}. Estimated wait: ${queueData.estimatedWait} minutes`,
      icon: '/icons/queue-192.png',
      badge: '/icons/badge-72.png',
      tag: 'queue-update',
      data: {
        type: 'QUEUE_UPDATE',
        position: queueData.position,
        url: '/queue',
      },
    }

    return this.sendToUser(userId, payload)
  }

  /**
   * Send health tip notification
   */
  async sendHealthTip(
    userId: string,
    tipData: {
      id: string
      title: string
      category: string
    }
  ): Promise<{ sent: number; failed: number }> {
    const payload: PushNotificationPayload = {
      title: '💡 New Health Tip',
      body: tipData.title,
      icon: '/icons/health-192.png',
      badge: '/icons/badge-72.png',
      tag: `health-tip-${tipData.id}`,
      data: {
        type: 'HEALTH_TIP',
        tipId: tipData.id,
        category: tipData.category,
        url: '/health-tips',
      },
    }

    return this.sendToUser(userId, payload)
  }

  /**
   * Clean up inactive or expired subscriptions
   */
  async cleanupSubscriptions(): Promise<number> {
    // Remove subscriptions that have been inactive for 90 days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)

    const result = await prisma.pushSubscription.deleteMany({
      where: {
        OR: [
          { isActive: false },
          {
            lastUsedAt: { lt: cutoffDate },
          },
          {
            AND: [
              { lastUsedAt: null },
              { createdAt: { lt: cutoffDate } },
            ],
          },
        ],
      },
    })

    return result.count
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance()

// Export types
export type { SubscriptionInput, PushNotificationPayload, SendPushResult }
