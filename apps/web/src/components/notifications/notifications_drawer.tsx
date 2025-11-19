"use client"

import { formatDistanceToNow } from 'date-fns'
import { Bell } from 'lucide-react'
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

              return (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 text-sm bg-white flex items-start justify-between gap-2 ${
                    isUnread ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-gray-600 mt-1 text-xs">{n.body}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDistanceToNow(created, { addSuffix: true })}
                    </p>
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
