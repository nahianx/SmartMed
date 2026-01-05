import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { rateLimiter } from '../middleware/rateLimiter'
import { validateSchema } from '../middleware/validation'
import { healthTipsService, GeneratedTip } from '../services/healthTips.service'

const router = Router()

// Apply authentication to all routes
router.use(requireAuth)

// Zod schemas for validation
const preferencesUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  categories: z.array(z.enum([
    'GENERAL_WELLNESS',
    'NUTRITION',
    'EXERCISE',
    'MENTAL_HEALTH',
    'SLEEP',
    'MEDICATION',
    'PREVENTIVE_CARE',
    'CHRONIC_CONDITION',
    'LIFESTYLE',
  ])).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY']).optional(),
  deliveryMethod: z.enum(['IN_APP', 'EMAIL', 'BOTH']).optional(),
})

const generateTipsSchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
})

type PreferenceCreateOverrides = Partial<z.infer<typeof preferencesUpdateSchema>> & {
  lastGeneratedAt?: Date | null
}

const buildPreferenceCreateData = (
  userId: string,
  overrides: PreferenceCreateOverrides = {}
) => ({
  userId,
  enabled: overrides.enabled ?? true,
  categories: overrides.categories ?? [],
  frequency: overrides.frequency ?? 'DAILY',
  deliveryMethod: overrides.deliveryMethod ?? 'IN_APP',
  lastGeneratedAt: overrides.lastGeneratedAt ?? null,
})

// GET /api/health-tips - Get health tips for current user
router.get(
  '/',
  rateLimiter(30, 60 * 1000), // 30 requests per minute
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { limit = '10', offset = '0', includeArchived = 'false' } = req.query

      // Check user preferences first
      const preferences = await prisma.healthTipPreference.findUnique({
        where: { userId: req.user.id },
      })

      // If user has opted out, return empty
      if (preferences && !preferences.enabled) {
        return res.json({
          items: [],
          total: 0,
          message: 'Health tips are disabled. Enable them in preferences.',
        })
      }

      // Check for existing tips in database
      const whereClause: any = {
        userId: req.user.id,
        expiresAt: { gte: new Date() },
      }

      if (includeArchived !== 'true') {
        whereClause.isArchived = false
      }

      const [existingTips, total] = await Promise.all([
        prisma.healthTip.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: parseInt(String(limit), 10),
          skip: parseInt(String(offset), 10),
        }),
        prisma.healthTip.count({ where: whereClause }),
      ])

      // If we have recent tips, return them
      if (existingTips.length > 0) {
        return res.json({
          items: existingTips.map(formatTipForResponse),
          total,
          source: 'database',
          disclaimer: {
            required: true,
            message: 'These health tips are AI-generated for informational purposes only and do not constitute medical advice. Always consult with a qualified healthcare professional for medical decisions.',
            aiGenerated: true,
          },
        })
      }

      // Generate new tips if none exist
      const generatedTips = await healthTipsService.getHealthTips({
        userId: req.user.id,
      })

      // Store generated tips in database
      const storedTips = await storeTips(req.user.id, generatedTips)

      return res.json({
        items: storedTips.map(formatTipForResponse),
        total: storedTips.length,
        source: 'generated',
        disclaimer: {
          required: true,
          message: 'These health tips are AI-generated for informational purposes only and do not constitute medical advice. Always consult with a qualified healthcare professional for medical decisions.',
          aiGenerated: true,
        },
      })
    } catch (error) {
      console.error('Error fetching health tips:', error)
      return res.status(500).json({ error: 'Failed to fetch health tips' })
    }
  }
)

// POST /api/health-tips/generate - Force generate new tips
router.post(
  '/generate',
  rateLimiter(5, 60 * 1000), // 5 requests per minute (stricter limit)
  validateSchema({ body: generateTipsSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Check user preferences
      const preferences = await prisma.healthTipPreference.findUnique({
        where: { userId: req.user.id },
      })

      if (preferences && !preferences.enabled) {
        return res.status(403).json({
          error: 'Health tips are disabled. Enable them in preferences first.',
        })
      }

      // Generate new tips
      const generatedTips = await healthTipsService.generateNewTips({
        userId: req.user.id,
      })

      // Store in database
      const storedTips = await storeTips(req.user.id, generatedTips)

      // Update last generated timestamp
      const lastGeneratedAt = new Date()
      await prisma.healthTipPreference.upsert({
        where: { userId: req.user.id },
        update: { lastGeneratedAt },
        create: buildPreferenceCreateData(req.user.id, { lastGeneratedAt }),
      })

      return res.status(201).json({
        items: storedTips.map(formatTipForResponse),
        total: storedTips.length,
        source: 'generated',
        generatedAt: new Date().toISOString(),
        disclaimer: {
          required: true,
          message: 'These health tips are AI-generated for informational purposes only and do not constitute medical advice. Always consult with a qualified healthcare professional for medical decisions.',
          aiGenerated: true,
        },
      })
    } catch (error) {
      console.error('Error generating health tips:', error)
      return res.status(500).json({ error: 'Failed to generate health tips' })
    }
  }
)

