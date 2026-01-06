/**
 * Dashboard Configuration Routes
 * 
 * API endpoints for managing user dashboard configurations.
 */

import { Router, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { dashboardConfigService } from '../services/dashboardConfig.service'
import { UserRole } from '@smartmed/types'

const router = Router()

/**
 * GET /api/dashboard-config
 * Get current user's dashboard configuration
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const role = req.user!.role as UserRole

    const config = await dashboardConfigService.getConfig(userId, role)
    res.json(config)
  } catch (error) {
    console.error('Error fetching dashboard config:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard configuration' })
  }
})

/**
 * PUT /api/dashboard-config
 * Update current user's dashboard configuration
 */
router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const role = req.user!.role as UserRole
    const { widgets, layout } = req.body

    if (!widgets || !Array.isArray(widgets)) {
      return res.status(400).json({ error: 'Invalid widgets array' })
    }

    const config = await dashboardConfigService.updateConfig(userId, role, {
      widgets,
      layout,
    })
    res.json(config)
  } catch (error) {
    console.error('Error updating dashboard config:', error)
    res.status(500).json({ error: 'Failed to update dashboard configuration' })
  }
})

/**
 * POST /api/dashboard-config/reset
 * Reset dashboard to default configuration
 */
router.post('/reset', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const role = req.user!.role as UserRole

    const config = await dashboardConfigService.resetToDefault(userId, role)
    res.json(config)
  } catch (error) {
    console.error('Error resetting dashboard config:', error)
    res.status(500).json({ error: 'Failed to reset dashboard configuration' })
  }
})

/**
 * PATCH /api/dashboard-config/widgets/:widgetId
 * Update a single widget's configuration
 */
router.patch('/widgets/:widgetId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const role = req.user!.role as UserRole
    const { widgetId } = req.params
    const updates = req.body

    const config = await dashboardConfigService.updateWidget(
      userId,
      role,
      widgetId,
      updates
    )
    res.json(config)
  } catch (error: any) {
    console.error('Error updating widget:', error)
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to update widget' })
  }
})

/**
 * POST /api/dashboard-config/widgets/:widgetId/toggle
 * Toggle widget visibility
 */
router.post('/widgets/:widgetId/toggle', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const role = req.user!.role as UserRole
    const { widgetId } = req.params

    const config = await dashboardConfigService.toggleWidgetVisibility(
      userId,
      role,
      widgetId
    )
    res.json(config)
  } catch (error: any) {
    console.error('Error toggling widget visibility:', error)
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to toggle widget visibility' })
  }
})

/**
 * POST /api/dashboard-config/reorder
 * Reorder widgets
 */
router.post('/reorder', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const role = req.user!.role as UserRole
    const { widgetOrder } = req.body

    if (!widgetOrder || !Array.isArray(widgetOrder)) {
      return res.status(400).json({ error: 'Invalid widget order array' })
    }

    const config = await dashboardConfigService.reorderWidgets(
      userId,
      role,
      widgetOrder
    )
    res.json(config)
  } catch (error: any) {
    console.error('Error reordering widgets:', error)
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to reorder widgets' })
  }
})

/**
 * POST /api/dashboard-config/widgets
 * Add a widget to the dashboard
 */
router.post('/widgets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const role = req.user!.role as UserRole
    const widgetConfig = req.body

    if (!widgetConfig.widgetId) {
      return res.status(400).json({ error: 'Widget ID is required' })
    }

    const config = await dashboardConfigService.addWidget(
      userId,
      role,
      widgetConfig
    )
    res.json(config)
  } catch (error: any) {
    console.error('Error adding widget:', error)
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to add widget' })
  }
})

/**
 * DELETE /api/dashboard-config/widgets/:widgetId
 * Remove a widget from the dashboard
 */
router.delete('/widgets/:widgetId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const role = req.user!.role as UserRole
    const { widgetId } = req.params

    const config = await dashboardConfigService.removeWidget(
      userId,
      role,
      widgetId
    )
    res.json(config)
  } catch (error: any) {
    console.error('Error removing widget:', error)
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    if (error.message?.includes('core widget')) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: 'Failed to remove widget' })
  }
})

export default router
