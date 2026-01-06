import { useEffect, useState } from 'react'
import {
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  ExternalLink,
  Download,
  User,
  Building2,
  Stethoscope,
  Pill,
  Activity,
  Heart,
  Thermometer,
  Scale,
  Clock,
  Tag,
  X,
  Loader2,
  Copy,
  Check,
} from 'lucide-react'
import type { TimelineActivity } from '@/types/timeline'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
} from '@smartmed/ui'
import { format, formatDistanceToNow } from 'date-fns'
import { PDFViewer } from './pdf_viewer'
import { apiClient } from '@/services/apiClient'
import { handleApiError, showSuccess } from '@/lib/error_utils'
import { cn } from '@/lib/utils'

interface DetailsDrawerProps {
  activity: TimelineActivity | null
  open: boolean
  onClose: () => void
}

const typeConfig = {
  appointment: {
    icon: Stethoscope,
    label: 'Appointment',
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  prescription: {
    icon: Pill,
    label: 'Prescription',
    gradient: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  report: {
    icon: FileText,
    label: 'Report',
    gradient: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
}

const statusConfig = {
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  },
  'no-show': {
    label: 'No-show',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

function isPdfFile(mimeType?: string, fileName?: string) {
  return (
    mimeType === 'application/pdf' || (!!fileName && fileName.toLowerCase().endsWith('.pdf'))
  )
}

function isImageFile(mimeType?: string, fileName?: string) {
  if (mimeType?.startsWith('image/')) return true
  return !!fileName && /\.(png|jpe?g)$/i.test(fileName)
}

function SectionHeader({ icon: Icon, title, className }: { icon: typeof Activity; title: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 mb-3', className)}>
      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
    </div>
  )
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof User }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground block">{label}</span>
        <span className="text-sm text-foreground">{value}</span>
      </div>
    </div>
  )
}

function VitalCard({ icon: Icon, label, value, unit, status }: { 
  icon: typeof Heart; 
  label: string; 
  value: string;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
}) {
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-colors',
      status === 'warning' && 'border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/20',
      status === 'critical' && 'border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-900/20',
      !status && 'bg-card'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn(
          'h-4 w-4',
          status === 'warning' && 'text-amber-500',
          status === 'critical' && 'text-red-500',
          !status && 'text-muted-foreground'
        )} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold text-foreground">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

function ImageViewer({ reportId, fileName }: { reportId: string; fileName?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    let previewUrl: string | null = null
    const fetchPreview = async () => {
      try {
        setLoading(true)
        setError(null)
        setImageUrl(null)
        const response = await apiClient.get(`/reports/${reportId}/download`, {
          params: { disposition: 'inline' },
          responseType: 'blob',
        })
        if (cancelled) return
        previewUrl = window.URL.createObjectURL(response.data)
        setImageUrl(previewUrl)
      } catch (err) {
        if (cancelled) return
        setError('Failed to load image preview')
        handleApiError(err, 'Failed to load image preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPreview()

    return () => {
      cancelled = true
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl)
      }
    }
  }, [reportId])

  if (loading) {
    return (
      <div className="aspect-[4/3] rounded-xl border bg-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="aspect-[4/3] rounded-xl border bg-muted flex items-center justify-center">
        <div className="text-center text-red-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="aspect-[4/3] rounded-xl border bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm">Image Preview Unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <img
        src={imageUrl}
        alt={fileName || 'Report image'}
        className="w-full h-auto"
      />
    </div>
  )
}

export function DetailsDrawer({ activity, open, onClose }: DetailsDrawerProps) {
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  if (!activity) return null

  const config = typeConfig[activity.type]
  const Icon = config.icon
  const isPdf = isPdfFile(activity.mimeType, activity.fileName)
  const isImage = isImageFile(activity.mimeType, activity.fileName)
  const status = activity.status ? statusConfig[activity.status] : null

  const handleCopyId = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(activity.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = async () => {
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
      link.href = blobUrl
      link.download = activity.fileName || 'report'
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

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        {/* Header with gradient */}
        <div className={cn('p-6 pb-4', config.bgColor)}>
          <SheetHeader className="space-y-4">
            <div className="flex items-start gap-4">
              <div className={cn(
                'h-14 w-14 rounded-xl flex items-center justify-center shrink-0',
                config.iconBg
              )}>
                <Icon className={cn('h-7 w-7', config.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {config.label}
                  </Badge>
                  {status && (
                    <Badge variant="outline" className={cn('text-xs', status.className)}>
                      {status.label}
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-left text-lg leading-tight">
                  {activity.title}
                </SheetTitle>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(activity.date, 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {format(activity.date, 'h:mm a')}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(activity.date, { addSuffix: true })}</span>
              <span>•</span>
              <button 
                onClick={handleCopyId}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                ID: {activity.id.slice(0, 8)}...
              </button>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tags */}
          {activity.tags && activity.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activity.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Appointment Details */}
          {activity.type === 'appointment' && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <SectionHeader icon={Stethoscope} title="Visit Information" />
                <div className="divide-y divide-border">
                  {activity.doctorName && (
                    <InfoRow icon={User} label="Doctor" value={activity.doctorName} />
                  )}
                  {activity.specialty && (
                    <InfoRow icon={Stethoscope} label="Specialty" value={activity.specialty} />
                  )}
                  {activity.clinic && (
                    <InfoRow icon={Building2} label="Clinic" value={activity.clinic} />
                  )}
                </div>
              </div>

              {activity.vitals && (
                <div>
                  <SectionHeader icon={Activity} title="Vitals" />
                  <div className="grid grid-cols-2 gap-3">
                    {activity.vitals.bloodPressure && (
                      <VitalCard
                        icon={Heart}
                        label="Blood Pressure"
                        value={activity.vitals.bloodPressure}
                        unit="mmHg"
                      />
                    )}
                    {activity.vitals.heartRate && (
                      <VitalCard
                        icon={Activity}
                        label="Heart Rate"
                        value={activity.vitals.heartRate}
                        unit="bpm"
                      />
                    )}
                    {activity.vitals.temperature && (
                      <VitalCard
                        icon={Thermometer}
                        label="Temperature"
                        value={activity.vitals.temperature}
                        unit="°F"
                      />
                    )}
                    {activity.vitals.weight && (
                      <VitalCard
                        icon={Scale}
                        label="Weight"
                        value={activity.vitals.weight}
                        unit="lbs"
                      />
                    )}
                  </div>
                </div>
              )}

              {activity.notes && (
                <div className="rounded-xl border bg-card p-4">
                  <SectionHeader icon={FileText} title="Visit Notes" />
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {activity.notes}
                  </p>
                </div>
              )}

              {(activity.linkedPrescriptions || activity.linkedReports) && (
                <div>
                  <SectionHeader icon={FileText} title="Linked Records" />
                  <div className="space-y-2">
                    {activity.linkedPrescriptions?.map((rx) => (
                      <div
                        key={rx}
                        className="flex items-center justify-between rounded-xl border bg-card p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <Pill className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <span className="text-sm font-medium">{rx}</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                    {activity.linkedReports?.map((report) => (
                      <div
                        key={report}
                        className="flex items-center justify-between rounded-xl border bg-card p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          <span className="text-sm font-medium">{report}</span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Prescription Details */}
          {activity.type === 'prescription' && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <SectionHeader icon={User} title="Prescribed By" />
                <p className="text-sm font-medium">{activity.doctorName}</p>
              </div>

              {activity.medications && activity.medications.length > 0 && (
                <div>
                  <SectionHeader icon={Pill} title="Medications" />
                  <div className="space-y-3">
                    {activity.medications.map((med, index) => (
                      <div key={index} className="rounded-xl border bg-card p-4">
                        <h4 className="font-semibold text-foreground mb-3">{med.name}</h4>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Dose</span>
                            <span className="font-medium">{med.dose}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Frequency</span>
                            <span className="font-medium">{med.frequency}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-xs mb-0.5">Duration</span>
                            <span className="font-medium">{med.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activity.warnings && activity.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-semibold text-amber-700 dark:text-amber-300">Important Warnings</h3>
                  </div>
                  <ul className="space-y-2">
                    {activity.warnings.map((warning, index) => (
                      <li key={index} className="flex gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <span className="text-amber-400">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Report Details */}
          {activity.type === 'report' && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <SectionHeader icon={FileText} title="File Information" />
                <div className="divide-y divide-border">
                  {activity.fileName && (
                    <InfoRow icon={FileText} label="File name" value={activity.fileName} />
                  )}
                  {activity.fileSize && (
                    <InfoRow label="File size" value={activity.fileSize} />
                  )}
                </div>
              </div>

              <div>
                <SectionHeader icon={FileText} title="Preview" />
                {activity.reportId ? (
                  isPdf ? (
                    <PDFViewer
                      reportId={activity.reportId}
                      fileName={activity.fileName}
                    />
                  ) : isImage ? (
                    <ImageViewer
                      reportId={activity.reportId}
                      fileName={activity.fileName}
                    />
                  ) : (
                    <div className="aspect-[4/3] rounded-xl border bg-muted flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm font-medium">Preview Unavailable</p>
                        <p className="text-xs mt-1">This file type cannot be previewed</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="aspect-[4/3] rounded-xl border bg-muted flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm font-medium">Preview Unavailable</p>
                      <p className="text-xs mt-1">Report ID not found</p>
                    </div>
                  </div>
                )}
              </div>

              {activity.notes && (
                <div className="rounded-xl border bg-card p-4">
                  <SectionHeader icon={FileText} title="Notes" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{activity.notes}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-3">
            {activity.type === 'report' && activity.reportId && (
              <>
                <Button className="flex-1 shadow-sm" onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isDownloading ? 'Downloading...' : 'Download'}
                </Button>
                <Button variant="outline" className="flex-1">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Full Report
                </Button>
              </>
            )}
            {activity.type === 'prescription' && (
              <>
                <Button className="flex-1 shadow-sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Prescription
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            {activity.type === 'appointment' && (
              <Button className="flex-1 shadow-sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Appointment Details
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
