/**
 * Push Notification Hook
 * 
 * React hook for managing Web Push notification subscriptions.
 */

import { useState, useEffect, useCallback } from 'react'

interface PushSubscriptionState {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  permission: NotificationPermission | null
}

interface UsePushNotificationsReturn extends PushSubscriptionState {
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  requestPermission: () => Promise<NotificationPermission>
  sendTest: () => Promise<boolean>
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

/**
 * Convert a base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Get device name from user agent
 */
function getDeviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android Device'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Mac/.test(ua)) return 'Mac'
  if (/Linux/.test(ua)) return 'Linux PC'
  return 'Unknown Device'
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
    permission: null,
  })

  // Check if push notifications are supported and get current state
  useEffect(() => {
    const checkSupport = async () => {
      // Check browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          isLoading: false,
          error: 'Push notifications are not supported in this browser',
        }))
        return
      }

      // Check current permission
      const permission = Notification.permission

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()

        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
          error: null,
          permission,
        })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isSupported: true,
          isLoading: false,
          permission,
          error: 'Failed to check subscription status',
        }))
      }
    }

    checkSupport()
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const permission = await Notification.requestPermission()
    setState((prev) => ({ ...prev, permission }))
    return permission
  }, [])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Request permission if not granted
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
        setState((prev) => ({ ...prev, permission }))
      }

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied',
        }))
        return false
      }

      // Get VAPID public key from server
      const keyResponse = await fetch(`${API_BASE}/api/push/vapid-key`)
      const { publicKey, enabled } = await keyResponse.json()

      if (!enabled || !publicKey) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Push notifications are not configured on the server',
        }))
        return false
      }

      // Subscribe to push manager
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Send subscription to server
      const subscriptionJson = subscription.toJSON()
      const response = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          keys: {
            p256dh: subscriptionJson.keys?.p256dh,
            auth: subscriptionJson.keys?.auth,
          },
          deviceName: getDeviceName(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to register subscription with server')
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        error: null,
      }))

      return true
    } catch (err) {
      console.error('Push subscription error:', err)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to subscribe',
      }))
      return false
    }
  }, [])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe()

        // Remove from server
        await fetch(`${API_BASE}/api/push/subscribe`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        })
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }))

      return true
    } catch (err) {
      console.error('Push unsubscribe error:', err)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to unsubscribe',
      }))
      return false
    }
  }, [])

  // Send test notification
  const sendTest = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/push/test`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to send test notification')
      }

      return true
    } catch (err) {
      console.error('Test notification error:', err)
      return false
    }
  }, [])

  return {
    ...state,
    subscribe,
    unsubscribe,
    requestPermission,
    sendTest,
  }
}

export default usePushNotifications
