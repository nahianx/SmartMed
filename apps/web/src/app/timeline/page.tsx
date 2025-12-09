"use client"

import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/apiClient'
import { handleApiError, showSuccess } from '@/lib/error_utils'
import type { FilterState, TimelineActivity } from '@/types/timeline'
import { TopAppBar } from '@/components/timeline/top_app_bar'
import type { Patient } from '@smartmed/types'
import { FilterRail } from '@/components/timeline/filter_rail'
import { Timeline } from '@/components/timeline/timeline'
import { DetailsDrawer } from '@/components/timeline/details_drawer'
import { NotificationsDrawer } from '@/components/notifications/notifications_drawer'
import { ScrollArea, Sheet, SheetContent, SheetHeader, SheetTitle } from '@smartmed/ui'
import type { NotificationItem } from '@/types/notification'

interface TimelineApiItem extends Omit<TimelineActivity, 'date'> {
  date: string
}

function mapApiItemToActivity(item: TimelineApiItem): TimelineActivity {
  return {
    ...item,
    date: new Date(item.date),
  }
}

export default function TimelinePage() {
  const queryClient = useQueryClient()

  const [filters, setFilters] = useState<FilterState>({
    role: 'patient',
    dateRange: { from: null, to: null },
    types: [],
    statuses: [],
    searchText: '',
  })

  const [selectedActivity, setSelectedActivity] = useState<TimelineActivity | null>(null)
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {}

    if (filters.dateRange.from) params.from = filters.dateRange.from.toISOString()
    if (filters.dateRange.to) params.to = filters.dateRange.to.toISOString()
    if (filters.types.length > 0) params.types = filters.types.join(',')
    if (filters.statuses.length > 0) params.statuses = filters.statuses.join(',')
    if (filters.searchText) params.search = filters.searchText

    return params
  }, [filters])

  const { data, isLoading } = useQuery({
    queryKey: ['timeline', queryParams],
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

  const {
    data: currentPatientData,
    isLoading: isLoadingCurrentPatient,
  } = useQuery({
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
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const currentPatient = currentPatientData?.patient

  const {
    data: notificationsData,
    refetch: refetchNotifications,
  } = useQuery({
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

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !currentPatient) return

    // Validate file type and size
    if (file.type !== 'application/pdf') {
      handleApiError(new Error('Please select a PDF file'))
      e.target.value = ''
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      handleApiError(new Error('File size must be less than 20MB'))
      e.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('patientId', currentPatient.id)

    try {
      setUploading(true)
      await apiClient.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      // Show success message
      showSuccess(`Report "${file.name}" uploaded successfully`)
      
      // Refresh timeline to include the new report activity
      await queryClient.invalidateQueries({ queryKey: ['timeline'] })
    } catch (error) {
      handleApiError(error, 'Failed to upload report. Please try again.')
    } finally {
      e.target.value = ''
      setUploading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <TopAppBar
        onMenuClick={() => setMobileFiltersOpen(true)}
        showMenuButton
        onNotificationsClick={() => setNotificationsOpen(true)}
        hasUnreadNotifications={unreadCount > 0}
        onUploadClick={currentPatient ? handleUploadClick : undefined}
        uploadDisabled={!currentPatient || isLoadingCurrentPatient || uploading}
        searchValue={filters.searchText}
        onSearchChange={(value: string) =>
          setFilters((f: FilterState) => ({
            ...f,
            searchText: value,
          }))
        }
        uploading={uploading}
      />

      {/* Hidden file input for report upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload report PDF"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Filter Rail */}
        <div className="hidden lg:block">
          <ScrollArea className="h-full w-72 border-r bg-gray-50">
            <FilterRail filters={filters} onFiltersChange={setFilters} />
          </ScrollArea>
        </div>

        {/* Mobile Filter Drawer */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="left" className="w-full sm:w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Filter Activities</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto">
              <FilterRail 
                filters={filters} 
                onFiltersChange={(newFilters: FilterState) => {
                  setFilters(newFilters)
                  // Auto-close mobile drawer when filters change on small screens
                  if (window.innerWidth < 1024) {
                    setMobileFiltersOpen(false)
                  }
                }} 
              />
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <Timeline
              activities={activities}
              filters={filters}
              onOpenDetails={handleOpenDetails}
              isLoading={isLoading}
            />
          </ScrollArea>
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
}
