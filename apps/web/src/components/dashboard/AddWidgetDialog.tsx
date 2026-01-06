/**
 * Add Widget Dialog Component
 * 
 * Modal dialog for adding new widgets to the dashboard.
 */

'use client'

import React, { useState } from 'react'
import { X, Search, Plus, Check } from 'lucide-react'
import { WidgetDefinition, WidgetCategory, WidgetConfig } from '@/types/widgets'

interface AddWidgetDialogProps {
  isOpen: boolean
  availableWidgets: WidgetDefinition[]
  currentWidgets: WidgetConfig[]
  onClose: () => void
  onAddWidget: (widgetId: string) => void
}

const categoryLabels: Record<WidgetCategory, string> = {
  appointments: 'Appointments',
  queue: 'Queue Management',
  prescriptions: 'Prescriptions',
  health: 'Health & Wellness',
  activity: 'Activity & Timeline',
  stats: 'Statistics',
  admin: 'Administration',
  general: 'General',
}

const categoryOrder: WidgetCategory[] = [
  'stats',
  'appointments',
  'queue',
  'prescriptions',
  'health',
  'activity',
  'admin',
  'general',
]

export function AddWidgetDialog({
  isOpen,
  availableWidgets,
  currentWidgets,
  onClose,
  onAddWidget,
}: AddWidgetDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all')

  if (!isOpen) return null

  // Get IDs of currently added widgets
  const addedWidgetIds = new Set(currentWidgets.map(w => w.widgetId))

  // Filter widgets by search and category
  const filteredWidgets = availableWidgets.filter(widget => {
    const matchesSearch =
      searchQuery === '' ||
      widget.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory =
      selectedCategory === 'all' || widget.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Group widgets by category
  const widgetsByCategory = categoryOrder.reduce((acc, category) => {
    const widgets = filteredWidgets.filter(w => w.category === category)
    if (widgets.length > 0) {
      acc[category] = widgets
    }
    return acc
  }, {} as Record<WidgetCategory, WidgetDefinition[]>)

  // Get unique categories from available widgets
  const availableCategories = [...new Set(availableWidgets.map(w => w.category))]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add Widget
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search widgets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All
              </button>
              {categoryOrder
                .filter(cat => availableCategories.includes(cat))
                .map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {categoryLabels[category]}
                  </button>
                ))}
            </div>
          </div>

          {/* Widget List */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {Object.keys(widgetsByCategory).length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No widgets found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(widgetsByCategory).map(([category, widgets]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      {categoryLabels[category as WidgetCategory]}
                    </h3>
                    <div className="space-y-2">
                      {widgets.map(widget => {
                        const isAdded = addedWidgetIds.has(widget.id)
                        return (
                          <div
                            key={widget.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isAdded
                                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                {widget.title}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {widget.description}
                              </p>
                            </div>
                            {isAdded ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm ml-4">
                                <Check className="h-4 w-4" />
                                Added
                              </span>
                            ) : (
                              <button
                                onClick={() => onAddWidget(widget.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors ml-4"
                              >
                                <Plus className="h-4 w-4" />
                                Add
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddWidgetDialog
