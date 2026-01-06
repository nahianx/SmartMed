import { useState, type KeyboardEvent } from 'react'
import { 
  Search, 
  Calendar as CalendarIcon, 
  Stethoscope, 
  Pill, 
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sliders,
  X
} from 'lucide-react'
import { Button, Input, Checkbox, Separator, Badge, Popover, PopoverContent, PopoverTrigger } from '@smartmed/ui'
import { DayPicker } from 'react-day-picker'
import type { FilterState, ActivityType, AppointmentStatus, UserRole } from '@/types/timeline'
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'

interface FilterRailProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  lockedRole?: UserRole
}

interface FilterSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  badge?: number | string
}

function FilterSection({ title, icon, children, defaultExpanded = true, badge }: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge !== undefined && badge !== 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      
      <div className={cn(
        'space-y-3 overflow-hidden transition-all duration-200',
        isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        {children}
      </div>
    </div>
  )
}

const quickDateOptions = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This month', type: 'thisMonth' as const },
  { label: 'Last month', type: 'lastMonth' as const },
  { label: 'All time', type: 'all' as const },
]

const activityTypes: { type: ActivityType; label: string; icon: typeof Stethoscope; color: string }[] = [
  { type: 'appointment', label: 'Appointments', icon: Stethoscope, color: 'text-blue-500' },
  { type: 'prescription', label: 'Prescriptions', icon: Pill, color: 'text-emerald-500' },
  { type: 'report', label: 'Reports', icon: FileText, color: 'text-violet-500' },
]

