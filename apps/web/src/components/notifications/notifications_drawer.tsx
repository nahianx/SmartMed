"use client"

import { useMemo, useState } from 'react'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns'
import { 
  Bell, 
  Lightbulb, 
  Calendar, 
  Activity, 
  CheckCheck, 
  Trash2, 
  Loader2,
  Clock,
  Sparkles,
  ChevronRight,
  BellOff,
  Check,
  Filter
} from 'lucide-react'
import { NotificationItem, NotificationType } from '@/types/notification'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Button,
  ScrollArea,
  Badge,
} from '@smartmed/ui'
import { cn } from '@/lib/utils'

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

type NotificationCategory = 'reminders' | 'activity' | 'tips' | 'other'
type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'older'

interface GroupedNotification {
  timeGroup: TimeGroup
  category: NotificationCategory
  notification: NotificationItem
}

function getNotificationCategory(type: NotificationType): NotificationCategory {
  switch (type) {
    case 'APPOINTMENT_REMINDER_24H':
    case 'APPOINTMENT_REMINDER_1H':
      return 'reminders'
    case 'ACTIVITY_CREATED':
    case 'ACTIVITY_UPDATED':
      return 'activity'
    case 'HEALTH_TIP_GENERATED':
      return 'tips'
    default:
      return 'other'
  }
}

function getTimeGroup(date: Date): TimeGroup {
  if (isToday(date)) return 'today'
  if (isYesterday(date)) return 'yesterday'
  if (isThisWeek(date)) return 'thisWeek'
  return 'older'
}

const timeGroupLabels: Record<TimeGroup, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  older: 'Earlier'
}

const categoryConfig: Record<NotificationCategory, { 
  label: string
  icon: typeof Bell
  color: string
  bgColor: string
  darkBgColor: string
}> = {
  reminders: {
    label: 'Reminders',
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100',
    darkBgColor: 'dark:bg-blue-900/30'
  },
  activity: {
    label: 'Activity',
    icon: Activity,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100',
    darkBgColor: 'dark:bg-green-900/30'
  },
  tips: {
    label: 'Health Tips',
    icon: Lightbulb,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100',
    darkBgColor: 'dark:bg-amber-900/30'
  },
  other: {
    label: 'Other',
    icon: Bell,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100',
    darkBgColor: 'dark:bg-gray-800/50'
  }
}

function NotificationIcon({ type, size = 'sm' }: { type: NotificationType; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const category = getNotificationCategory(type)
  const config = categoryConfig[category]
  const Icon = config.icon
  
  return (
    <div className={cn(
      'flex items-center justify-center rounded-full',
      size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
      config.bgColor,
      config.darkBgColor
    )}>
      <Icon className={cn(sizeClass, config.color)} />
    </div>
  )
}

function getPriorityIndicator(type: NotificationType): 'high' | 'medium' | 'low' {
  switch (type) {
    case 'APPOINTMENT_REMINDER_1H':
      return 'high'
    case 'APPOINTMENT_REMINDER_24H':
      return 'medium'
    default:
      return 'low'
  }
}

function NotificationCard({ 
  notification, 
  onMarkRead,
  isAnimating = false
}: { 
  notification: NotificationItem
  onMarkRead: (id: string) => void
  isAnimating?: boolean
}) {
  const [isMarking, setIsMarking] = useState(false)
  const created = new Date(notification.createdAt)
  const isUnread = !notification.readAt
  const category = getNotificationCategory(notification.type)
  const config = categoryConfig[category]
  const priority = getPriorityIndicator(notification.type)

  const handleMarkRead = async () => {
    setIsMarking(true)
    onMarkRead(notification.id)
    // Reset after animation
    setTimeout(() => setIsMarking(false), 300)
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl border p-4 transition-all duration-200',
        'hover:shadow-md hover:border-primary/20',
        isUnread && 'bg-gradient-to-r from-primary/5 to-transparent border-primary/30',
        !isUnread && 'bg-card border-border opacity-75 hover:opacity-100',
        isAnimating && 'animate-slide-in-right',
        isMarking && 'scale-98 opacity-50'
      )}
    >
      {/* Priority indicator for urgent notifications */}
      {isUnread && priority === 'high' && (
        <div className="absolute -left-px top-4 bottom-4 w-1 rounded-full bg-red-500 animate-pulse" />
      )}
      {isUnread && priority === 'medium' && (
        <div className="absolute -left-px top-4 bottom-4 w-1 rounded-full bg-amber-500" />
      )}

      <div className="flex gap-3">
        <NotificationIcon type={notification.type} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  'text-sm font-medium truncate',
                  isUnread ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {notification.title}
                </h4>
                {isUnread && (
                  <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              
              {(notification.body || notification.message) && (
                <p className={cn(
                  'mt-1 text-xs leading-relaxed line-clamp-2',
                  isUnread ? 'text-muted-foreground' : 'text-muted-foreground/70'
                )}>
                  {notification.body || notification.message}
                </p>
              )}
              
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(created, { addSuffix: true })}
                </span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    config.color
                  )}
                >
                  {config.label}
                </Badge>
              </div>
            </div>

            {isUnread && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMarkRead}
                disabled={isMarking}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2"
              >
                <Check className="h-4 w-4 mr-1" />
                <span className="text-xs">Done</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hover action hint */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <BellOff className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
      <p className="text-sm text-muted-foreground max-w-[200px]">
        No new notifications. Appointment reminders and updates will appear here.
      </p>
    </div>
  )
}

