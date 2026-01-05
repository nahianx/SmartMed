import { Router, Response } from 'express'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

/**
 * GET /api/notifications
 * Fetch all notifications for the authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Also return unread count for convenience
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    })

    res.json({ items: notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

/**
 * GET /api/notifications/unread-count
 * Get just the unread notification count (lightweight)
 */
router.get('/unread-count', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    })

    res.json({ count })
  } catch (error) {
    console.error('Error fetching unread count', error)
    res.status(500).json({ error: 'Failed to fetch unread count' })
  }
})

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
router.post('/mark-all-read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const now = new Date()

    // Update all unread notifications for this user
    const result = await prisma.notification.updateMany({
      where: { 
        userId, 
        readAt: null 
      },
      data: { readAt: now },
    })

    res.json({ 
      success: true, 
      markedCount: result.count,
      message: result.count > 0 
        ? `Marked ${result.count} notification${result.count > 1 ? 's' : ''} as read`
        : 'No unread notifications to mark'
    })
  } catch (error) {
    console.error('Error marking all notifications as read', error)
    res.status(500).json({ error: 'Failed to mark notifications as read' })
  }
})

/**
 * POST /api/notifications/:id/read
 * Mark a single notification as read
 */
router.post('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const notification = await prisma.notification.updateMany({
      where: { id, userId: req.user!.id },
      data: { readAt: new Date() },
    })

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Error marking notification as read', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

/**
 * DELETE /api/notifications/clear-read
 * Clear all read notifications (optional feature)
 */
router.delete('/clear-read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const result = await prisma.notification.deleteMany({
      where: { 
        userId, 
        readAt: { not: null } 
      },
    })

    res.json({ 
      success: true, 
      deletedCount: result.count,
      message: result.count > 0 
        ? `Cleared ${result.count} read notification${result.count > 1 ? 's' : ''}`
        : 'No read notifications to clear'
    })
  } catch (error) {
    console.error('Error clearing read notifications', error)
    res.status(500).json({ error: 'Failed to clear notifications' })
  }
})

export default router
