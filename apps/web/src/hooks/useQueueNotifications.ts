/**
 * Queue Notifications Hook
 * 
 * React hook for managing audio and browser notifications for queue events (doctors).
 * Handles:
 * - Browser notification permissions
 * - Audio playback for queue events
 * - User preference management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/apiClient'

// Notification sound types
export type QueueEventType = 'patient_joined' | 'patient_next' | 'patient_cancelled' | 'urgent'

interface NotificationPreferences {
  audioNotificationsEnabled: boolean
  browserNotificationsEnabled: boolean
  notificationSound: string
  notificationVolume: number
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  timezone: string
}

interface NotificationSound {
  id: string
  name: string
  file: string
}

interface UseQueueNotificationsReturn {
  // Permission state
  browserPermission: NotificationPermission | null
  requestBrowserPermission: () => Promise<NotificationPermission>
  
  // Preferences
  preferences: NotificationPreferences | null
  isLoadingPreferences: boolean
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>
  
  // Available sounds
  availableSounds: NotificationSound[]
  
  // Notification functions
  playNotificationSound: (eventType?: QueueEventType) => Promise<void>
  showBrowserNotification: (title: string, body: string, eventType?: QueueEventType) => void
  notifyQueueEvent: (eventType: QueueEventType, patientName?: string) => void
  
  // Sound preview
  previewSound: (soundId: string) => Promise<void>
  stopPreview: () => void
  
  // State
  isMuted: boolean
  toggleMute: () => void
  isInQuietHours: () => boolean
}

// Sound file mapping by event type
const EVENT_SOUND_MAP: Record<QueueEventType, string> = {
  patient_joined: 'notification-default',
  patient_next: 'notification-alert',
  patient_cancelled: 'notification-gentle',
  urgent: 'notification-alert',
}

// Get base URL for sound files
const getSoundUrl = (soundId: string): string => {
  return `/sounds/${soundId}.mp3`
}

export function useQueueNotifications(): UseQueueNotificationsReturn {
  const queryClient = useQueryClient()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  // Check browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }, [])

  // Fetch notification preferences
  const { data: preferencesData, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/preferences')
      return response.data.data as NotificationPreferences
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  // Fetch available sounds
  const { data: soundsData } = useQuery({
    queryKey: ['notificationSounds'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/preferences/sounds')
      return response.data.data as NotificationSound[]
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  const preferences = preferencesData || null
  const availableSounds = soundsData || []

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    setBrowserPermission(permission)
    return permission
  }, [])

  // Update notification preferences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    await apiClient.put('/notifications/preferences', updates)
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] })
  }, [queryClient])

  // Check if currently in quiet hours
  const isInQuietHours = useCallback((): boolean => {
    if (!preferences?.quietHoursEnabled) return false
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false

    const now = new Date()
    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number)
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number)

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }, [preferences])

  // Play notification sound
  const playNotificationSound = useCallback(async (eventType?: QueueEventType) => {
    // Check if audio is enabled
    if (!preferences?.audioNotificationsEnabled || isMuted) return
    
    // Check quiet hours
    if (isInQuietHours()) return

    try {
      // Get the appropriate sound
      const soundId = eventType ? EVENT_SOUND_MAP[eventType] : preferences.notificationSound
      const soundUrl = getSoundUrl(soundId)
      
      // Create audio element if needed
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      const audio = audioRef.current
      audio.src = soundUrl
      audio.volume = (preferences.notificationVolume || 70) / 100
      
      // Play the sound
      await audio.play()
    } catch (error) {
      console.warn('[QueueNotifications] Failed to play audio:', error)
    }
  }, [preferences, isMuted, isInQuietHours])

  // Preview a specific sound
  const previewSound = useCallback(async (soundId: string) => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      const audio = audioRef.current
      audio.src = getSoundUrl(soundId)
      audio.volume = (preferences?.notificationVolume || 70) / 100
      await audio.play()
    } catch (error) {
      console.warn('[QueueNotifications] Failed to preview sound:', error)
    }
  }, [preferences?.notificationVolume])

  // Stop sound preview
  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  // Show browser notification
  const showBrowserNotification = useCallback((
    title: string, 
    body: string, 
    eventType?: QueueEventType
  ) => {
    // Check if browser notifications are enabled
    if (!preferences?.browserNotificationsEnabled) return
    if (browserPermission !== 'granted') return
    
    // Check quiet hours
    if (isInQuietHours()) return

    // Don't show if page is focused
    if (document.hasFocus()) return

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icons/smartmed-icon-192.png',
        badge: '/icons/smartmed-badge.png',
        tag: `queue-${eventType || 'general'}`,
        requireInteraction: false,
        silent: true, // We play our own sound
      })

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000)

      // Focus window on click
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.warn('[QueueNotifications] Failed to show notification:', error)
    }
  }, [preferences, browserPermission, isInQuietHours])

  // Combined notification function for queue events
  const notifyQueueEvent = useCallback((eventType: QueueEventType, patientName?: string) => {
    const messages: Record<QueueEventType, { title: string; body: string }> = {
      patient_joined: {
        title: '🔔 New Patient in Queue',
        body: patientName ? `${patientName} has joined your queue` : 'A new patient has joined your queue',
      },
      patient_next: {
        title: '⏰ Patient Ready',
        body: patientName ? `${patientName} is next in line` : 'Next patient is ready',
      },
      patient_cancelled: {
        title: '❌ Patient Left Queue',
        body: patientName ? `${patientName} has left the queue` : 'A patient has left the queue',
      },
      urgent: {
        title: '🚨 Urgent: Queue Alert',
        body: patientName ? `Urgent case: ${patientName}` : 'Urgent queue notification',
      },
    }

    const { title, body } = messages[eventType]

    // Play sound
    playNotificationSound(eventType)

    // Show browser notification
    showBrowserNotification(title, body, eventType)
  }, [playNotificationSound, showBrowserNotification])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
  }, [])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return {
    browserPermission,
    requestBrowserPermission,
    preferences,
    isLoadingPreferences,
    updatePreferences,
    availableSounds,
    playNotificationSound,
    showBrowserNotification,
    notifyQueueEvent,
    previewSound,
    stopPreview,
    isMuted,
    toggleMute,
    isInQuietHours,
  }
}
