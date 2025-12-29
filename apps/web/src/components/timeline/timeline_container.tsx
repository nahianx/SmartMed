'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Filter as FilterIcon,
  Search as SearchIcon,
  Upload,
} from 'lucide-react'
import type { Patient } from '@smartmed/types'
import {
  Button,
  Input,
  Badge,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@smartmed/ui'
import { handleApiError, showSuccess } from '@/lib/error_utils'
import { apiClient } from '@/services/apiClient'
import type { FilterState, TimelineActivity, UserRole } from '@/types/timeline'
import type { NotificationItem } from '@/types/notification'
import { FilterRail } from './filter_rail'
import { Timeline } from './timeline'
import { TopAppBar } from './top_app_bar'
import { DetailsDrawer } from './details_drawer'
import { NotificationsDrawer } from '@/components/notifications/notifications_drawer'

const DEFAULT_MAX_UPLOAD_MB = 20
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])

interface TimelineContainerProps {
  variant?: 'standalone' | 'embedded'
  initialRole?: UserRole
  lockRole?: boolean
  heading?: string
  subheading?: string
  uploadPatientId?: string
}

interface TimelineApiItem extends Omit<TimelineActivity, 'date'> {
  date: string
}

function mapApiItemToActivity(item: TimelineApiItem): TimelineActivity {
  return {
    ...item,
    date: new Date(item.date),
  }
}

