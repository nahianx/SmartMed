import { useState } from 'react'
import { Search, Calendar as CalendarIcon } from 'lucide-react'
import { Button, Input, Checkbox, Separator, Badge, Popover, PopoverContent, PopoverTrigger } from '@smartmed/ui'
import { DayPicker } from 'react-day-picker'
import type { FilterState, ActivityType, AppointmentStatus } from '@/types/timeline'
import { format } from 'date-fns'

interface FilterRailProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export function FilterRail({ filters, onFiltersChange }: FilterRailProps) {
  const [datePickerOpen, setDatePickerOpen] = useState<'from' | 'to' | null>(null)

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const toggleType = (type: ActivityType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type]
    updateFilters({ types: newTypes })
  }

  const toggleStatus = (status: AppointmentStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    updateFilters({ statuses: newStatuses })
  }

  const setQuickDateRange = (days: number | null) => {
    if (days === null) {
      updateFilters({ dateRange: { from: null, to: null } })
    } else {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - days)
      updateFilters({ dateRange: { from, to } })
    }
  }

  return (
    <aside className="w-full lg:w-64 lg:border-r bg-gray-50 p-4 space-y-6 overflow-y-auto">
      <div className="space-y-2">
        <span className="text-sm font-medium">View as</span>
        <div className="flex gap-2">
          <Button
            variant={filters.role === 'patient' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilters({ role: 'patient' })}
            className="flex-1"
          >
            Patient
          </Button>
          <Button
            variant={filters.role === 'doctor' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilters({ role: 'doctor' })}
            className="flex-1"
          >
            Doctor
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <span className="text-sm font-medium">Date Range</span>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange(30)}
          >
            30d
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange(90)}
          >
            90d
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickDateRange(null)}
          >
            All
          </Button>
        </div>

        <div className="space-y-2">
          <Popover open={datePickerOpen === 'from'} onOpenChange={(open) => setDatePickerOpen(open ? 'from' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? format(filters.dateRange.from, 'MMM dd, yyyy') : 'From date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="single"
                selected={filters.dateRange.from || undefined}
                onSelect={(date: Date | undefined) => {
                  updateFilters({ dateRange: { ...filters.dateRange, from: date || null } })
                  setDatePickerOpen(null)
                }}
              />
            </PopoverContent>
          </Popover>

          <Popover open={datePickerOpen === 'to'} onOpenChange={(open) => setDatePickerOpen(open ? 'to' : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.to ? format(filters.dateRange.to, 'MMM dd, yyyy') : 'To date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="single"
                selected={filters.dateRange.to || undefined}
                onSelect={(date: Date | undefined) => {
                  updateFilters({ dateRange: { ...filters.dateRange, to: date || null } })
                  setDatePickerOpen(null)
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <span className="text-sm font-medium">Activity Type</span>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.types.includes('appointment')}
              onCheckedChange={() => toggleType('appointment')}
            />
            <span className="text-sm">Appointments</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.types.includes('prescription')}
              onCheckedChange={() => toggleType('prescription')}
            />
            <span className="text-sm">Prescriptions</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={filters.types.includes('report')}
              onCheckedChange={() => toggleType('report')}
            />
            <span className="text-sm">Reports</span>
          </label>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <span className="text-sm font-medium">Status (Appointments)</span>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filters.statuses.includes('completed') ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleStatus('completed')}
          >
            Completed
          </Badge>
          <Badge
            variant={filters.statuses.includes('cancelled') ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleStatus('cancelled')}
          >
            Cancelled
          </Badge>
          <Badge
            variant={filters.statuses.includes('no-show') ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleStatus('no-show')}
          >
            No-show
          </Badge>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <span className="text-sm font-medium">Search</span>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Doctor, specialty, file..."
            value={filters.searchText}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
            className="pl-10"
          />
        </div>
      </div>
    </aside>
  )
}