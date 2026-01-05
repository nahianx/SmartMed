/**
 * Notification Preferences Service
 * 
 * Manages user notification preferences for all channels.
 */

import { prisma } from '@smartmed/database'

// Types for preferences
export interface NotificationPreferenceInput {
  // Appointment notifications
  appointmentReminders?: boolean
  appointmentConfirmation?: boolean
  appointmentCancellation?: boolean
  reminderTiming?: string

  // Queue notifications
  queueUpdates?: boolean
  queuePositionThreshold?: number

  // Health tips notifications
  healthTipsEnabled?: boolean
  healthTipsFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'

  // Prescription notifications
  prescriptionReady?: boolean

  // Delivery channels
  emailEnabled?: boolean
  pushEnabled?: boolean
  smsEnabled?: boolean

  // Quiet hours
  quietHoursEnabled?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone?: string
}

export interface NotificationPreference {
  id: string
  userId: string
  appointmentReminders: boolean
  appointmentConfirmation: boolean
  appointmentCancellation: boolean
  reminderTiming: string
  queueUpdates: boolean
  queuePositionThreshold: number
  healthTipsEnabled: boolean
  healthTipsFrequency: string
  prescriptionReady: boolean
  emailEnabled: boolean
  pushEnabled: boolean
  smsEnabled: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  timezone: string
  createdAt: Date
  updatedAt: Date
}

// Default preferences
const DEFAULT_PREFERENCES: Omit<NotificationPreferenceInput, never> = {
  appointmentReminders: true,
  appointmentConfirmation: true,
  appointmentCancellation: true,
  reminderTiming: '24h,1h',
  queueUpdates: true,
  queuePositionThreshold: 3,
  healthTipsEnabled: true,
  healthTipsFrequency: 'DAILY',
  prescriptionReady: true,
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  timezone: 'UTC',
}

class NotificationPreferenceService {
  private static instance: NotificationPreferenceService

  private constructor() {}

  static getInstance(): NotificationPreferenceService {
    if (!NotificationPreferenceService.instance) {
      NotificationPreferenceService.instance = new NotificationPreferenceService()
    }
    return NotificationPreferenceService.instance
  }

  /**
   * Get user's notification preferences (creates defaults if none exist)
   */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    })

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          ...DEFAULT_PREFERENCES,
        },
      })
    }

    return preferences
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: NotificationPreferenceInput
  ): Promise<NotificationPreference> {
    // Validate reminder timing format
    if (updates.reminderTiming) {
      const validTimings = ['24h', '12h', '6h', '2h', '1h', '30m', '15m']
      const timings = updates.reminderTiming.split(',')
      for (const timing of timings) {
        if (!validTimings.includes(timing.trim())) {
          throw new Error(`Invalid reminder timing: ${timing}`)
        }
      }
    }

    // Validate quiet hours format
    if (updates.quietHoursStart || updates.quietHoursEnd) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (updates.quietHoursStart && !timeRegex.test(updates.quietHoursStart)) {
        throw new Error('Invalid quiet hours start time format (use HH:MM)')
      }
      if (updates.quietHoursEnd && !timeRegex.test(updates.quietHoursEnd)) {
        throw new Error('Invalid quiet hours end time format (use HH:MM)')
      }
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...DEFAULT_PREFERENCES,
        ...updates,
      },
    })

    return preferences
  }

  /**
   * Check if a notification should be sent based on preferences
   */
  async shouldNotify(
    userId: string,
    notificationType: 'appointment' | 'queue' | 'healthTip' | 'prescription',
    channel: 'email' | 'push' | 'sms'
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId)

    // Check channel preference
    if (channel === 'email' && !prefs.emailEnabled) return false
    if (channel === 'push' && !prefs.pushEnabled) return false
    if (channel === 'sms' && !prefs.smsEnabled) return false

    // Check quiet hours
    if (prefs.quietHoursEnabled && this.isInQuietHours(prefs)) {
      return false
    }

    // Check notification type preference
    switch (notificationType) {
      case 'appointment':
        return prefs.appointmentReminders || 
               prefs.appointmentConfirmation || 
               prefs.appointmentCancellation
      case 'queue':
        return prefs.queueUpdates
      case 'healthTip':
        return prefs.healthTipsEnabled
      case 'prescription':
        return prefs.prescriptionReady
      default:
        return true
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(prefs: NotificationPreference): boolean {
    if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
      return false
    }

    const now = new Date()
    // Convert to user's timezone
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: prefs.timezone })
    )
    
    const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes()
    
    const [startHour, startMin] = prefs.quietHoursStart.split(':').map(Number)
    const [endHour, endMin] = prefs.quietHoursEnd.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  /**
   * Get reminder timings as array
   */
  async getReminderTimings(userId: string): Promise<string[]> {
    const prefs = await this.getPreferences(userId)
    return prefs.reminderTiming.split(',').map((t) => t.trim())
  }

  /**
   * Check if queue position notification should be sent
   */
  async shouldNotifyQueuePosition(
    userId: string,
    currentPosition: number
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId)
    
    if (!prefs.queueUpdates || !prefs.pushEnabled) {
      return false
    }

    return currentPosition <= prefs.queuePositionThreshold
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(userId: string): Promise<NotificationPreference> {
    return this.updatePreferences(userId, DEFAULT_PREFERENCES)
  }
}

// Export singleton instance
export const notificationPreferenceService = NotificationPreferenceService.getInstance()

// Export types
export type { NotificationPreferenceInput }
