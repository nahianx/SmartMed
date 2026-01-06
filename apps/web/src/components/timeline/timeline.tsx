import { useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import type { TimelineActivity, FilterState } from '@/types/timeline'
import { TimelineItem } from './timeline_item'
import { Separator, Skeleton } from '@smartmed/ui'
import { FixedSizeList as VirtualList } from 'react-window'
import type { CSSProperties } from 'react'

interface TimelineProps {
  activities: TimelineActivity[]
  filters: FilterState
  onOpenDetails: (activity: TimelineActivity) => void
  isLoading?: boolean
  userRole?: 'patient' | 'doctor' | 'admin'
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
      | { type: 'date'; date: Date }
      | { type: 'item'; activity: TimelineActivity }
    > = []
    groupedActivities.forEach((group) => {
      rows.push({ type: 'date', date: group.date })
      group.activities.forEach((activity) =>
        rows.push({ type: 'item', activity })
      )
    })
    return rows
  }, [groupedActivities])

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (groupedActivities.length === 0) {
    const hasFilters =
      !!filters.searchText ||
      filters.types.length > 0 ||
      filters.statuses.length > 0

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <svg
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2">No activities found</h3>
        <p className="text-muted-foreground mb-4">
          {hasFilters
            ? 'Try adjusting your filters to see more results'
            : 'Your activity timeline will appear here'}
        </p>
      </div>
    )
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
        <div style={style} className="px-2 py-3 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-muted px-3 py-1">
            <span className="text-sm font-medium">
              {format(row.date, 'EEEE, MMMM dd, yyyy')}
            </span>
          </div>
          <Separator className="flex-1" />
        </div>
      )
    }
    return (
      <div style={style} className="px-2 pb-3">
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
        itemSize={110}
        width="100%"
        className="space-y-0"
      >
        {renderRow}
      </VirtualList>
    </div>
  ) : (
    <div className="space-y-6 p-6">
      {groupedActivities.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-lg bg-muted px-3 py-1">
              <span className="text-sm font-medium">
                {format(group.date, 'EEEE, MMMM dd, yyyy')}
              </span>
            </div>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-3 pl-2">
            {group.activities.map((activity) => (
              <TimelineItem
                key={activity.id}
                activity={activity}
                onOpenDetails={onOpenDetails}
                userRole={userRole}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
