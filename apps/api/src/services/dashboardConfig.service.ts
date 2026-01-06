/**
 * Dashboard Configuration Service
 * 
 * Handles CRUD operations for user dashboard configurations.
 */

import { prisma } from '@smartmed/database'
import { UserRole } from '@smartmed/types'

export interface WidgetConfig {
  widgetId: string
  order: number
  visible: boolean
  size: 'small' | 'medium' | 'large' | 'full'
  colSpan?: number
  rowSpan?: number
  settings?: Record<string, unknown>
}

export interface DashboardConfigInput {
  widgets: WidgetConfig[]
  layout?: Record<string, unknown>
}

export interface DashboardConfigResponse {
  id: string
  userId: string
  role: UserRole
  widgets: WidgetConfig[]
  layout: Record<string, unknown> | null
  version: number
  createdAt: Date
  updatedAt: Date
}

// Default layouts by role
const DEFAULT_PATIENT_WIDGETS: WidgetConfig[] = [
  { widgetId: 'patient-status-cards', order: 0, visible: true, size: 'full', colSpan: 4 },
  { widgetId: 'patient-queue-tracker', order: 1, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'patient-doctor-availability', order: 2, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'patient-upcoming-appointments', order: 3, visible: true, size: 'large', colSpan: 2 },
  { widgetId: 'patient-recent-prescriptions', order: 4, visible: true, size: 'medium', colSpan: 1 },
  { widgetId: 'patient-health-tips', order: 5, visible: true, size: 'medium', colSpan: 1 },
  { widgetId: 'patient-activity-timeline', order: 6, visible: true, size: 'large', colSpan: 4 },
]

const DEFAULT_DOCTOR_WIDGETS: WidgetConfig[] = [
  { widgetId: 'doctor-stats', order: 0, visible: true, size: 'full', colSpan: 4 },
  { widgetId: 'doctor-queue-panel', order: 1, visible: true, size: 'large', colSpan: 2 },
  { widgetId: 'doctor-appointments', order: 2, visible: true, size: 'large', colSpan: 2 },
  { widgetId: 'doctor-recent-prescriptions', order: 3, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'doctor-notifications', order: 4, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'doctor-activity-timeline', order: 5, visible: true, size: 'large', colSpan: 4 },
]

const DEFAULT_ADMIN_WIDGETS: WidgetConfig[] = [
  { widgetId: 'admin-management-cards', order: 0, visible: true, size: 'full', colSpan: 4 },
  { widgetId: 'admin-user-stats', order: 1, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'admin-appointment-stats', order: 2, visible: true, size: 'medium', colSpan: 2 },
  { widgetId: 'admin-recent-activity', order: 3, visible: true, size: 'large', colSpan: 2 },
  { widgetId: 'admin-audit-logs', order: 4, visible: true, size: 'large', colSpan: 2 },
]

function getDefaultWidgets(role: UserRole): WidgetConfig[] {
  switch (role) {
    case 'PATIENT':
      return [...DEFAULT_PATIENT_WIDGETS]
    case 'DOCTOR':
      return [...DEFAULT_DOCTOR_WIDGETS]
    case 'ADMIN':
      return [...DEFAULT_ADMIN_WIDGETS]
    case 'NURSE':
      // Nurses use a subset of doctor widgets
      return DEFAULT_DOCTOR_WIDGETS.filter(w =>
        ['doctor-queue-panel', 'doctor-appointments', 'doctor-stats'].includes(w.widgetId)
      )
    default:
      return []
  }
}