// GET /api/health-tips/preferences - Get user preferences
router.get(
  '/preferences',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      let preferences = await prisma.healthTipPreference.findUnique({
        where: { userId: req.user.id },
      })

      // Return default preferences if none exist
      if (!preferences) {
        preferences = {
          id: '',
          userId: req.user.id,
          enabled: true,
          categories: [],
          frequency: 'DAILY',
          deliveryMethod: 'IN_APP',
          lastGeneratedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any
      }

      return res.json({
        preferences: {
          enabled: preferences.enabled,
          categories: preferences.categories,
          frequency: preferences.frequency,
          deliveryMethod: preferences.deliveryMethod,
          lastGeneratedAt: preferences.lastGeneratedAt,
        },
      })
    } catch (error) {
      console.error('Error fetching preferences:', error)
      return res.status(500).json({ error: 'Failed to fetch preferences' })
    }
  }
)

// PUT /api/health-tips/preferences - Update user preferences
router.put(
  '/preferences',
  validateSchema({ body: preferencesUpdateSchema }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const updates = req.body

      const preferences = await prisma.healthTipPreference.upsert({
        where: { userId: req.user.id },
        update: updates,
        create: {
          ...buildPreferenceCreateData(req.user.id, updates),
        },
      })

      // If disabled, invalidate cache
      if (updates.enabled === false) {
        healthTipsService.invalidateUserCache(req.user.id)
      }

      return res.json({
        preferences: {
          enabled: preferences.enabled,
          categories: preferences.categories,
          frequency: preferences.frequency,
          deliveryMethod: preferences.deliveryMethod,
          lastGeneratedAt: preferences.lastGeneratedAt,
        },
        message: 'Preferences updated successfully',
      })
    } catch (error) {
      console.error('Error updating preferences:', error)
      return res.status(500).json({ error: 'Failed to update preferences' })
    }
  }
)

// POST /api/health-tips/:id/read - Mark a tip as read
router.post(
  '/:id/read',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { id } = req.params

      const tip = await prisma.healthTip.updateMany({
        where: { id, userId: req.user.id },
        data: { isRead: true },
      })

      if (tip.count === 0) {
        return res.status(404).json({ error: 'Tip not found' })
      }

      return res.json({ success: true })
    } catch (error) {
      console.error('Error marking tip as read:', error)
      return res.status(500).json({ error: 'Failed to mark tip as read' })
    }
  }
)

// POST /api/health-tips/:id/archive - Archive a tip
router.post(
  '/:id/archive',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { id } = req.params

      const tip = await prisma.healthTip.updateMany({
        where: { id, userId: req.user.id },
        data: { isArchived: true },
      })

      if (tip.count === 0) {
        return res.status(404).json({ error: 'Tip not found' })
      }

      return res.json({ success: true })
    } catch (error) {
      console.error('Error archiving tip:', error)
      return res.status(500).json({ error: 'Failed to archive tip' })
    }
  }
)

// GET /api/health-tips/metrics - Get service metrics (admin only)
router.get(
  '/metrics',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Only allow admin access
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const metrics = healthTipsService.getMetrics()
      
      // Get database stats
      const [totalTips, uniqueUsers, recentTips] = await Promise.all([
        prisma.healthTip.count(),
        prisma.healthTip.groupBy({
          by: ['userId'],
          _count: true,
        }),
        prisma.healthTip.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ])

      return res.json({
        service: metrics,
        database: {
          totalTips,
          uniqueUsers: uniqueUsers.length,
          tipsLast24h: recentTips,
        },
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
      return res.status(500).json({ error: 'Failed to fetch metrics' })
    }
  }
)

// Helper function to store tips in database
async function storeTips(userId: string, tips: GeneratedTip[]): Promise<any[]> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const storedTips = []
  for (const tip of tips) {
    try {
      const stored = await prisma.healthTip.upsert({
        where: {
          userId_tipText: {
            userId,
            tipText: tip.text,
          },
        },
        update: {
          expiresAt,
          updatedAt: new Date(),
        },
        create: {
          userId,
          tipText: tip.text,
          category: tip.category,
          source: tip.source,
          expiresAt,
          metadata: {
            generatedAt: tip.generatedAt.toISOString(),
          },
        },
      })
      storedTips.push(stored)
    } catch (error) {
      console.error('Error storing tip:', error)
      // Continue with other tips
    }
  }

  return storedTips
}

// Helper function to format tip for API response
function formatTipForResponse(tip: any) {
  return {
    id: tip.id,
    text: tip.tipText,
    category: tip.category,
    source: tip.source,
    isRead: tip.isRead,
    isArchived: tip.isArchived,
    expiresAt: tip.expiresAt,
    createdAt: tip.createdAt,
  }
}

export default router
