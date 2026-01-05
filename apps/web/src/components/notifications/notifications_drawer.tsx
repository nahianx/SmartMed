"use client"

import { formatDistanceToNow } from 'date-fns'
import { Bell, Lightbulb, Calendar, Activity, CheckCheck, Trash2, Loader2 } from 'lucide-react'
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
  onMarkAllRead?: () => Promise<void>
  onClearRead?: () => Promise<void>
  isMarkingAllRead?: boolean
  isClearingRead?: boolean
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
  onMarkAllRead,
  onClearRead,
  isMarkingAllRead = false,
  isClearingRead = false,
}: NotificationsDrawerProps) {
  const hasNotifications = notifications.length > 0
  const unreadCount = notifications.filter((n) => !n.readAt).length
  const readCount = notifications.filter((n) => n.readAt).length
  const hasUnread = unreadCount > 0
  const hasRead = readCount > 0

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
            {hasUnread && (
              <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                {unreadCount} unread
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Action buttons */}
        {hasNotifications && (
          <div className="flex gap-2 mt-4 pb-2 border-b">
            {hasUnread && onMarkAllRead && (
              <Button
                size="sm"
                variant="outline"
                onClick={onMarkAllRead}
                disabled={isMarkingAllRead}
                className="flex-1 text-xs"
                title="Mark all notifications as read"
              >
                {isMarkingAllRead ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3 mr-1" />
                )}
                Mark all read
              </Button>
            )}
            {hasRead && onClearRead && (
              <Button
                size="sm"
                variant="outline"
                onClick={onClearRead}
                disabled={isClearingRead}
                className="flex-1 text-xs text-gray-600 hover:text-red-600"
                title="Clear all read notifications"
              >
                {isClearingRead ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                Clear read
              </Button>
            )}
          </div>
        )}

        <ScrollArea className="mt-4 h-[calc(100vh-10rem)]">
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
