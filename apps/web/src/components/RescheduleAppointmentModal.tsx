'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, Loader2, RefreshCw, Info } from 'lucide-react'
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns'
import { appointmentService, Appointment } from '../services/appointmentService'

interface RescheduleAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  appointment: Appointment
}

interface AvailableSlot {
  date: string
  time: string
  dateTime: string
}

type GroupedSlots = Record<string, AvailableSlot[]>

export default function RescheduleAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  appointment,
}: RescheduleAppointmentModalProps) {
  const [step, setStep] = useState(1) // 1 = select slot, 2 = confirm
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [reason, setReason] = useState('')
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [rules, setRules] = useState<{ maxReschedules: number; minHoursBeforeReschedule: number } | null>(null)
  const [rescheduleInfo, setRescheduleInfo] = useState<{
    rescheduleCount: number
    remainingReschedules: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Date navigation
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const lastFocused = useRef<HTMLElement | null>(null)

  // Group slots by date
  const groupedSlots: GroupedSlots = availableSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = []
    }
    acc[slot.date].push(slot)
    return acc
  }, {} as GroupedSlots)

  // Get unique dates
  const availableDates = Object.keys(groupedSlots).sort()

  // Get slots for selected date
  const slotsForSelectedDate = selectedDate 
    ? groupedSlots[format(selectedDate, 'yyyy-MM-dd')] || []
    : []

  // Load available slots
  const loadSlots = useCallback(async () => {
    if (!appointment?.id) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const endDate = addDays(startDate, 14)
      const data = await appointmentService.getRescheduleSlots(appointment.id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      
      setAvailableSlots(data.availableSlots)
      setRules(data.rules)
      
      // Also get reschedule history to know remaining reschedules
      const historyData = await appointmentService.getRescheduleHistory(appointment.id)
      setRescheduleInfo({
        rescheduleCount: historyData.rescheduleCount,
        remainingReschedules: historyData.remainingReschedules,
      })
      
      // Auto-select first available date
      if (data.availableSlots.length > 0 && !selectedDate) {
        const firstDate = parseISO(data.availableSlots[0].date)
        setSelectedDate(firstDate)
      }
    } catch (err: unknown) {
      console.error('Failed to load slots:', err)
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load available slots'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [appointment?.id, startDate, selectedDate])

  useEffect(() => {
    if (isOpen && appointment?.id) {
      loadSlots()
    }
  }, [isOpen, appointment?.id, loadSlots])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      lastFocused.current = document.activeElement as HTMLElement
      const first = dialogRef.current?.querySelector<HTMLElement>('input, button, textarea, select')
      first?.focus()
    } else {
      lastFocused.current?.focus()
      // Reset state on close
      setStep(1)
      setSelectedSlot(null)
      setReason('')
      setError(null)
      setSelectedDate(null)
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return
    
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const handleSelectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot)
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
    setSelectedSlot(null)
  }

  const handleSubmit = async () => {
    if (!selectedSlot) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      await appointmentService.rescheduleAppointment(
        appointment.id,
        selectedSlot.dateTime,
        reason || undefined
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      console.error('Failed to reschedule:', err)
      const errorMessage = err instanceof Error 
        ? err.message 
        : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reschedule appointment'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = direction === 'next' 
      ? addDays(startDate, 7)
      : addDays(startDate, -7)
    
    // Don't allow navigating to past
    if (direction === 'prev' && newStart < startOfDay(new Date())) {
      setStartDate(startOfDay(new Date()))
    } else {
      setStartDate(newStart)
    }
  }

  // Generate week days for calendar header
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className="relative bg-card rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 id="reschedule-modal-title" className="text-lg font-semibold">
              {step === 1 ? 'Reschedule Appointment' : 'Confirm Reschedule'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Current Appointment Info */}
        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Info className="h-4 w-4" />
            <span>
              Current appointment: <strong>{format(new Date(appointment.dateTime), 'MMMM d, yyyy')} at {format(new Date(appointment.dateTime), 'h:mm a')}</strong>
              {appointment.doctor && (
                <> with <strong>Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}</strong></>
              )}
            </span>
          </div>
          {rescheduleInfo && (
            <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              {rescheduleInfo.remainingReschedules} reschedule{rescheduleInfo.remainingReschedules !== 1 ? 's' : ''} remaining
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
              <p className="text-muted-foreground">Loading available slots...</p>
            </div>
          ) : step === 1 ? (
            <>
              {/* Date Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateWeek('prev')}
                  disabled={startOfDay(startDate) <= startOfDay(new Date())}
                  className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-medium">
                  {format(startDate, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => navigateWeek('next')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Week Calendar */}
              <div className="grid grid-cols-7 gap-1 mb-6">
                {weekDays.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const hasSlots = availableDates.includes(dateStr)
                  const isSelected = selectedDate && isSameDay(date, selectedDate)
                  const isPast = date < startOfDay(new Date())

                  return (
                    <button
                      key={dateStr}
                      onClick={() => hasSlots && !isPast && setSelectedDate(date)}
                      disabled={!hasSlots || isPast}
                      className={`
                        flex flex-col items-center py-3 px-2 rounded-lg transition-colors
                        ${isSelected 
                          ? 'bg-blue-600 text-white' 
                          : hasSlots && !isPast
                            ? 'hover:bg-blue-50 dark:hover:bg-blue-950/30 text-foreground'
                            : 'text-muted-foreground/30 cursor-not-allowed'
                        }
                      `}
                    >
                      <span className="text-xs font-medium uppercase">
                        {format(date, 'EEE')}
                      </span>
                      <span className="text-lg font-semibold mt-1">
                        {format(date, 'd')}
                      </span>
                      {hasSlots && !isPast && (
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                          isSelected ? 'bg-white' : 'bg-green-500'
                        }`} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <>
                  <h3 className="font-medium mb-3">
                    Available times for {format(selectedDate, 'MMMM d, yyyy')}
                  </h3>
                  {slotsForSelectedDate.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slotsForSelectedDate.map((slot) => (
                        <button
                          key={slot.dateTime}
                          onClick={() => handleSelectSlot(slot)}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{slot.time}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No available slots for this date
                    </p>
                  )}
                </>
              )}

              {!selectedDate && availableDates.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No available slots found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try selecting a different date range
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Step 2: Confirm */
            <div className="space-y-6">
              {/* Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Current</h4>
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(appointment.dateTime), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-foreground mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(appointment.dateTime), 'h:mm a')}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">New</h4>
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    {selectedSlot && format(parseISO(selectedSlot.dateTime), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 mt-1">
                    <Clock className="h-4 w-4 text-blue-400" />
                    {selectedSlot && format(parseISO(selectedSlot.dateTime), 'h:mm a')}
                  </div>
                </div>
              </div>

              {/* Reason (optional) */}
              <div>
                <label htmlFor="reschedule-reason" className="block text-sm font-medium text-foreground mb-2">
                  Reason for rescheduling (optional)
                </label>
                <textarea
                  id="reschedule-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter your reason for rescheduling..."
                  className="w-full px-3 py-2 border border-border bg-background rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{reason.length}/500 characters</p>
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium">Please note:</p>
                    <ul className="mt-1 list-disc list-inside space-y-0.5">
                      <li>Your appointment will be reset to &quot;Pending&quot; status</li>
                      <li>The doctor will need to confirm the new time</li>
                      <li>You have {rescheduleInfo?.remainingReschedules ?? rules?.maxReschedules ?? 3} reschedule{(rescheduleInfo?.remainingReschedules ?? rules?.maxReschedules ?? 3) !== 1 ? 's' : ''} remaining for this appointment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/50">
          {step === 2 ? (
            <>
              <button
                onClick={handleBack}
                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <div className="text-sm text-muted-foreground">
                Select a new time slot
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
