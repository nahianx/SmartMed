/**
 * Dashboard Edit Bar Component
 * 
 * Control bar for entering/exiting edit mode and managing dashboard layout.
 */

'use client'

import React from 'react'
import {
  Settings,
  Save,
  X,
  RotateCcw,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react'

interface DashboardEditBarProps {
  isEditing: boolean
  hasChanges: boolean
  isSaving: boolean
  onEditToggle: () => void
  onSave: () => void
  onCancel: () => void
  onReset: () => void
  onAddWidget: () => void
  hiddenWidgetCount?: number
}

export function DashboardEditBar({
  isEditing,
  hasChanges,
  isSaving,
  onEditToggle,
  onSave,
  onCancel,
  onReset,
  onAddWidget,
  hiddenWidgetCount = 0,
}: DashboardEditBarProps) {
  if (!isEditing) {
    // View mode - show customize button
    return (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          {hiddenWidgetCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-full">
              <EyeOff className="h-3 w-3" />
              {hiddenWidgetCount} hidden
            </span>
          )}
        </div>
        <button
          onClick={onEditToggle}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <Settings className="h-4 w-4" />
          Customize
        </button>
      </div>
    )
  }

  // Edit mode - show full control bar
  return (
    <div className="sticky top-0 z-40 -mx-4 px-4 py-3 mb-6 bg-blue-50 dark:bg-blue-900/20 border-y border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Customizing Dashboard
            </span>
          </div>
          <span className="text-sm text-blue-600 dark:text-blue-300">
            Drag widgets to reorder • Click icons to resize or hide
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Widget Button */}
          <button
            onClick={onAddWidget}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-800/50 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Widget
          </button>

          {/* Reset to Default */}
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1" />

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className={`
              inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${
                hasChanges && !isSaving
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-muted-foreground bg-muted cursor-not-allowed'
              }
            `}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DashboardEditBar
