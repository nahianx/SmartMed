import { useState, type MouseEvent } from 'react'
import {
  Calendar,
  Eye,
  MapPin,
  Pill,
  FileText,
  Stethoscope,
  Download,
  Share2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  User,
  Building2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TimelineActivity } from '@/types/timeline'
import { Badge, Button } from '@smartmed/ui'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { apiClient } from '@/services/apiClient'
import { handleApiError, showSuccess } from '@/lib/error_utils'
import { SearchHighlight, useHasSearchHighlights } from './SearchHighlight'
import { cn } from '@/lib/utils'

interface TimelineItemProps {
  activity: TimelineActivity
  onOpenDetails: (activity: TimelineActivity) => void
  userRole?: 'patient' | 'doctor' | 'admin'
}

const typeConfig = {
  appointment: {
    icon: Stethoscope,
    label: 'Appointment',
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800/50',
    accentColor: 'bg-blue-500',
  },
  prescription: {
    icon: Pill,
    label: 'Prescription',
    gradient: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
    accentColor: 'bg-emerald-500',
  },
  report: {
    icon: FileText,
    label: 'Report',
    gradient: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-200 dark:border-violet-800/50',
    accentColor: 'bg-violet-500',
  },
}

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700/50',
  },
  'no-show': {
    icon: AlertCircle,
    label: 'No-show',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
  },
}

function formatSmartDate(date: Date): string {
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`
  }
  return format(date, 'MMM d, yyyy • h:mm a')
}

export function TimelineItem({
  activity,
  onOpenDetails,
  userRole,
}: TimelineItemProps) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const hasHighlights = useHasSearchHighlights(activity)

  const config = typeConfig[activity.type]
  const Icon = config.icon
  const status = activity.status ? statusConfig[activity.status] : null
  const StatusIcon = status?.icon

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
      showSuccess('Download started')
    } catch (error) {
      handleApiError(error, 'Failed to download report')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (typeof window === 'undefined') return
    
    const shareUrl = `${window.location.origin}/timeline?id=${activity.id}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: activity.title,
          text: activity.subtitle,
          url: shareUrl,
        })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        showSuccess('Link copied to clipboard')
      } else {
        window.open(shareUrl, '_blank')
      }
    } catch {
      // User cancelled share
    }
  }

  const handleView = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (activity.type === 'appointment' && activity.id) {
      const rolePath = userRole === 'doctor' ? 'doctor' : 'patient'
      router.push(`/dashboard/${rolePath}/appointments/${activity.id}`)
    } else {
      onOpenDetails(activity)
    }
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden',
        'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
        'hover:border-primary/30',
        config.bgColor,
        config.borderColor
      )}
      onClick={() => onOpenDetails(activity)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Type accent bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', config.accentColor)} />

      <div className="p-4 pl-5">
        <div className="flex gap-4">
          {/* Icon */}
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200',
            config.iconBg,
            isHovered && 'scale-105'
          )}>
            <Icon className={cn('h-6 w-6', config.iconColor)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground truncate">
                    {hasHighlights && activity.highlightedTitle ? (
                      <SearchHighlight 
                        text={activity.highlightedTitle} 
                        fallback={activity.title} 
                      />
                    ) : (
                      activity.title
                    )}
                  </h3>
                  
                  {status && (
                    <Badge 
                      variant="outline"
                      className={cn('gap-1 font-medium', status.className)}
                    >
                      {StatusIcon && <StatusIcon className="h-3 w-3" />}
                      {status.label}
                    </Badge>
                  )}
                </div>

                {/* Subtitle */}
                {activity.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {hasHighlights && activity.highlightedSubtitle ? (
                      <SearchHighlight 
                        text={activity.highlightedSubtitle} 
                        fallback={activity.subtitle} 
                      />
                    ) : (
                      activity.subtitle
                    )}
                  </p>
                )}
              </div>

              {/* Quick view button */}
              <ChevronRight className={cn(
                'h-5 w-5 text-muted-foreground/50 transition-all duration-200',
                isHovered && 'text-primary translate-x-0.5'
              )} />
            </div>

            {/* Meta info */}
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatSmartDate(activity.date)}
              </span>

              {activity.doctorName && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {activity.doctorName}
                </span>
              )}

              {activity.clinic && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {activity.clinic}
                </span>
              )}

              {activity.fileName && (
                <span className="flex items-center gap-1.5 text-xs bg-muted/50 px-2 py-0.5 rounded">
                  <FileText className="h-3 w-3" />
                  {activity.fileName}
                </span>
              )}
            </div>

            {/* Tags */}
            {activity.tags && activity.tags.length > 0 && (
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {activity.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="text-xs bg-background/50 hover:bg-background"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className={cn(
              'mt-3 pt-3 border-t border-border/50 flex items-center gap-2 transition-opacity duration-200',
              !isHovered && 'lg:opacity-0',
              isHovered && 'opacity-100'
            )}>
              <Button
                size="sm"
                variant="default"
                onClick={handleView}
                className="h-8 shadow-sm"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                {activity.type === 'prescription'
                  ? 'View Rx'
                  : activity.type === 'report'
                    ? 'Preview'
                    : 'View Details'}
              </Button>
              
              {activity.type === 'report' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="h-8"
                >
                  {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {isDownloading ? 'Downloading...' : 'Download'}
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleShare}
                className="h-8 ml-auto"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hover gradient overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-r from-transparent to-primary/5 opacity-0 transition-opacity duration-200 pointer-events-none',
        isHovered && 'opacity-100'
      )} />
    </div>
  )
}
