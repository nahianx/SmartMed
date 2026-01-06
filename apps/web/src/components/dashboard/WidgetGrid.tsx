/**
 * Widget Grid Component
 * 
 * Main grid container that renders widgets based on user configuration.
 * Supports drag-and-drop reordering in edit mode.
 */

'use client'

import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { WidgetConfig, WidgetSize } from '@/types/widgets'
import { SortableWidget } from './SortableWidget'

interface WidgetGridProps {
  widgets: WidgetConfig[]
  isEditing: boolean
  renderWidget: (widgetId: string, widget: WidgetConfig) => React.ReactNode
  onReorder: (widgets: WidgetConfig[]) => void
  onToggleVisibility: (widgetId: string) => void
  onResize: (widgetId: string, size: WidgetSize) => void
  onRemove: (widgetId: string) => void
}

export function WidgetGrid({
  widgets,
  isEditing,
  renderWidget,
  onReorder,
  onToggleVisibility,
  onResize,
  onRemove,
}: WidgetGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter and sort widgets
  const sortedWidgets = [...widgets]
    .filter(w => isEditing || w.visible)
    .sort((a, b) => a.order - b.order)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedWidgets.findIndex(w => w.widgetId === active.id)
      const newIndex = sortedWidgets.findIndex(w => w.widgetId === over.id)

      const reorderedWidgets = arrayMove(sortedWidgets, oldIndex, newIndex)
      
      // Update order values
      const updatedWidgets = reorderedWidgets.map((widget, index) => ({
        ...widget,
        order: index,
      }))

      onReorder(updatedWidgets)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedWidgets.map(w => w.widgetId)}
        strategy={verticalListSortingStrategy}
        disabled={!isEditing}
      >
        <div className="grid grid-cols-4 gap-4 md:gap-6">
          {sortedWidgets.map(widget => (
            <SortableWidget
              key={widget.widgetId}
              widget={widget}
              isEditing={isEditing}
              onToggleVisibility={onToggleVisibility}
              onResize={onResize}
              onRemove={onRemove}
            >
              {renderWidget(widget.widgetId, widget)}
            </SortableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default WidgetGrid
