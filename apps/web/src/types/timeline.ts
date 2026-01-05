export type ActivityType = 'appointment' | 'prescription' | 'report'
export type AppointmentStatus = 'completed' | 'cancelled' | 'no-show'
export type UserRole = 'patient' | 'doctor'

export interface TimelineActivity {
  id: string
  type: ActivityType
  date: Date
  title: string
  subtitle: string
  tags?: string[]
  status?: AppointmentStatus

  // Appointment-specific
  doctorName?: string
  specialty?: string
  clinic?: string

  // Prescription-specific
  medications?: {
    name: string
    dose: string
    frequency: string
    duration: string
  }[]
  warnings?: string[]

  // Report-specific
  fileName?: string
  fileSize?: string
  mimeType?: string
  reportId?: string

  // Details
  notes?: string
  vitals?: {
    bloodPressure?: string
    heartRate?: string
    temperature?: string
    weight?: string
  }
  linkedReports?: string[]
  linkedPrescriptions?: string[]

  // Full-text search metadata (available when useFullTextSearch=true)
  searchRank?: number
  highlightedTitle?: string
  highlightedSubtitle?: string
  highlightedNotes?: string
}

export interface FilterState {
  role: UserRole
  dateRange: {
    from: Date | null
    to: Date | null
  }
  types: ActivityType[]
  statuses: AppointmentStatus[]
  searchText: string
  /** Enable PostgreSQL full-text search for better results */
  useFullTextSearch?: boolean
}

/** Search metadata returned when using full-text search */
export interface SearchMetadata {
  /** Relevance ranking score */
  searchRank?: number
  /** Title with matched terms highlighted (HTML with <mark> tags) */
  highlightedTitle?: string
  /** Subtitle with matched terms highlighted */
  highlightedSubtitle?: string
  /** Notes with matched terms highlighted */
  highlightedNotes?: string
}
