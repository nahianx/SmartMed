'use client'

import { RefreshCw, Sparkles, Lightbulb } from 'lucide-react'
import { Button, ScrollArea } from '@smartmed/ui'
import { HealthTipCard } from './HealthTipCard'
import { useHealthTips } from './useHealthTips'
import { MedicalDisclaimer, AIGeneratedBadge, useDisclaimerAcknowledgment } from './MedicalDisclaimer'

interface HealthTipsListProps {
  maxItems?: number
  showRefresh?: boolean
  showGenerateButton?: boolean
  compact?: boolean
  className?: string
}

export function HealthTipsList({
  maxItems,
  showRefresh = true,
  showGenerateButton = true,
  compact = false,
  className = '',
}: HealthTipsListProps) {
  const {
    tips,
    total,
    loading,
    error,
    generating,
    refresh,
    loadMore,
    generate,
    markRead,
    archive,
    hasMore,
  } = useHealthTips(maxItems || 10)

  const { isAcknowledged } = useDisclaimerAcknowledgment()

  const displayedTips = maxItems ? tips.slice(0, maxItems) : tips
  const unreadCount = tips.filter((t) => !t.isRead).length

  if (loading && tips.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Loading skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border border-border bg-muted animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error && tips.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <RefreshCw className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Unable to load health tips
        </h3>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4 max-w-sm mx-auto">{error}</p>
        <Button onClick={refresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (tips.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <Lightbulb className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No health tips yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          Get personalized health tips based on your medical history and
          preferences.
        </p>
        {showGenerateButton && (
          <Button onClick={generate} disabled={generating}>
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Tips
              </>
            )}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Medical Disclaimer Banner */}
      {tips.length > 0 && !isAcknowledged && (
        <MedicalDisclaimer variant="banner" className="mb-4" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Health Tips</h2>
          <AIGeneratedBadge size="sm" />
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-medium text-white bg-blue-600 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          )}
          {showGenerateButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={generate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate New
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tips list */}
      <div className="space-y-4">
        {displayedTips.map((tip) => (
          <HealthTipCard
            key={tip.id}
            tip={tip}
            onMarkRead={markRead}
            onArchive={archive}
            compact={compact}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && !maxItems && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${total - tips.length} remaining)`
            )}
          </Button>
        </div>
      )}

      {/* Show all link when maxItems is set */}
      {maxItems && tips.length > maxItems && (
        <div className="mt-4 text-center">
          <Button variant="link" className="text-sm">
            View all {total} tips →
          </Button>
        </div>
      )}
    </div>
  )
}

// Compact drawer version for sidebar/panel
export function HealthTipsDrawerContent() {
  const {
    tips,
    loading,
    error,
    generating,
    refresh,
    generate,
    markRead,
    archive,
  } = useHealthTips(20)

  const { isAcknowledged } = useDisclaimerAcknowledgment()

  if (loading && tips.length === 0) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg border border-border bg-muted animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Button size="sm" variant="outline" onClick={refresh}>
          Retry
        </Button>
      </div>
    )
  }

  if (tips.length === 0) {
    return (
      <div className="p-6 text-center">
        <Lightbulb className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 mb-4">No tips available</p>
        <Button size="sm" onClick={generate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Tips'}
        </Button>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {/* Compact disclaimer for drawer */}
        {!isAcknowledged && (
          <MedicalDisclaimer variant="banner" compact className="mb-2" />
        )}
        {tips.map((tip) => (
          <HealthTipCard
            key={tip.id}
            tip={tip}
            onMarkRead={markRead}
            onArchive={archive}
            compact
          />
        ))}
      </div>
    </ScrollArea>
  )
}