export const dashboardConfigService = {
  /**
   * Get dashboard configuration for a user
   * Creates default config if none exists
   */
  async getConfig(userId: string, role: UserRole): Promise<DashboardConfigResponse> {
    let config = await prisma.dashboardConfig.findUnique({
      where: { userId },
    })

    if (!config) {
      // Create default config for user
      config = await prisma.dashboardConfig.create({
        data: {
          userId,
          role,
          widgets: getDefaultWidgets(role) as unknown as any,
          version: 1,
        },
      })
    }

    return {
      id: config.id,
      userId: config.userId,
      role: config.role as UserRole,
      widgets: config.widgets as unknown as WidgetConfig[],
      layout: config.layout as Record<string, unknown> | null,
      version: config.version,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  },

  /**
   * Update dashboard configuration
   */
  async updateConfig(
    userId: string,
    role: UserRole,
    data: DashboardConfigInput
  ): Promise<DashboardConfigResponse> {
    // Validate widgets before saving
    const validatedWidgets = validateWidgets(data.widgets, role)

    const config = await prisma.dashboardConfig.upsert({
      where: { userId },
      update: {
        widgets: validatedWidgets as unknown as any,
        layout: data.layout as unknown as any,
        updatedAt: new Date(),
      },
      create: {
        userId,
        role,
        widgets: validatedWidgets as unknown as any,
        layout: data.layout as unknown as any,
        version: 1,
      },
    })

    return {
      id: config.id,
      userId: config.userId,
      role: config.role as UserRole,
      widgets: config.widgets as unknown as WidgetConfig[],
      layout: config.layout as Record<string, unknown> | null,
      version: config.version,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  },

  /**
   * Reset dashboard to default configuration
   */
  async resetToDefault(userId: string, role: UserRole): Promise<DashboardConfigResponse> {
    const defaultWidgets = getDefaultWidgets(role)

    const config = await prisma.dashboardConfig.upsert({
      where: { userId },
      update: {
        widgets: defaultWidgets as unknown as any,
        layout: null,
        updatedAt: new Date(),
      },
      create: {
        userId,
        role,
        widgets: defaultWidgets as unknown as any,
        version: 1,
      },
    })

    return {
      id: config.id,
      userId: config.userId,
      role: config.role as UserRole,
      widgets: config.widgets as unknown as WidgetConfig[],
      layout: config.layout as Record<string, unknown> | null,
      version: config.version,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  },

  /**
   * Update a single widget's configuration
   */
  async updateWidget(
    userId: string,
    role: UserRole,
    widgetId: string,
    updates: Partial<WidgetConfig>
  ): Promise<DashboardConfigResponse> {
    const config = await this.getConfig(userId, role)
    
    const widgetIndex = config.widgets.findIndex(w => w.widgetId === widgetId)
    if (widgetIndex === -1) {
      throw new Error(`Widget ${widgetId} not found in configuration`)
    }

    const updatedWidgets = [...config.widgets]
    updatedWidgets[widgetIndex] = {
      ...updatedWidgets[widgetIndex],
      ...updates,
    }

    return this.updateConfig(userId, role, {
      widgets: updatedWidgets,
      layout: config.layout ?? undefined,
    })
  },

  /**
   * Toggle widget visibility
   */
  async toggleWidgetVisibility(
    userId: string,
    role: UserRole,
    widgetId: string
  ): Promise<DashboardConfigResponse> {
    const config = await this.getConfig(userId, role)
    
    const widget = config.widgets.find(w => w.widgetId === widgetId)
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found in configuration`)
    }

    return this.updateWidget(userId, role, widgetId, {
      visible: !widget.visible,
    })
  },

  /**
   * Reorder widgets
   */
  async reorderWidgets(
    userId: string,
    role: UserRole,
    widgetOrder: string[]
  ): Promise<DashboardConfigResponse> {
    const config = await this.getConfig(userId, role)
    
    // Create a map of current widgets
    const widgetMap = new Map(config.widgets.map(w => [w.widgetId, w]))
    
    // Reorder based on new order array
    const reorderedWidgets = widgetOrder.map((widgetId, index) => {
      const widget = widgetMap.get(widgetId)
      if (!widget) {
        throw new Error(`Widget ${widgetId} not found in configuration`)
      }
      return {
        ...widget,
        order: index,
      }
    })

    // Add any widgets not in the order array at the end
    config.widgets.forEach(widget => {
      if (!widgetOrder.includes(widget.widgetId)) {
        reorderedWidgets.push({
          ...widget,
          order: reorderedWidgets.length,
        })
      }
    })

    return this.updateConfig(userId, role, {
      widgets: reorderedWidgets,
      layout: config.layout ?? undefined,
    })
  },

  /**
   * Add a widget to the dashboard
   */
  async addWidget(
    userId: string,
    role: UserRole,
    widgetConfig: WidgetConfig
  ): Promise<DashboardConfigResponse> {
    const config = await this.getConfig(userId, role)
    
    // Check if widget already exists
    if (config.widgets.find(w => w.widgetId === widgetConfig.widgetId)) {
      throw new Error(`Widget ${widgetConfig.widgetId} already exists in configuration`)
    }

    const newWidgets = [
      ...config.widgets,
      {
        ...widgetConfig,
        order: config.widgets.length,
      },
    ]

    return this.updateConfig(userId, role, {
      widgets: newWidgets,
      layout: config.layout ?? undefined,
    })
  },

  /**
   * Remove a widget from the dashboard
   */
  async removeWidget(
    userId: string,
    role: UserRole,
    widgetId: string
  ): Promise<DashboardConfigResponse> {
    const config = await this.getConfig(userId, role)
    
    const widget = config.widgets.find(w => w.widgetId === widgetId)
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found in configuration`)
    }

    // Check if widget is removable (some core widgets cannot be removed)
    const coreWidgets = [
      'patient-status-cards',
      'doctor-stats',
      'admin-management-cards',
    ]
    if (coreWidgets.includes(widgetId)) {
      throw new Error(`Widget ${widgetId} is a core widget and cannot be removed`)
    }

    const filteredWidgets = config.widgets
      .filter(w => w.widgetId !== widgetId)
      .map((w, index) => ({ ...w, order: index }))

    return this.updateConfig(userId, role, {
      widgets: filteredWidgets,
      layout: config.layout ?? undefined,
    })
  },
}

/**
 * Validate widget configurations
 */
function validateWidgets(widgets: WidgetConfig[], role: UserRole): WidgetConfig[] {
  // Ensure all required fields are present
  return widgets.map((widget, index) => ({
    widgetId: widget.widgetId,
    order: widget.order ?? index,
    visible: widget.visible ?? true,
    size: widget.size ?? 'medium',
    colSpan: widget.colSpan ?? 1,
    rowSpan: widget.rowSpan,
    settings: widget.settings,
  }))
}

export default dashboardConfigService
