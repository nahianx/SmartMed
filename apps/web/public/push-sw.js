/**
 * Push Notification Service Worker
 * 
 * Handles incoming push notifications and user interactions.
 * This file should be placed in the public directory.
 */

// Cache name for offline support
const CACHE_NAME = 'smartmed-push-v1'

// Handle push events
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')

  if (!event.data) {
    console.log('[SW] No data in push event')
    return
  }

  let payload
  try {
    payload = event.data.json()
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e)
    payload = {
      title: 'SmartMed Notification',
      body: event.data.text(),
    }
  }

  const {
    title = 'SmartMed',
    body = '',
    icon = '/icons/notification-192.png',
    badge = '/icons/badge-72.png',
    tag,
    data = {},
    actions = [],
    requireInteraction = false,
    vibrate = [200, 100, 200],
  } = payload

  const options = {
    body,
    icon,
    badge,
    tag,
    data,
    actions,
    requireInteraction,
    vibrate,
    timestamp: Date.now(),
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action)

  event.notification.close()

  const { data = {} } = event.notification
  let url = data.url || '/'

  // Handle specific actions
  if (event.action === 'view') {
    url = data.url || '/'
  } else if (event.action === 'dismiss') {
    return // Just close the notification
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Try to find an existing window
        for (const client of windowClients) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus().then((focused) => {
              if (focused) {
                focused.postMessage({
                  type: 'NOTIFICATION_CLICK',
                  url,
                  data,
                })
              }
              return focused
            })
          }
        }
        // No existing window, open new one
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed')
  
  // Could track analytics here
  const { data = {} } = event.notification
  if (data.type) {
    console.log(`[SW] Notification type: ${data.type} was dismissed`)
  }
})

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installed')
  self.skipWaiting()
})

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated')
  event.waitUntil(
    Promise.all([
      // Claim clients immediately
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      }),
    ])
  )
})

// Message handling from main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