function QuickFilterBar({ 
  activeFilter, 
  onFilterChange,
  counts 
}: { 
  activeFilter: NotificationCategory | 'all'
  onFilterChange: (filter: NotificationCategory | 'all') => void
  counts: Record<NotificationCategory | 'all', number>
}) {
  const filters: (NotificationCategory | 'all')[] = ['all', 'reminders', 'activity', 'tips']
  
  return (
    <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-hide">
      {filters.map((filter) => {
        const isActive = activeFilter === filter
        const count = counts[filter]
        const config = filter !== 'all' ? categoryConfig[filter] : null
        
        return (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              isActive 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
          >
            {config && <config.icon className="h-3 w-3" />}
            {filter === 'all' ? 'All' : config?.label}
            {count > 0 && (
              <span className={cn(
                'ml-1 px-1.5 py-0.5 rounded-full text-[10px]',
                isActive ? 'bg-primary-foreground/20' : 'bg-background'
              )}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
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
  const [activeFilter, setActiveFilter] = useState<NotificationCategory | 'all'>('all')
  
  const { 
    hasNotifications, 
    unreadCount, 
    readCount, 
    hasUnread, 
    hasRead,
    groupedByTime,
    filterCounts
  } = useMemo(() => {
    const unread = notifications.filter((n) => !n.readAt)
    const read = notifications.filter((n) => n.readAt)
    
    // Filter by category
    const filtered = activeFilter === 'all' 
      ? notifications 
      : notifications.filter(n => getNotificationCategory(n.type) === activeFilter)
    
    // Group by time
    const groups: Record<TimeGroup, NotificationItem[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    }
    
    filtered
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach(n => {
        const timeGroup = getTimeGroup(new Date(n.createdAt))
        groups[timeGroup].push(n)
      })
    
    // Calculate counts per category
    const counts: Record<NotificationCategory | 'all', number> = {
      all: notifications.length,
      reminders: notifications.filter(n => getNotificationCategory(n.type) === 'reminders').length,
      activity: notifications.filter(n => getNotificationCategory(n.type) === 'activity').length,
      tips: notifications.filter(n => getNotificationCategory(n.type) === 'tips').length,
      other: notifications.filter(n => getNotificationCategory(n.type) === 'other').length
    }
    
    return {
      hasNotifications: notifications.length > 0,
      unreadCount: unread.length,
      readCount: read.length,
      hasUnread: unread.length > 0,
      hasRead: read.length > 0,
      groupedByTime: groups,
      filterCounts: counts
    }
  }, [notifications, activeFilter])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md flex flex-col p-0"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-b from-muted/50 to-transparent">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-lg">Notifications</span>
                {hasUnread && (
                  <Badge 
                    variant="default" 
                    className="ml-3 bg-primary text-primary-foreground"
                  >
                    {unreadCount} new
                  </Badge>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Quick filters */}
          {hasNotifications && (
            <QuickFilterBar 
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              counts={filterCounts}
            />
          )}

          {/* Action buttons */}
          {hasNotifications && (hasUnread || hasRead) && (
            <div className="flex gap-2 pt-3 border-t">
              {hasUnread && onMarkAllRead && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMarkAllRead}
                  disabled={isMarkingAllRead}
                  className="flex-1 h-9"
                >
                  {isMarkingAllRead ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4 mr-2" />
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
                  className="flex-1 h-9 text-muted-foreground hover:text-destructive hover:border-destructive/50"
                >
                  {isClearingRead ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Clear read
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4">
            {!hasNotifications ? (
              <EmptyState />
            ) : (
              <div className="space-y-6">
                {(['today', 'yesterday', 'thisWeek', 'older'] as TimeGroup[]).map(timeGroup => {
                  const items = groupedByTime[timeGroup]
                  if (items.length === 0) return null
                  
                  return (
                    <div key={timeGroup}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {timeGroupLabels[timeGroup]}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {items.map((notification, index) => (
                          <NotificationCard
                            key={notification.id}
                            notification={notification}
                            onMarkRead={onMarkRead}
                            isAnimating={index < 3 && timeGroup === 'today'}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        {hasNotifications && (
          <div className="px-6 py-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''} 
              {activeFilter !== 'all' && ` in ${categoryConfig[activeFilter].label}`}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
