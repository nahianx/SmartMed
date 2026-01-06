import { useMemo } from 'react'
import { format, isSameDay, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns'
import type { TimelineActivity, FilterState } from '@/types/timeline'
import { TimelineItem } from './timeline_item'
import { Separator, Skeleton } from '@smartmed/ui'
import { FixedSizeList as VirtualList } from 'react-window'
import type { CSSProperties } from 'react'
import { 
  CalendarDays, 
  FileSearch, 
  Sparkles,
  Clock,
  CalendarClock,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineProps {
  activities: TimelineActivity[]
  filters: FilterState
  onOpenDetails: (activity: TimelineActivity) => void
  isLoading?: boolean
  userRole?: 'patient' | 'doctor' | 'admin'
}

function getDateLabel(date: Date): { label: string; icon: typeof Clock; highlight?: boolean } {
  if (isToday(date)) {
    return { label: 'Today', icon: Clock, highlight: true }
  }
  if (isYesterday(date)) {
    return { label: 'Yesterday', icon: History }
  }
  if (isThisWeek(date)) {
    return { label: format(date, 'EEEE'), icon: CalendarDays }
  }
  if (isThisMonth(date)) {
    return { label: format(date, 'EEEE, MMMM d'), icon: CalendarClock }
  }
  return { label: format(date, 'EEEE, MMMM d, yyyy'), icon: CalendarClock }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 p-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-4">
          {/* Date header skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-lg" />
            <Skeleton className="h-5 w-32 rounded" />
            <div className="flex-1 h-px bg-border" />
            <Skeleton className="h-5 w-8 rounded" />
          </div>
          {/* Card skeletons */}
          <div className="space-y-3 ml-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            </div>
            {i < 2 && (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-2/5" />
                    <div className="flex gap-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative mb-6">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          {hasFilters ? (
            <FileSearch className="h-12 w-12 text-muted-foreground" />
          ) : (
            <CalendarDays className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {hasFilters ? 'No matching activities' : 'No activities yet'}
      </h3>
      <p className="text-muted-foreground max-w-[280px] leading-relaxed">
        {hasFilters
          ? 'Try adjusting your filters to see more results, or clear all filters to view everything.'
          : 'Your activity timeline will appear here. Appointments, prescriptions, and reports will be tracked automatically.'}
      </p>
      
      {hasFilters && (
        <p className="mt-4 text-sm text-muted-foreground">
          Tip: Use the search to find specific items by doctor name, specialty, or file name.
        </p>
      )}
    </div>
  )
}

function DateGroupHeader({ date, count }: { date: Date; count: number }) {
  const { label, icon: Icon, highlight } = getDateLabel(date)
  
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
        highlight 
          ? 'bg-primary/10 text-primary' 
          : 'bg-muted text-foreground'
      )}>
        <Icon className="h-4 w-4" />
        <span className={cn('text-sm font-medium', highlight && 'font-semibold')}>
          {label}
        </span>
      </div>
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
        {count} {count === 1 ? 'item' : 'items'}
      </span>
    </div>
  )
}

export function Timeline({
  activities,
  filters,
  onOpenDetails,
  isLoading = false,
  userRole,
}: TimelineProps) {
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (filters.types.length > 0 && !filters.types.includes(activity.type)) {
        return false
      }

      if (filters.statuses.length > 0) {
        if (
          activity.type !== 'appointment' ||
          !activity.status ||
          !filters.statuses.includes(activity.status)
        ) {
          if (activity.type === 'appointment') {
            return false
          }
        }
      }

      if (filters.dateRange.from && activity.date < filters.dateRange.from) {
        return false
      }
      if (filters.dateRange.to) {
        const toEndOfDay = new Date(filters.dateRange.to)
        toEndOfDay.setHours(23, 59, 59, 999)
        if (activity.date > toEndOfDay) {
          return false
        }
      }

      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase()
        const searchableText = [
          activity.title,
          activity.subtitle,
          activity.doctorName,
          activity.specialty,
          activity.fileName,
          ...(activity.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!searchableText.includes(searchLower)) {
          return false
        }
      }

      return true
    })
  }, [activities, filters])

  const groupedActivities = useMemo(() => {
    const groups: { date: Date; activities: TimelineActivity[] }[] = []

    filteredActivities.forEach((activity) => {
      const existingGroup = groups.find((g) => isSameDay(g.date, activity.date))

      if (existingGroup) {
        existingGroup.activities.push(activity)
      } else {
        groups.push({ date: activity.date, activities: [activity] })
      }
    })

    groups.sort((a, b) => b.date.getTime() - a.date.getTime())

    groups.forEach((group) => {
      group.activities.sort((a, b) => b.date.getTime() - a.date.getTime())
    })

    return groups
  }, [filteredActivities])

  const virtualRows = useMemo(() => {
    const rows: Array<
      | { type: 'date'; date: Date; count: number }
      | { type: 'item'; activity: TimelineActivity }
    > = []
    groupedActivities.forEach((group) => {
      rows.push({ type: 'date', date: group.date, count: group.activities.length })
      group.activities.forEach((activity) =>
        rows.push({ type: 'item', activity })
      )
    })
    return rows
  }, [groupedActivities])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const hasFilters =
    !!filters.searchText ||
    filters.types.length > 0 ||
    filters.statuses.length > 0 ||
    !!filters.dateRange.from ||
    !!filters.dateRange.to

  if (groupedActivities.length === 0) {
    return <EmptyState hasFilters={hasFilters} />
  }

  const renderRow = ({
    index,
    style,
  }: {
    index: number
    style: CSSProperties
  }) => {
    const row = virtualRows[index]
    if (row.type === 'date') {
      return (
        <div style={style} className="px-4 py-2">
          <DateGroupHeader date={row.date} count={row.count} />
        </div>
      )
    }
    return (
      <div style={style} className="px-4 pb-3">
        <TimelineItem
          activity={row.activity}
          onOpenDetails={onOpenDetails}
          userRole={userRole}
        />
      </div>
    )
  }

  const shouldVirtualize =
    typeof window !== 'undefined' && virtualRows.length > 40

  return shouldVirtualize ? (
    <div className="p-2">
      <VirtualList
        height={640}
        itemCount={virtualRows.length}
        itemSize={140}
        width="100%"
        className="space-y-0"
      >
        {renderRow}
      </VirtualList>
    </div>
  ) : (
    <div className="space-y-6 p-6">
      {groupedActivities.map((group, groupIndex) => (
        <div 
          key={groupIndex} 
          className="space-y-3"
          style={{ 
            animationDelay: `${groupIndex * 100}ms`,
            animation: 'fadeInUp 0.3s ease-out forwards'
          }}
        >
          <DateGroupHeader date={group.date} count={group.activities.length} />

          <div className="space-y-3 ml-2">
            {group.activities.map((activity, activityIndex) => (
              <div
                key={activity.id}
                style={{
                  animationDelay: `${(groupIndex * 100) + (activityIndex * 50)}ms`,
                  animation: 'fadeInUp 0.3s ease-out forwards',
                  opacity: 0
                }}
              >
                <TimelineItem
                  activity={activity}
                  onOpenDetails={onOpenDetails}
                  userRole={userRole}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* End of timeline indicator */}
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-px w-12 bg-border" />
          <span>End of timeline</span>
          <div className="h-px w-12 bg-border" />
        </div>
      </div>
    </div>
  )
}
