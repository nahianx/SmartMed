/**
 * Push Notification Routes
 * 
 * Handles push subscription management and public key retrieval.
 */

import { Router, Response } from 'express'
import { z } from 'zod'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { validateSchema } from '../middleware/validation'
import { pushNotificationService } from '../services/push-notification.service'

const router = Router()

// Zod schemas
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  deviceName: z.string().optional(),
})

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

/**
 * GET /api/push/vapid-key
 * 
 * Get the VAPID public key for subscribing to push notifications.
 * This endpoint is public - needed before authentication for subscription setup.
 */
router.get('/vapid-key', (_req, res: Response) => {
  const publicKey = pushNotificationService.getPublicKey()
  
  if (!publicKey) {
    return res.status(503).json({
      error: 'Push notifications are not configured',
      enabled: false,
    })
  }

  return res.json({
    publicKey,
    enabled: true,
  })
})

/**
 * POST /api/push/subscribe
 * 
 * Register a push subscription for the current user.
 */
router.post(
  '/subscribe',
  requireAuth,
  validateSchema({ body: subscriptionSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (!pushNotificationService.isEnabled()) {
        return res.status(503).json({
          error: 'Push notifications are not available',
        })
      }

      const { endpoint, keys, deviceName } = req.body
      const userAgent = req.headers['user-agent']

      const subscriptionId = await pushNotificationService.saveSubscription(
        req.user.id,
        {
          endpoint,
          keys,
          userAgent,
          deviceName,
        }
      )

      return res.status(201).json({
        success: true,
        subscriptionId,
        message: 'Push subscription registered successfully',
      })
    } catch (error) {
      console.error('Error registering push subscription:', error)
      return res.status(500).json({
        error: 'Failed to register push subscription',
      })
    }
  }
)

/**
 * DELETE /api/push/subscribe
 * 
 * Unsubscribe from push notifications.
 */
router.delete(
  '/subscribe',
  requireAuth,
  validateSchema({ body: unsubscribeSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { endpoint } = req.body
      const removed = await pushNotificationService.removeSubscription(endpoint)

      if (!removed) {
        return res.status(404).json({
          error: 'Subscription not found',
        })
      }

      return res.json({
        success: true,
        message: 'Push subscription removed',
      })
    } catch (error) {
      console.error('Error removing push subscription:', error)
      return res.status(500).json({
        error: 'Failed to remove push subscription',
      })
    }
  }
)

/**
 * GET /api/push/subscriptions
 * 
 * Get all push subscriptions for the current user.
 */
router.get(
  '/subscriptions',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const subscriptions = await pushNotificationService.getUserSubscriptions(
        req.user.id
      )

      return res.json({
        subscriptions,
        count: subscriptions.length,
      })
    } catch (error) {
      console.error('Error fetching push subscriptions:', error)
      return res.status(500).json({
        error: 'Failed to fetch push subscriptions',
      })
    }
  }
)

/**
 * POST /api/push/test
 * 
 * Send a test notification to all user's devices.
 */
router.post(
  '/test',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (!pushNotificationService.isEnabled()) {
        return res.status(503).json({
          error: 'Push notifications are not available',
        })
      }

      const result = await pushNotificationService.sendToUser(req.user.id, {
        title: '🔔 Test Notification',
        body: 'Push notifications are working correctly!',
        icon: '/icons/notification-192.png',
        badge: '/icons/badge-72.png',
        tag: 'test-notification',
        data: {
          type: 'TEST',
          timestamp: new Date().toISOString(),
        },
      })

      return res.json({
        success: true,
        sent: result.sent,
        failed: result.failed,
        message: result.sent > 0
          ? `Test notification sent to ${result.sent} device(s)`
          : 'No active subscriptions found',
      })
    } catch (error) {
      console.error('Error sending test notification:', error)
      return res.status(500).json({
        error: 'Failed to send test notification',
      })
    }
  }
)

export default router
