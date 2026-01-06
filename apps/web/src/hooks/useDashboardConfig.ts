/**
 * useDashboardConfig Hook
 * 
 * Custom hook for managing dashboard configuration state and API interactions.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { WidgetConfig, WidgetSize, DashboardLayout } from '@/types/widgets'
import { useAuthContext } from '@/context/AuthContext'
import { apiClient } from '@/services/apiClient'

interface UseDashboardConfigOptions {
  /** Initial widgets to use while loading */
  fallbackWidgets?: WidgetConfig[]
}

interface UseDashboardConfigReturn {
  /** Current widget configurations */
  widgets: WidgetConfig[]
  /** Whether config is being loaded */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Whether in edit mode */
  isEditing: boolean
  /** Whether there are unsaved changes */
  hasChanges: boolean
  /** Whether currently saving */
  isSaving: boolean
  /** Toggle edit mode */
  setEditing: (editing: boolean) => void
  /** Update all widgets */
  updateWidgets: (widgets: WidgetConfig[]) => void
  /** Toggle widget visibility */
  toggleVisibility: (widgetId: string) => void
  /** Resize a widget */
  resizeWidget: (widgetId: string, size: WidgetSize) => void
  /** Remove a widget */
  removeWidget: (widgetId: string) => void
  /** Add a widget */
  addWidget: (widgetId: string) => void
  /** Reorder widgets */
  reorderWidgets: (widgets: WidgetConfig[]) => void
  /** Save changes to server */
  saveChanges: () => Promise<void>
  /** Cancel changes and exit edit mode */
  cancelChanges: () => void
  /** Reset to default layout */
  resetToDefault: () => Promise<void>
  /** Get number of hidden widgets */
  hiddenWidgetCount: number
}

export function useDashboardConfig(
  options: UseDashboardConfigOptions = {}
): UseDashboardConfigReturn {
  const { fallbackWidgets = [] } = options
  const { isAuthenticated } = useAuthContext()

  // Server-synced state
  const [serverWidgets, setServerWidgets] = useState<WidgetConfig[]>(fallbackWidgets)
  
  // Local editing state
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(fallbackWidgets)
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load config from server
  const loadConfig = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const response = await apiClient.get('/dashboard-config')
      const data = response.data as DashboardLayout
      setServerWidgets(data.widgets)
      setLocalWidgets(data.widgets)
    } catch (err: any) {
      console.error('Failed to load dashboard config:', err)
      // Use fallback on error but don't show error to user
      // They can still use the dashboard with defaults
      if (fallbackWidgets.length > 0) {
        setServerWidgets(fallbackWidgets)
        setLocalWidgets(fallbackWidgets)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, fallbackWidgets])

  // Load on mount
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Check for unsaved changes
  const hasChanges = JSON.stringify(localWidgets) !== JSON.stringify(serverWidgets)

  // Get count of hidden widgets
  const hiddenWidgetCount = localWidgets.filter(w => !w.visible).length

  // Toggle edit mode
  const setEditing = useCallback((editing: boolean) => {
    if (!editing && hasChanges) {
      // Reset to server state when exiting without saving
      setLocalWidgets(serverWidgets)
    }
    setIsEditing(editing)
  }, [hasChanges, serverWidgets])

  // Update all widgets (for drag-and-drop reorder)
  const updateWidgets = useCallback((widgets: WidgetConfig[]) => {
    setLocalWidgets(widgets)
  }, [])

  // Toggle widget visibility
  const toggleVisibility = useCallback((widgetId: string) => {
    setLocalWidgets(prev =>
      prev.map(w =>
        w.widgetId === widgetId ? { ...w, visible: !w.visible } : w
      )
    )
  }, [])

  // Resize widget
  const resizeWidget = useCallback((widgetId: string, size: WidgetSize) => {
    setLocalWidgets(prev =>
      prev.map(w =>
        w.widgetId === widgetId ? { ...w, size } : w
      )
    )
  }, [])

  // Remove widget
  const removeWidget = useCallback((widgetId: string) => {
    setLocalWidgets(prev => {
      const filtered = prev.filter(w => w.widgetId !== widgetId)
      // Update order values
      return filtered.map((w, index) => ({ ...w, order: index }))
    })
  }, [])

  // Add widget
  const addWidget = useCallback((widgetId: string) => {
    setLocalWidgets(prev => {
      // Check if already exists
      if (prev.find(w => w.widgetId === widgetId)) {
        return prev
      }
      // Add new widget at the end
      return [
        ...prev,
        {
          widgetId,
          order: prev.length,
          visible: true,
          size: 'medium' as WidgetSize,
          colSpan: 2,
        },
      ]
    })
  }, [])

  // Reorder widgets
  const reorderWidgets = useCallback((widgets: WidgetConfig[]) => {
    setLocalWidgets(widgets)
  }, [])

  // Save changes to server
  const saveChanges = useCallback(async () => {
    try {
      setIsSaving(true)
      setError(null)
      await apiClient.put('/dashboard-config', {
        widgets: localWidgets,
      })
      setServerWidgets(localWidgets)
      setIsEditing(false)
    } catch (err: any) {
      console.error('Failed to save dashboard config:', err)
      setError('Failed to save changes. Please try again.')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [localWidgets])

  // Cancel changes
  const cancelChanges = useCallback(() => {
    setLocalWidgets(serverWidgets)
    setIsEditing(false)
    setError(null)
  }, [serverWidgets])

  // Reset to default
  const resetToDefault = useCallback(async () => {
    try {
      setIsSaving(true)
      setError(null)
      const response = await apiClient.post('/dashboard-config/reset')
      const data = response.data as DashboardLayout
      setServerWidgets(data.widgets)
      setLocalWidgets(data.widgets)
    } catch (err: any) {
      console.error('Failed to reset dashboard config:', err)
      setError('Failed to reset dashboard. Please try again.')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  return {
    widgets: localWidgets,
    isLoading,
    error,
    isEditing,
    hasChanges,
    isSaving,
    setEditing,
    updateWidgets,
    toggleVisibility,
    resizeWidget,
    removeWidget,
    addWidget,
    reorderWidgets,
    saveChanges,
    cancelChanges,
    resetToDefault,
    hiddenWidgetCount,
  }
}

export default useDashboardConfig
