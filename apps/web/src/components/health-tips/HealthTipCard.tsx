'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  Heart,
  Apple,
  Dumbbell,
  Brain,
  Moon,
  Pill,
  Shield,
  Activity,
  Sparkles,
  X,
  Check,
  Lightbulb,
} from 'lucide-react'
import { Button, Badge } from '@smartmed/ui'
import type { HealthTip, HealthTipCategory } from './useHealthTips'

interface HealthTipCardProps {
  tip: HealthTip
  onMarkRead?: (id: string) => void
  onArchive?: (id: string) => void
  showActions?: boolean
  compact?: boolean
}

const categoryConfig: Record<
  HealthTipCategory,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  GENERAL_WELLNESS: {
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'General Wellness',
  },
  NUTRITION: {
    icon: Apple,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Nutrition',
  },
  EXERCISE: {
    icon: Dumbbell,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Exercise',
  },
  MENTAL_HEALTH: {
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Mental Health',
  },
  SLEEP: {
    icon: Moon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    label: 'Sleep',
  },
  MEDICATION: {
    icon: Pill,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Medication',
  },
  PREVENTIVE_CARE: {
    icon: Shield,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    label: 'Preventive Care',
  },
  CHRONIC_CONDITION: {
    icon: Activity,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    label: 'Chronic Condition',
  },
  LIFESTYLE: {
    icon: Sparkles,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Lifestyle',
  },
}

export function HealthTipCard({
  tip,
  onMarkRead,
  onArchive,
  showActions = true,
  compact = false,
}: HealthTipCardProps) {
  const config = categoryConfig[tip.category] || categoryConfig.GENERAL_WELLNESS
  const Icon = config.icon
  const isUnread = !tip.isRead

  if (compact) {
    return (
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
          isUnread
            ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800'
            : 'border-border bg-card'
        }`}
      >
        <div className={`p-2 rounded-full ${config.bgColor} shrink-0`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-2">{tip.text}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(tip.createdAt), { addSuffix: true })}
          </p>
        </div>
        {isUnread && (
          <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border shadow-sm transition-all hover:shadow-md ${
        isUnread
          ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-card dark:border-blue-800'
          : 'border-border bg-card'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <Badge variant="secondary" className="text-xs">
                {config.label}
              </Badge>
              {tip.source === 'ML_GENERATED' && (
                <Badge variant="outline" className="ml-2 text-xs">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </div>
          </div>
          {isUnread && (
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
          )}
        </div>

        {/* Content */}
        <div className="mt-4">
          <p className="text-foreground leading-relaxed">{tip.text}</p>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(tip.createdAt), { addSuffix: true })}
          </p>

          {showActions && (
            <div className="flex items-center gap-2">
              {isUnread && onMarkRead && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => onMarkRead(tip.id)}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Mark Read
                </Button>
              )}
              {onArchive && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-red-600"
                  onClick={() => onArchive(tip.id)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Category badge component for filters
export function CategoryBadge({
  category,
  selected,
  onClick,
}: {
  category: HealthTipCategory
  selected?: boolean
  onClick?: () => void
}) {
  const config = categoryConfig[category]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        selected
          ? `${config.bgColor} ${config.color}`
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </button>
  )
}

export { categoryConfig }
