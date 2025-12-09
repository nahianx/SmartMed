import { Calendar, Eye, MapPin, Pill, FileText, Stethoscope } from 'lucide-react'
import type { TimelineActivity } from '@/types/timeline'
import { Badge, Button } from '@smartmed/ui'
import { format } from 'date-fns'

interface TimelineItemProps {
  activity: TimelineActivity
  onOpenDetails: (activity: TimelineActivity) => void
}

export function TimelineItem({ activity, onOpenDetails }: TimelineItemProps) {
  const getIcon = () => {
    switch (activity.type) {
      case 'appointment':
        return <Stethoscope className="h-5 w-5" />
      case 'prescription':
        return <Pill className="h-5 w-5" />
      case 'report':
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getIconBgColor = () => {
    switch (activity.type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-600'
      case 'prescription':
        return 'bg-green-100 text-green-600'
      case 'report':
      default:
        return 'bg-purple-100 text-purple-600'
    }
  }

  const getStatusBadge = () => {
    if (!activity.status) return null

    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      cancelled: 'secondary',
      'no-show': 'destructive',
    }

    return (
      <Badge variant={variants[activity.status] || 'outline'} className="ml-2">
        {activity.status === 'no-show'
          ? 'No-show'
          : activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
      </Badge>
    )
  }

  return (
    <div
      className="group relative flex gap-4 rounded-lg border bg-white p-4 transition-all hover:shadow-md cursor-pointer"
      onClick={() => onOpenDetails(activity)}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getIconBgColor()}`}>
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium">{activity.title}</h3>
              {getStatusBadge()}
            </div>

            <div className="mt-1 flex items-center gap-3 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(activity.date, 'MMM dd, yyyy at h:mm a')}
              </span>

              {activity.clinic && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {activity.clinic}
                </span>
              )}
            </div>

            {activity.tags && activity.tags.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {activity.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {activity.type === 'appointment' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDetails(activity)
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </>
            )}

            {activity.type === 'prescription' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDetails(activity)
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Rx
                </Button>
              </>
            )}

            {activity.type === 'report' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDetails(activity)
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500">
          Click to view details in drawer.
        </div>
      </div>
    </div>
  )
}
