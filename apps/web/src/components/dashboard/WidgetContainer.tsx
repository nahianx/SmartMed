/**
 * Widget Container Component
 * 
 * A reusable container that wraps each dashboard widget.
 * Provides consistent styling, drag handle, and widget controls.
 */

'use client'

import React, { ReactNode } from 'react'
import { WidgetConfig, WidgetSize } from '@/types/widgets'
import {
  GripVertical,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  X,
  Settings,
} from 'lucide-react'

interface WidgetContainerProps {
  widget: WidgetConfig
  widgetTitle: string
  widgetIcon?: ReactNode
  isEditing: boolean
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  children: ReactNode
  onToggleVisibility?: (widgetId: string) => void
  onResize?: (widgetId: string, size: WidgetSize) => void
  onRemove?: (widgetId: string) => void
  onSettings?: (widgetId: string) => void
  removable?: boolean
}

const sizeClasses: Record<WidgetSize, string> = {
  small: 'col-span-1',
  medium: 'col-span-2',
  large: 'col-span-3',
  full: 'col-span-4',
}

export function WidgetContainer({
  widget,
  widgetTitle,
  widgetIcon,
  isEditing,
  isDragging = false,
  dragHandleProps,
  children,
  onToggleVisibility,
  onResize,
  onRemove,
  onSettings,
  removable = true,
}: WidgetContainerProps) {
  const colSpan = widget.colSpan ?? 1
  const colSpanClass = `col-span-${Math.min(colSpan, 4)}`

  // Helper to cycle through sizes
  const handleResize = () => {
    if (!onResize) return
    const sizes: WidgetSize[] = ['small', 'medium', 'large', 'full']
    const currentIndex = sizes.indexOf(widget.size)
    const nextIndex = (currentIndex + 1) % sizes.length
    onResize(widget.widgetId, sizes[nextIndex])
  }

  // If widget is hidden in view mode, don't render
  if (!widget.visible && !isEditing) {
    return null
  }

  return (
    <div
      className={`
        ${sizeClasses[widget.size] || colSpanClass}
        ${isDragging ? 'opacity-50' : ''}
        ${!widget.visible ? 'opacity-40' : ''}
        transition-all duration-200
      `}
    >
      <div
        className={`
          bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
          ${isEditing ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          ${isDragging ? 'shadow-lg' : ''}
          h-full flex flex-col
          overflow-hidden
        `}
      >
        {/* Widget Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {/* Drag Handle - only show in edit mode */}
            {isEditing && (
              <div
                {...dragHandleProps}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            
            {/* Widget Icon */}
            {widgetIcon && (
              <span className="text-blue-600 dark:text-blue-400">
                {widgetIcon}
              </span>
            )}
            
            {/* Widget Title */}
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {widgetTitle}
            </h3>
          </div>

          {/* Widget Controls - only in edit mode */}
          {isEditing && (
            <div className="flex items-center gap-1">
              {/* Visibility Toggle */}
              <button
                onClick={() => onToggleVisibility?.(widget.widgetId)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title={widget.visible ? 'Hide widget' : 'Show widget'}
              >
                {widget.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>

              {/* Resize Toggle */}
              <button
                onClick={handleResize}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Resize widget"
              >
                {widget.size === 'full' ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>

              {/* Settings (if available) */}
              {onSettings && (
                <button
                  onClick={() => onSettings(widget.widgetId)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Widget settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}

              {/* Remove Button */}
              {removable && (
                <button
                  onClick={() => onRemove?.(widget.widgetId)}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Remove widget"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Widget Content */}
        <div className="flex-1 p-4 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default WidgetContainer
