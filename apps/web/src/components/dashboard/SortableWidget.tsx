/**
 * Sortable Widget Component
 * 
 * Wraps WidgetContainer with drag-and-drop functionality using @dnd-kit.
 */

'use client'

import React, { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { WidgetConfig, WidgetSize } from '@/types/widgets'

interface SortableWidgetProps {
  widget: WidgetConfig
  isEditing: boolean
  children: ReactNode
  onToggleVisibility: (widgetId: string) => void
  onResize: (widgetId: string, size: WidgetSize) => void
  onRemove: (widgetId: string) => void
}

const sizeClasses: Record<WidgetSize, string> = {
  small: 'col-span-4 sm:col-span-2 md:col-span-1',
  medium: 'col-span-4 sm:col-span-2',
  large: 'col-span-4 md:col-span-3',
  full: 'col-span-4',
}

export function SortableWidget({
  widget,
  isEditing,
  children,
  onToggleVisibility,
  onResize,
  onRemove,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.widgetId,
    disabled: !isEditing,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // If widget is hidden in view mode, don't render
  if (!widget.visible && !isEditing) {
    return null
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${sizeClasses[widget.size]}
        ${isDragging ? 'z-50' : ''}
        ${!widget.visible ? 'opacity-50' : ''}
        transition-opacity duration-200
      `}
    >
      <div
        className={`
          h-full
          ${isDragging ? 'shadow-2xl ring-2 ring-blue-500' : ''}
          ${isEditing ? 'cursor-move' : ''}
        `}
        {...(isEditing ? { ...attributes, ...listeners } : {})}
      >
        {children}
      </div>
    </div>
  )
}

export default SortableWidget
