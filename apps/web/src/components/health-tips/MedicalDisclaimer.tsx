'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Info, CheckCircle, X, Bot } from 'lucide-react'
import { Button } from '@smartmed/ui'

interface MedicalDisclaimerProps {
  /** Whether to show the full disclaimer with acknowledgment */
  showAcknowledgment?: boolean
  /** Callback when user acknowledges the disclaimer */
  onAcknowledge?: () => void
  /** Whether the user has already acknowledged (from session/DB) */
  isAcknowledged?: boolean
  /** Variant: 'banner' for top banner, 'card' for inline card, 'modal' for modal */
  variant?: 'banner' | 'card' | 'modal'
  /** Whether this is for AI-generated content */
  isAIGenerated?: boolean
  /** Whether to allow dismissing the banner */
  dismissible?: boolean
  /** Custom class name */
  className?: string
}

const DISCLAIMER_STORAGE_KEY = 'smartmed_health_tips_disclaimer_acknowledged'

/**
 * Medical Disclaimer Component
 * 
 * Displays legally required disclaimers for AI-generated health content.
 * Tracks user acknowledgment to avoid repeated prompts.
 */
export function MedicalDisclaimer({
  showAcknowledgment = false,
  onAcknowledge,
  isAcknowledged: externalAcknowledged,
  variant = 'banner',
  isAIGenerated = true,
  dismissible = false,
  className = '',
}: MedicalDisclaimerProps) {
  const [isAcknowledged, setIsAcknowledged] = useState(externalAcknowledged ?? false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false)

  // Check local storage for previous acknowledgment on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && showAcknowledgment) {
      const stored = localStorage.getItem(DISCLAIMER_STORAGE_KEY)
      if (stored) {
        try {
          const data = JSON.parse(stored)
          // Check if acknowledgment is less than 30 days old
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
          if (data.acknowledgedAt && Date.now() - data.acknowledgedAt < thirtyDaysMs) {
            setIsAcknowledged(true)
          }
        } catch {
          // Invalid stored data, will require re-acknowledgment
        }
      }
    }
  }, [showAcknowledgment])

  // Sync with external acknowledged state
  useEffect(() => {
    if (externalAcknowledged !== undefined) {
      setIsAcknowledged(externalAcknowledged)
    }
  }, [externalAcknowledged])

  const handleAcknowledge = () => {
    setIsAcknowledged(true)
    
    // Store acknowledgment in local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        DISCLAIMER_STORAGE_KEY,
        JSON.stringify({
          acknowledgedAt: Date.now(),
          version: '1.0',
        })
      )
    }
    
    onAcknowledge?.()
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  // Don't render if dismissed (for dismissible variant)
  if (isDismissed && dismissible) {
    return null
  }

  // Banner variant - compact top banner
  if (variant === 'banner') {
    return (
      <div
        className={`rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 ${className}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              {isAIGenerated ? (
                <Bot className="h-4 w-4 text-amber-600" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isAIGenerated && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <Bot className="h-3 w-3 mr-1" />
                  AI-Generated
                </span>
              )}
              <h4 className="text-sm font-semibold text-amber-800">
                Medical Disclaimer
              </h4>
            </div>
            
            <p className="text-sm text-amber-700">
              These health tips are for <strong>informational purposes only</strong> and 
              do not constitute medical advice. Always consult a qualified healthcare 
              professional before making any health-related decisions.
            </p>
            
            {showFullDisclaimer && (
              <div className="mt-3 text-xs text-amber-600 space-y-2 border-t border-amber-200 pt-3">
                <p>
                  <strong>Important:</strong> AI-generated content may not account for your 
                  specific medical history, current medications, or individual health conditions.
                </p>
                <p>
                  • Do not use this information to self-diagnose or self-treat any condition.
                </p>
                <p>
                  • If you experience a medical emergency, call emergency services immediately.
                </p>
                <p>
                  • The accuracy of AI-generated content cannot be guaranteed.
                </p>
              </div>
            )}
            
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => setShowFullDisclaimer(!showFullDisclaimer)}
                className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
              >
                {showFullDisclaimer ? 'Show less' : 'Read full disclaimer'}
              </button>
              
              {showAcknowledgment && !isAcknowledged && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcknowledge}
                  className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  I Understand
                </Button>
              )}
              
              {isAcknowledged && (
                <span className="inline-flex items-center text-xs text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Acknowledged
                </span>
              )}
            </div>
          </div>
          
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-amber-400 hover:text-amber-600 rounded"
              aria-label="Dismiss disclaimer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Card variant - more detailed card format
  if (variant === 'card') {
    return (
      <div
        className={`rounded-xl border-2 border-amber-200 bg-white shadow-sm overflow-hidden ${className}`}
        role="alert"
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Important Medical Disclaimer</h3>
            {isAIGenerated && (
              <span className="ml-auto inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                <Bot className="h-3 w-3 mr-1" />
                AI Content
              </span>
            )}
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                The health tips provided here are generated using artificial intelligence 
                and are intended for <strong>general informational purposes only</strong>.
              </p>
              <p>
                This information <strong>does not constitute medical advice</strong>, 
                diagnosis, or treatment recommendations.
              </p>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-semibold text-amber-800">Please Note:</h4>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Always consult your doctor or healthcare provider before making health decisions</li>
              <li>AI-generated tips may not account for your specific medical conditions</li>
              <li>Never delay seeking professional medical advice based on this information</li>
              <li>In case of emergency, contact emergency services immediately</li>
            </ul>
          </div>
          
          {showAcknowledgment && !isAcknowledged && (
            <div className="border-t border-gray-200 pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  onChange={(e) => e.target.checked && handleAcknowledge()}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-600">
                  I understand that these tips are for informational purposes only and 
                  I will consult a healthcare professional for medical advice.
                </span>
              </label>
            </div>
          )}
          
          {isAcknowledged && (
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg py-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Disclaimer Acknowledged</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Modal variant - for first-time acknowledgment
  if (variant === 'modal') {
    if (isAcknowledged) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          className={`w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden ${className}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
        >
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 id="disclaimer-title" className="text-lg font-bold">
                  Medical Disclaimer
                </h2>
                <p className="text-sm text-white/80">
                  Please read before viewing health tips
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
              <Bot className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">
                  AI-Generated Content
                </h3>
                <p className="text-sm text-amber-700">
                  The health tips you're about to view are generated using artificial 
                  intelligence technology.
                </p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <strong>This information is for educational and informational purposes only</strong> 
                and is not intended to be a substitute for professional medical advice, 
                diagnosis, or treatment.
              </p>
              
              <p>
                Always seek the advice of your physician or other qualified health provider 
                with any questions you may have regarding a medical condition.
              </p>
              
              <p className="text-red-600 font-medium">
                Never disregard professional medical advice or delay in seeking it because 
                of something you have read in these health tips.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">By continuing, you acknowledge:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  These tips do not replace professional medical advice
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  You will consult a healthcare provider for medical concerns
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  AI content may not be accurate for your specific situation
                </li>
              </ul>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAcknowledge}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                I Understand & Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

/**
 * Compact inline AI indicator badge
 */
export function AIGeneratedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 ${className}`}
      title="This content was generated by AI"
    >
      <Bot className="h-3 w-3" />
      AI Generated
    </span>
  )
}

/**
 * Hook to check and manage disclaimer acknowledgment state
 */
export function useDisclaimerAcknowledgment() {
  const [isAcknowledged, setIsAcknowledged] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(DISCLAIMER_STORAGE_KEY)
      if (stored) {
        try {
          const data = JSON.parse(stored)
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
          if (data.acknowledgedAt && Date.now() - data.acknowledgedAt < thirtyDaysMs) {
            setIsAcknowledged(true)
          }
        } catch {
          // Invalid data
        }
      }
      setIsLoading(false)
    }
  }, [])

  const acknowledge = () => {
    setIsAcknowledged(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        DISCLAIMER_STORAGE_KEY,
        JSON.stringify({
          acknowledgedAt: Date.now(),
          version: '1.0',
        })
      )
    }
  }

  const reset = () => {
    setIsAcknowledged(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DISCLAIMER_STORAGE_KEY)
    }
  }

  return { isAcknowledged, isLoading, acknowledge, reset }
}

export default MedicalDisclaimer
