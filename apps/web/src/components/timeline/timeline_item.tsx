import { useState, type MouseEvent } from 'react'
import {
  Calendar,
  Eye,
  MapPin,
  Pill,
  FileText,
  Stethoscope,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TimelineActivity } from '@/types/timeline'
import { Badge, Button } from '@smartmed/ui'
import { format } from 'date-fns'
import { apiClient } from '@/services/apiClient'
import { handleApiError } from '@/lib/error_utils'

interface TimelineItemProps {
  activity: TimelineActivity
  onOpenDetails: (activity: TimelineActivity) => void
  userRole?: 'patient' | 'doctor' | 'admin'
}

export function TimelineItem({
  activity,
  onOpenDetails,
  userRole,
}: TimelineItemProps) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)

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

    const variants: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
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

  const getFilenameFromDisposition = (disposition?: string) => {
    if (!disposition) return null
    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1])
    }
    const match = /filename="([^"]+)"/i.exec(disposition)
    if (match?.[1]) {
      return decodeURIComponent(match[1])
    }
    return null
  }

  const handleDownload = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!activity.reportId || isDownloading) return
    try {
      setIsDownloading(true)
      const response = await apiClient.get(
        `/reports/${activity.reportId}/download`,
        {
          params: { disposition: 'attachment' },
          responseType: 'blob',
        },
      )

      if (typeof window === 'undefined') return
      const blobUrl = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      const headerName = getFilenameFromDisposition(
        response.headers['content-disposition'],
      )
      link.href = blobUrl
      link.download = headerName || activity.fileName || 'report'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      handleApiError(error, 'Failed to download report')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div
      className="group relative flex gap-4 rounded-lg border bg-white p-4 transition-all hover:shadow-md cursor-pointer"
      onClick={() => onOpenDetails(activity)}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getIconBgColor()}`}
      >
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
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                // Navigate to appointment detail page for appointments
                if (activity.type === 'appointment' && activity.id) {
                  const rolePath = userRole === 'doctor' ? 'doctor' : 'patient'
                  router.push(
                    `/dashboard/${rolePath}/appointments/${activity.id}`
                  )
                } else {
                  onOpenDetails(activity)
                }
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              {activity.type === 'prescription'
                ? 'View Rx'
                : activity.type === 'report'
                  ? 'Preview'
                  : 'View'}
            </Button>
            {activity.type !== 'appointment' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  if (activity.type === 'report') {
                    handleDownload(e)
                  }
                }}
                disabled={activity.type === 'report' ? isDownloading : false}
              >
                <FileText className="h-4 w-4 mr-1" />
                {isDownloading && activity.type === 'report'
                  ? 'Downloading...'
                  : 'Download'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                if (typeof window !== 'undefined') {
                  const shareUrl = `${window.location.origin}/timeline?id=${activity.id}`
                  if (navigator.share) {
                    navigator
                      .share({
                        title: activity.title,
                        text: activity.subtitle,
                        url: shareUrl,
                      })
                      .catch(() => {})
                  } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareUrl).catch(() => {})
                  } else {
                    window.open(shareUrl, '_blank')
                  }
                }
              }}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>

        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500">
          Click to view details in drawer.
        </div>
      </div>
    </div>
  )
}