export function TimelineContainer({
  variant = 'standalone',
  initialRole = 'patient',
  lockRole = false,
  heading = 'Activity timeline',
  subheading,
  uploadPatientId,
}: TimelineContainerProps) {
  const queryClient = useQueryClient()
  const resolvedRole = initialRole ?? 'patient'

  const [filters, setFilters] = useState<FilterState>({
    role: resolvedRole,
    dateRange: { from: null, to: null },
    types: [],
    statuses: [],
    searchText: '',
  })
  const canUpload = filters.role === 'patient'

  useEffect(() => {
    if (lockRole && filters.role !== resolvedRole) {
      setFilters((current) => ({ ...current, role: resolvedRole }))
    }
  }, [filters.role, lockRole, resolvedRole])

  const [selectedActivity, setSelectedActivity] =
    useState<TimelineActivity | null>(null)
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const envDemoPatientId = process.env.NEXT_PUBLIC_DEMO_PATIENT_ID || null
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const maxUploadSizeMb = Number(
    process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || DEFAULT_MAX_UPLOAD_MB,
  )
  const safeMaxUploadMb =
    Number.isFinite(maxUploadSizeMb) && maxUploadSizeMb > 0
      ? maxUploadSizeMb
      : DEFAULT_MAX_UPLOAD_MB
  const maxUploadBytes = safeMaxUploadMb * 1024 * 1024

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {}

    if (filters.dateRange.from)
      params.from = filters.dateRange.from.toISOString()
    if (filters.dateRange.to) params.to = filters.dateRange.to.toISOString()
    if (filters.types.length > 0) params.types = filters.types.join(',')
    if (filters.statuses.length > 0)
      params.statuses = filters.statuses.join(',')
    if (filters.searchText) params.search = filters.searchText

    return params
  }, [filters])

  const { data, isLoading } = useQuery({
    queryKey: ['timeline', queryParams, filters.role],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/timeline', { params: queryParams })
        return resp.data as { items: TimelineApiItem[] }
      } catch (error) {
        handleApiError(error, 'Failed to load timeline activities')
        throw error
      }
    },
    refetchInterval: 15000,
    retry: 2,
    retryDelay: 1000,
  })

  const activities = useMemo(() => {
    if (!data?.items) return []
    return data.items.map(mapApiItemToActivity)
  }, [data])

  const shouldFetchPatient = filters.role === 'patient' && !uploadPatientId

  const { data: currentPatientData, isLoading: isLoadingCurrentPatient } =
    useQuery({
      queryKey: ['currentPatient'],
      queryFn: async () => {
        try {
          const resp = await apiClient.get('/patient/profile')
          return resp.data as { patient: Patient }
        } catch (error) {
          handleApiError(error, 'Failed to load patient information')
          throw error
        }
      },
      enabled: shouldFetchPatient,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    })

  const currentPatient = currentPatientData?.patient
  const resolvedPatientId = canUpload
    ? uploadPatientId || currentPatient?.id || envDemoPatientId
    : null

  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/notifications')
        return resp.data as { items: NotificationItem[] }
      } catch (error) {
        handleApiError(error, 'Failed to load notifications')
        throw error
      }
    },
    refetchInterval: 30000,
    retry: 1,
  })

  const notifications = notificationsData?.items ?? []
  const unreadCount = notifications.filter((n) => !n.readAt).length
  const stats = useMemo(() => {
    const total = activities.length
    const appointments = activities.filter(
      (a) => a.type === 'appointment'
    ).length
    const prescriptions = activities.filter(
      (a) => a.type === 'prescription'
    ).length
    const reports = activities.filter((a) => a.type === 'report').length
    return { total, appointments, prescriptions, reports }
  }, [activities])

  const handleFiltersChange = (nextFilters: FilterState) => {
    setFilters(lockRole ? { ...nextFilters, role: resolvedRole } : nextFilters)
  }

  const handleOpenDetails = (activity: TimelineActivity) => {
    setSelectedActivity(activity)
    setDetailsDrawerOpen(true)
  }

  const handleCloseDetails = () => {
    setDetailsDrawerOpen(false)
    setTimeout(() => setSelectedActivity(null), 300)
  }

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await apiClient.post(`/notifications/${id}/read`)
      refetchNotifications()
      showSuccess('Notification marked as read')
    } catch (error) {
      handleApiError(error, 'Failed to mark notification as read')
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !resolvedPatientId) return

    const isAllowedType =
      ALLOWED_UPLOAD_MIME_TYPES.has(file.type) ||
      /\.(pdf|jpe?g|png)$/i.test(file.name)
    if (!isAllowedType) {
      handleApiError(new Error('Please select a PDF, JPG, or PNG file'))
      e.target.value = ''
      return
    }

    if (file.size > maxUploadBytes) {
      handleApiError(
        new Error(`File size must be less than ${safeMaxUploadMb}MB`),
      )
      e.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('patientId', resolvedPatientId)

    try {
      setUploading(true)
      await apiClient.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      showSuccess(`Report "${file.name}" uploaded successfully`)
      await queryClient.invalidateQueries({ queryKey: ['timeline'] })
    } catch (error) {
      handleApiError(error, 'Failed to upload report. Please try again.')
    } finally {
      e.target.value = ''
      setUploading(false)
    }
  }

  const uploadEnabled = canUpload && !!resolvedPatientId
  const lockedRole = lockRole ? resolvedRole : undefined
  const roleLabel = filters.role === 'doctor' ? 'doctor' : 'patient'

  const filterRail = (
    <FilterRail
      filters={filters}
      onFiltersChange={handleFiltersChange}
      lockedRole={lockedRole}
    />
  )

  const timelineBody = (
    <Timeline
      activities={activities}
      filters={filters}
      onOpenDetails={handleOpenDetails}
      isLoading={isLoading}
      userRole={filters.role}
    />
  )

  const renderEmbedded = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{heading}</h3>
            <Badge variant="outline">Linked to {roleLabel} profile</Badge>
          </div>
          <p className="text-sm text-slate-600">
            {subheading ||
              'See appointments, prescriptions, and reports directly inside the profile.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <FilterIcon className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNotificationsOpen(true)}
            className="relative"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 inline-flex h-2 w-2 rounded-full bg-red-500" />
            )}
          </Button>
          {canUpload && (
            <Button
              size="sm"
              onClick={handleUploadClick}
              disabled={!uploadEnabled || uploading}
              variant="default"
            >
              {uploading ? (
                <svg
                  className="h-4 w-4 mr-2 animate-spin text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" className="opacity-25" />
                  <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
                </svg>
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Upload report'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search doctors, meds, or files"
            className="pl-10"
            value={filters.searchText}
            onChange={(e) =>
              handleFiltersChange({ ...filters, searchText: e.target.value })
            }
          />
        </div>
        {lockedRole && (
          <span className="text-xs text-slate-600">
            Timeline is pinned to the {lockedRole} profile.
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <Badge variant="secondary">Total {stats.total}</Badge>
        <Badge variant="secondary">Appts {stats.appointments}</Badge>
        <Badge variant="secondary">Rx {stats.prescriptions}</Badge>
        <Badge variant="secondary">Reports {stats.reports}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <div className="hidden lg:block">
          <div className="rounded-lg border bg-white shadow-sm">
            {filterRail}
          </div>
        </div>
        <div className="rounded-lg border bg-white shadow-sm">
          <ScrollArea className="h-[32rem]">{timelineBody}</ScrollArea>
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="left" className="w-full sm:w-80 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Filter Activities</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            <FilterRail
              filters={filters}
              onFiltersChange={(newFilters: FilterState) => {
                handleFiltersChange(newFilters)
                if (window.innerWidth < 1024) {
                  setMobileFiltersOpen(false)
                }
              }}
              lockedRole={lockedRole}
            />
          </div>
        </SheetContent>
      </Sheet>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload report file"
      />

      <DetailsDrawer
        activity={selectedActivity}
        open={detailsDrawerOpen}
        onClose={handleCloseDetails}
      />

      <NotificationsDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
      />
    </div>
  )

  const renderStandalone = () => (
    <div className="flex h-screen flex-col bg-gray-50">
      <TopAppBar
        onMenuClick={() => setMobileFiltersOpen(true)}
        showMenuButton
        onNotificationsClick={() => setNotificationsOpen(true)}
        hasUnreadNotifications={unreadCount > 0}
        onUploadClick={uploadEnabled ? handleUploadClick : undefined}
        uploadDisabled={!uploadEnabled || uploading}
        hideUploadButton={!canUpload}
        searchValue={filters.searchText}
        onSearchChange={(value: string) =>
          handleFiltersChange({
            ...filters,
            searchText: value,
          })
        }
        uploading={uploading}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload report file"
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <ScrollArea className="h-full w-72 border-r bg-gray-50">
            {filterRail}
          </ScrollArea>
        </div>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="left" className="w-full sm:w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Filter Activities</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto">
              <FilterRail
                filters={filters}
                onFiltersChange={(newFilters: FilterState) => {
                  handleFiltersChange(newFilters)
                  if (window.innerWidth < 1024) {
                    setMobileFiltersOpen(false)
                  }
                }}
                lockedRole={lockedRole}
              />
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">{timelineBody}</ScrollArea>
        </main>

        <DetailsDrawer
          activity={selectedActivity}
          open={detailsDrawerOpen}
          onClose={handleCloseDetails}
        />

        <NotificationsDrawer
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          notifications={notifications}
          onMarkRead={handleMarkNotificationRead}
        />
      </div>
    </div>
  )

  return variant === 'embedded' ? renderEmbedded() : renderStandalone()
}
