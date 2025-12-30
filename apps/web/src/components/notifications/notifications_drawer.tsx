"use client"

import { formatDistanceToNow } from 'date-fns'
import { Bell, Lightbulb, Calendar, Activity } from 'lucide-react'
import { NotificationItem } from '@/types/notification'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  ScrollArea,
} from '@smartmed/ui'

interface NotificationsDrawerProps {
  open: boolean
  onClose: () => void
  notifications: NotificationItem[]
  onMarkRead: (id: string) => void
}

function getNotificationIcon(type: NotificationItem['type']) {
  switch (type) {
    case 'HEALTH_TIP_GENERATED':
      return <Lightbulb className="h-4 w-4 text-amber-500" />
    case 'APPOINTMENT_REMINDER_24H':
    case 'APPOINTMENT_REMINDER_1H':
      return <Calendar className="h-4 w-4 text-blue-500" />
    case 'ACTIVITY_CREATED':
    case 'ACTIVITY_UPDATED':
      return <Activity className="h-4 w-4 text-green-500" />
    default:
      return <Bell className="h-4 w-4 text-gray-500" />
  }
}

function getNotificationStyle(type: NotificationItem['type'], isUnread: boolean) {
  if (!isUnread) return 'border-gray-200 bg-white'
  
  switch (type) {
    case 'HEALTH_TIP_GENERATED':
      return 'border-amber-300 bg-amber-50'
    case 'APPOINTMENT_REMINDER_24H':
    case 'APPOINTMENT_REMINDER_1H':
      return 'border-blue-300 bg-blue-50'
    default:
      return 'border-blue-500 bg-white'
  }
}

export function NotificationsDrawer({
  open,
  onClose,
  notifications,
  onMarkRead,
}: NotificationsDrawerProps) {
  const hasNotifications = notifications.length > 0

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-6rem)]">
          {!hasNotifications && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-gray-500">
              <p>No notifications yet.</p>
              <p className="mt-1">Appointment reminders and updates will appear here.</p>
            </div>
          )}

          <div className="space-y-3">
            {notifications.map((n) => {
              const created = new Date(n.createdAt)
              const isUnread = !n.readAt
              const notificationStyle = getNotificationStyle(n.type, isUnread)

              return (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 text-sm flex items-start justify-between gap-2 ${notificationStyle}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {n.title}
                      </p>
                      {(n.body || n.message) && (
                        <p className="text-gray-600 mt-1 text-xs">{n.body || n.message}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDistanceToNow(created, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {isUnread && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onMarkRead(n.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