const appointmentStatuses: { status: AppointmentStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { status: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
  { status: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-gray-500' },
  { status: 'no-show', label: 'No-show', icon: AlertCircle, color: 'text-red-500' },
]

export function FilterRail({ filters, onFiltersChange, lockedRole }: FilterRailProps) {
  const [datePickerOpen, setDatePickerOpen] = useState<'from' | 'to' | null>(null)

  const updateFilters = (updates: Partial<FilterState>) => {
    if (lockedRole && updates.role && updates.role !== lockedRole) {
      return
    }
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

  const handleStatusKeyDown = (status: AppointmentStatus, e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleStatus(status)
    }
  }

  const setQuickDateRange = (option: typeof quickDateOptions[number]) => {
    if ('type' in option) {
      switch (option.type) {
        case 'all':
          updateFilters({ dateRange: { from: null, to: null } })
          break
        case 'thisMonth':
          updateFilters({ dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } })
          break
        case 'lastMonth':
          const lastMonth = subMonths(new Date(), 1)
          updateFilters({ dateRange: { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) } })
          break
      }
    } else {
      const to = new Date()
      const from = subDays(to, option.days)
      updateFilters({ dateRange: { from, to } })
    }
  }

  const resetFilters = () => {
    updateFilters({
      dateRange: { from: null, to: null },
      types: [],
      statuses: [],
      searchText: '',
    })
  }

  const activeFilterCount = 
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0) +
    filters.types.length +
    filters.statuses.length +
    (filters.searchText ? 1 : 0)

  const hasDateRange = filters.dateRange.from || filters.dateRange.to

  return (
    <aside className="w-full lg:w-72 bg-card border-r p-5 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Filters</h2>
          {activeFilterCount > 0 && (
            <Badge variant="default" className="h-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <Separator />

      {/* Search */}
      <div className="space-y-2">
        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          Search
        </span>
        <div className="relative">
          <Input
            placeholder="Doctor, specialty, file..."
            value={filters.searchText}
            onChange={(e) => updateFilters({ searchText: e.target.value })}
            className="pr-8"
          />
          {filters.searchText && (
            <button
              onClick={() => updateFilters({ searchText: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <Separator />

      {/* Date Range */}
      <FilterSection 
        title="Date Range" 
        icon={<CalendarIcon className="h-4 w-4" />}
        badge={hasDateRange ? '1' : undefined}
      >
        {/* Quick options grid */}
        <div className="grid grid-cols-2 gap-2">
          {quickDateOptions.map((option) => {
            const isActive = 
              ('type' in option && option.type === 'all' && !hasDateRange) ||
              ('days' in option && filters.dateRange.from && filters.dateRange.to &&
                Math.abs(filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) === option.days * 24 * 60 * 60 * 1000)
            
            return (
              <Button
                key={option.label}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickDateRange(option)}
                className={cn('h-8 text-xs justify-center', isActive && 'shadow-sm')}
              >
                {option.label}
              </Button>
            )
          })}
        </div>

        {/* Custom date pickers */}
        <div className="space-y-2 pt-2">
          <span className="text-xs text-muted-foreground">Or select custom range</span>
          <div className="grid grid-cols-2 gap-2">
            <Popover open={datePickerOpen === 'from'} onOpenChange={(open) => setDatePickerOpen(open ? 'from' : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 justify-start text-xs',
                    filters.dateRange.from && 'border-primary'
                  )}
                  aria-expanded={datePickerOpen === 'from'}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {filters.dateRange.from ? format(filters.dateRange.from, 'MMM d') : 'From'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 shadow-lg border bg-card" align="start" side="bottom">
                <div className="p-3">
                  <DayPicker
                    mode="single"
                    selected={filters.dateRange.from || undefined}
                    onSelect={(date: Date | undefined) => {
                      updateFilters({ dateRange: { ...filters.dateRange, from: date || null } })
                      setDatePickerOpen(null)
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={datePickerOpen === 'to'} onOpenChange={(open) => setDatePickerOpen(open ? 'to' : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 justify-start text-xs',
                    filters.dateRange.to && 'border-primary'
                  )}
                  aria-expanded={datePickerOpen === 'to'}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {filters.dateRange.to ? format(filters.dateRange.to, 'MMM d') : 'To'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 shadow-lg border bg-card" align="start" side="bottom">
                <div className="p-3">
                  <DayPicker
                    mode="single"
                    selected={filters.dateRange.to || undefined}
                    onSelect={(date: Date | undefined) => {
                      updateFilters({ dateRange: { ...filters.dateRange, to: date || null } })
                      setDatePickerOpen(null)
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </FilterSection>

      <Separator />

      {/* Activity Type */}
      <FilterSection 
        title="Activity Type"
        badge={filters.types.length > 0 ? filters.types.length : undefined}
      >
        <div className="space-y-1">
          {activityTypes.map(({ type, label, icon: Icon, color }) => (
            <label 
              key={type}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                'hover:bg-muted/50',
                filters.types.includes(type) && 'bg-primary/10'
              )}
            >
              <Checkbox
                checked={filters.types.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              <Icon className={cn('h-4 w-4', color)} />
              <span className="text-sm flex-1">{label}</span>
              {filters.types.includes(type) && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </label>
          ))}
        </div>
      </FilterSection>

      <Separator />

      {/* Appointment Status */}
      <FilterSection 
        title="Appointment Status"
        badge={filters.statuses.length > 0 ? filters.statuses.length : undefined}
      >
        <div className="flex flex-wrap gap-2">
          {appointmentStatuses.map(({ status, label, icon: Icon, color }) => {
            const isActive = filters.statuses.includes(status)
            
            return (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                onKeyDown={(e) => handleStatusKeyDown(status, e)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  'border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                  isActive 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                )}
                aria-pressed={isActive}
                aria-label={`Filter by ${label} status`}
                tabIndex={0}
              >
                <Icon className={cn('h-3 w-3', !isActive && color)} />
                {label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Filter appointments by their completion status
        </p>
      </FilterSection>

      {/* Active filters summary */}
      {activeFilterCount > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Filters
            </span>
            <div className="flex flex-wrap gap-1.5">
              {filters.searchText && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Search: "{filters.searchText}"
                  <button 
                    onClick={() => updateFilters({ searchText: '' })}
                    aria-label="Clear search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {hasDateRange && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  {filters.dateRange.from && format(filters.dateRange.from, 'MMM d')}
                  {' - '}
                  {filters.dateRange.to && format(filters.dateRange.to, 'MMM d')}
                  <button 
                    onClick={() => updateFilters({ dateRange: { from: null, to: null } })}
                    aria-label="Clear date range filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.types.map(type => (
                <Badge key={type} variant="secondary" className="gap-1 text-xs capitalize">
                  {type}
                  <button 
                    onClick={() => toggleType(type)}
                    aria-label={`Remove ${type} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {filters.statuses.map(status => (
                <Badge key={status} variant="secondary" className="gap-1 text-xs capitalize">
                  {status}
                  <button 
                    onClick={() => toggleStatus(status)}
                    aria-label={`Remove ${status} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
