'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { X, ChevronLeft, ChevronRight, Play, SkipForward, CheckCircle2 } from 'lucide-react'
import { 
  TourStep, 
  Tour, 
  getTourForRole, 
  hasCompletedTour, 
  markTourCompleted,
  resetTourCompletion 
} from '../../config/onboardingTours'

// ============================================================================
// CONTEXT
// ============================================================================

interface OnboardingContextType {
  isActive: boolean
  currentStep: number
  totalSteps: number
  startTour: (forceRestart?: boolean) => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  restartTour: () => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}

// ============================================================================
// PROVIDER
// ============================================================================

interface OnboardingProviderProps {
  children: ReactNode
  userRole?: string
  autoStart?: boolean
  delayMs?: number
}

export function OnboardingProvider({
  children,
  userRole,
  autoStart = true,
  delayMs = 1000,
}: OnboardingProviderProps) {
  const [tour, setTour] = useState<Tour | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)

  // Initialize tour based on role
  useEffect(() => {
    if (userRole) {
      const roleTour = getTourForRole(userRole)
      setTour(roleTour)
    }
  }, [userRole])

  // Auto-start tour for new users
  useEffect(() => {
    if (autoStart && tour && !hasCompletedTour(tour.id)) {
      const timer = setTimeout(() => {
        setIsActive(true)
      }, delayMs)
      return () => clearTimeout(timer)
    }
  }, [autoStart, tour, delayMs])

  // Highlight management
  useEffect(() => {
    if (!isActive || !tour) {
      // Remove any existing highlights
      highlightedElement?.classList.remove('tour-highlighted')
      setHighlightedElement(null)
      return
    }

    const step = tour.steps[currentStep]
    if (!step || step.target === 'body') {
      highlightedElement?.classList.remove('tour-highlighted')
      setHighlightedElement(null)
      return
    }

    // Find and highlight element
    const element = document.querySelector<HTMLElement>(step.target)
    if (element) {
      highlightedElement?.classList.remove('tour-highlighted')
      element.classList.add('tour-highlighted')
      setHighlightedElement(element)

      // Scroll element into view
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    return () => {
      element?.classList.remove('tour-highlighted')
    }
  }, [isActive, currentStep, tour, highlightedElement])

  const startTour = useCallback((forceRestart = false) => {
    if (tour) {
      if (forceRestart) {
        resetTourCompletion(tour.id)
      }
      setCurrentStep(0)
      setIsActive(true)
    }
  }, [tour])

  const endTour = useCallback(() => {
    if (tour) {
      markTourCompleted(tour.id)
    }
    setIsActive(false)
    setCurrentStep(0)
  }, [tour])

  const nextStep = useCallback(() => {
    if (!tour) return
    
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      endTour()
    }
  }, [tour, currentStep, endTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const skipTour = useCallback(() => {
    if (tour) {
      markTourCompleted(tour.id)
    }
    setIsActive(false)
    setCurrentStep(0)
  }, [tour])

  const restartTour = useCallback(() => {
    startTour(true)
  }, [startTour])

  const contextValue: OnboardingContextType = {
    isActive,
    currentStep,
    totalSteps: tour?.steps.length || 0,
    startTour,
    endTour,
    nextStep,
    prevStep,
    skipTour,
    restartTour,
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      {isActive && tour && (
        <TourOverlay
          tour={tour}
          currentStep={currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onClose={endTour}
        />
      )}
    </OnboardingContext.Provider>
  )
}

// ============================================================================
// TOUR OVERLAY COMPONENT
// ============================================================================

interface TourOverlayProps {
  tour: Tour
  currentStep: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onClose: () => void
}

function TourOverlay({
  tour,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onClose,
}: TourOverlayProps) {
  const step = tour.steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === tour.steps.length - 1
  const isCenterStep = step?.placement === 'center' || step?.target === 'body'

  // Calculate tooltip position
  const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })

  useEffect(() => {
    if (isCenterStep || !step) {
      setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      return
    }

    const element = document.querySelector<HTMLElement>(step.target)
    if (!element) {
      setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      return
    }

    const rect = element.getBoundingClientRect()
    const tooltipWidth = 360
    const tooltipHeight = 200 // Approximate
    const padding = 16

    let top = 0
    let left = 0
    let transform = ''

    switch (step.placement) {
      case 'top':
        top = rect.top - tooltipHeight - padding
        left = rect.left + rect.width / 2
        transform = 'translateX(-50%)'
        break
      case 'bottom':
        top = rect.bottom + padding
        left = rect.left + rect.width / 2
        transform = 'translateX(-50%)'
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - tooltipWidth - padding
        transform = 'translateY(-50%)'
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + padding
        transform = 'translateY(-50%)'
        break
      default:
        top = rect.bottom + padding
        left = rect.left + rect.width / 2
        transform = 'translateX(-50%)'
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    if (left < padding) left = padding
    if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding
      transform = ''
    }
    if (top < padding) top = padding
    if (top + tooltipHeight > viewportHeight - padding) {
      top = viewportHeight - tooltipHeight - padding
    }

    setPosition({ top: `${top}px`, left: `${left}px`, transform })
  }, [step, isCenterStep])

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/60 transition-opacity"
        onClick={onSkip}
      />

      {/* Tooltip Card */}
      <div
        className="fixed z-[9999] w-[360px] bg-card rounded-xl shadow-2xl overflow-hidden"
        style={{ top: position.top, left: position.left, transform: position.transform }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">
              Step {currentStep + 1} of {tour.steps.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close tour"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {step?.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {step?.content}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tour.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted border-t border-border">
          <button
            onClick={onSkip}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="h-4 w-4" />
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-foreground hover:bg-muted/80 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CSS for highlighted elements */}
      <style jsx global>{`
        .tour-highlighted {
          position: relative;
          z-index: 9997 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5);
          border-radius: 8px;
        }
      `}</style>
    </>
  )
}

// ============================================================================
// RESTART TOUR BUTTON (for use in settings/profile)
// ============================================================================

interface RestartTourButtonProps {
  className?: string
}

export function RestartTourButton({ className = '' }: RestartTourButtonProps) {
  const { startTour, isActive } = useOnboarding()

  if (isActive) return null

  return (
    <button
      onClick={() => startTour(true)}
      className={`flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors ${className}`}
    >
      <Play className="h-4 w-4" />
      Restart guided tour
    </button>
  )
}
