/**
 * Notification Preferences Routes
 * 
 * API endpoints for managing user notification preferences.
 */

import { Router, Request, Response } from 'express'
import { notificationPreferenceService, NotificationPreferenceInput, NOTIFICATION_SOUNDS } from '../services/notification-preference.service'
import { requireAuth } from '../middleware/auth'

const router = Router()

/**
 * @route   GET /api/notifications/preferences/sounds
 * @desc    Get available notification sounds
 * @access  Private
 */
router.get('/preferences/sounds', requireAuth, async (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: NOTIFICATION_SOUNDS,
  })
})

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get current user's notification preferences
 * @access  Private
 */
router.get('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      })
    }

    const preferences = await notificationPreferenceService.getPreferences(userId)

    return res.status(200).json({
      success: true,
      data: preferences,
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch notification preferences',
    })
  }
})

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update current user's notification preferences
 * @access  Private
 */
router.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      })
    }

    const updates: NotificationPreferenceInput = req.body

    // Validate request body
    const allowedFields = [
      'appointmentReminders',
      'appointmentConfirmation',
      'appointmentCancellation',
      'reminderTiming',
      'queueUpdates',
      'queuePositionThreshold',
      'healthTipsEnabled',
      'healthTipsFrequency',
      'prescriptionReady',
      'emailEnabled',
      'pushEnabled',
      'smsEnabled',
      'audioNotificationsEnabled',
      'browserNotificationsEnabled',
      'notificationSound',
      'notificationVolume',
      'quietHoursEnabled',
      'quietHoursStart',
      'quietHoursEnd',
      'timezone',
    ]

    const unknownFields = Object.keys(updates).filter(
      (key) => !allowedFields.includes(key)
    )

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Unknown fields: ${unknownFields.join(', ')}`,
      })
    }

    const preferences = await notificationPreferenceService.updatePreferences(
      userId,
      updates
    )

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated successfully',
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    
    if (error instanceof Error && error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences',
    })
  }
})

/**
 * @route   POST /api/notifications/preferences/reset
 * @desc    Reset notification preferences to defaults
 * @access  Private
 */
router.post('/preferences/reset', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      })
    }

    const preferences = await notificationPreferenceService.resetToDefaults(userId)

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'Notification preferences reset to defaults',
    })
  } catch (error) {
    console.error('Error resetting notification preferences:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to reset notification preferences',
    })
  }
})

/**
 * @route   GET /api/notifications/preferences/should-notify
 * @desc    Check if a notification should be sent (for testing/debugging)
 * @access  Private
 */
router.get('/preferences/should-notify', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      })
    }

    const { type, channel } = req.query

    if (!type || !channel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: type and channel',
      })
    }

    const validTypes = ['appointment', 'queue', 'healthTip', 'prescription']
    const validChannels = ['email', 'push', 'sms']

    if (!validTypes.includes(type as string)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      })
    }

    if (!validChannels.includes(channel as string)) {
      return res.status(400).json({
        success: false,
        error: `Invalid channel. Must be one of: ${validChannels.join(', ')}`,
      })
    }

    const shouldNotify = await notificationPreferenceService.shouldNotify(
      userId,
      type as 'appointment' | 'queue' | 'healthTip' | 'prescription',
      channel as 'email' | 'push' | 'sms'
    )

    return res.status(200).json({
      success: true,
      data: {
        shouldNotify,
        type,
        channel,
      },
    })
  } catch (error) {
    console.error('Error checking notification preferences:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to check notification preferences',
    })
  }
})

export default router
