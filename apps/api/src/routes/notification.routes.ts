import { Router, Response } from 'express'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json({ items: notifications })
  } catch (error) {
    console.error('Error fetching notifications', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

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

export default router
