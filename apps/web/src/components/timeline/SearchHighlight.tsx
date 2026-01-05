/**
 * SearchHighlight Component
 * 
 * Safely renders text with highlighted search matches.
 * Expects text with <mark></mark> tags from PostgreSQL ts_headline.
 */

import React from 'react'

interface SearchHighlightProps {
  /** Text with <mark></mark> tags for highlighted portions */
  text: string
  /** Fallback text to display if highlighted text is not available */
  fallback?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Renders text with search highlights safely.
 * Converts <mark></mark> tags to styled spans.
 */
export function SearchHighlight({ text, fallback, className = '' }: SearchHighlightProps) {
  // If no text or no highlights, show fallback
  if (!text || !text.includes('<mark>')) {
    return <span className={className}>{fallback || text}</span>
  }

  // Parse and render the highlighted text
  // Split by <mark> and </mark> tags
  const parts = text.split(/(<mark>|<\/mark>)/)
  
  let isHighlighted = false
  const elements: React.ReactNode[] = []
  
  parts.forEach((part, index) => {
    if (part === '<mark>') {
      isHighlighted = true
    } else if (part === '</mark>') {
      isHighlighted = false
    } else if (part) {
      elements.push(
        isHighlighted ? (
          <mark key={index} className="bg-yellow-200 px-0.5 rounded-sm font-medium">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )
    }
  })

  return <span className={className}>{elements}</span>
}

/**
 * Hook to check if an activity has search highlights
 */
export function useHasSearchHighlights(activity: {
  highlightedTitle?: string
  highlightedSubtitle?: string
  highlightedNotes?: string
}): boolean {
  return Boolean(
    activity.highlightedTitle?.includes('<mark>') ||
    activity.highlightedSubtitle?.includes('<mark>') ||
    activity.highlightedNotes?.includes('<mark>')
  )
}
