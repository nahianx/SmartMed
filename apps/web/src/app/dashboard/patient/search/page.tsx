'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  Save,
  Calendar,
  Clock,
  X,
  Stethoscope,
  Video,
  Building2,
  GraduationCap,
  Heart,
  UserCheck,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Badge, Button, Card, Input, Skeleton, Avatar, AvatarFallback } from '@smartmed/ui'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../../../../context/AuthContext'
import {
  useDoctorSearch,
  useSpecializations,
  usePreferredDoctors,
  useAddPreferredDoctor,
} from '../../../../hooks/useProfile'
import type { Doctor } from '@smartmed/types'
import { appointmentService } from '../../../../services/appointmentService'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { resolveProfilePhotoUrl } from '@/utils/apiBase'

interface Preset {
  name: string
  query: string
  specialization?: string
  location?: string
}

interface AvailabilitySlot {
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}

export default function DoctorFinderPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [specialization, setSpecialization] = useState<string>('')
  const [location, setLocation] = useState<string>('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [presets, setPresets] = useState<Preset[]>([])
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null)
  const [bookDateTime, setBookDateTime] = useState('')
  const [bookDuration, setBookDuration] = useState(30)
  const [bookReason, setBookReason] = useState('')
  const [bookError, setBookError] = useState<string | null>(null)
  const [bookSubmitting, setBookSubmitting] = useState(false)
  const [bookingNotice, setBookingNotice] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [availabilitySlots, setAvailabilitySlots] = useState<
    AvailabilitySlot[]
  >([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  )

  useEffect(() => {
    const saved = localStorage.getItem('doctor-search-presets')
    if (saved) {
      setPresets(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(id)
  }, [query])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/login')
      } else if (user.role !== 'PATIENT') {
        router.replace('/')
      }
    }
  }, [loading, user, router])

  const { data: specializations = [], isLoading: specsLoading } =
    useSpecializations()
  const { data: doctors = [], isLoading } = useDoctorSearch(
    debouncedQuery,
    specialization,
    location
  )
  
  // Preferred doctors hooks
  const { data: preferredRecords = [] } = usePreferredDoctors()
  const addPreferredMutation = useAddPreferredDoctor()
  
  // Get set of preferred doctor IDs for quick lookup
  const preferredDoctorIds = useMemo(() => {
    return new Set((preferredRecords as any[]).map(record => record.doctorId || record.doctor?.id))
  }, [preferredRecords])
  
  // Check if a doctor is preferred
  const isDoctorPreferred = (doctor: Doctor) => {
    return preferredDoctorIds.has(doctor.id)
  }
  
  // Handle adding to preferred
  const handleAddToPreferred = async (doctor: Doctor) => {
    try {
      await addPreferredMutation.mutateAsync(doctor.id)
    } catch (error) {
      console.error("Error adding preferred doctor:", error)
    }
  }

  const handleSavePreset = () => {
    if (!query && !specialization && !location) return
    const next: Preset[] = [
      ...presets,
      {
        name: query || specialization || location || 'Saved search',
        query,
        specialization,
        location,
      },
    ]
    setPresets(next)
    localStorage.setItem('doctor-search-presets', JSON.stringify(next))
  }

  const applyPreset = (preset: Preset) => {
    setQuery(preset.query)
    setSpecialization(preset.specialization || '')
    setLocation(preset.location || '')
  }

  const filtered = useMemo(() => doctors, [doctors])

  useEffect(() => {
    if (!bookingDoctor) {
      setSelectedDate('')
      setAvailabilitySlots([])
      setAvailabilityError(null)
      return
    }
    setSelectedDate(new Date().toISOString().slice(0, 10))
  }, [bookingDoctor])

  useEffect(() => {
    if (selectedDate) {
      setBookDateTime('')
    }
  }, [selectedDate])

  useEffect(() => {
    const loadAvailability = async () => {
      if (!bookingDoctor || !selectedDate) return
      try {
        setAvailabilityLoading(true)
        setAvailabilityError(null)
        const date = new Date(`${selectedDate}T00:00:00.000Z`)
        const slots = await appointmentService.getDoctorAvailability({
          doctorId: bookingDoctor.id,
          startDate: date,
          endDate: date,
          duration: bookDuration,
        })
        setAvailabilitySlots(slots)
      } catch (err: any) {
        setAvailabilityError(
          err?.response?.data?.error ||
            'Failed to load availability for this date.'
        )
      } finally {
        setAvailabilityLoading(false)
      }
    }

    loadAvailability()
  }, [bookingDoctor, selectedDate, bookDuration])

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    if (!slot.isAvailable) return
    setBookDateTime(`${slot.date}T${slot.startTime}`)
    setBookError(null)
  }

  const handleBook = async () => {
    if (!bookingDoctor || !bookDateTime || !bookReason.trim()) {
      setBookError('Select a time and add a reason to book.')
      return
    }

    try {
      setBookSubmitting(true)
      setBookError(null)
      setBookingNotice(null)
      const isoDate = new Date(bookDateTime).toISOString()
      const validation = await appointmentService.validateAppointment({
        doctorId: bookingDoctor.id,
        dateTime: isoDate,
        duration: bookDuration,
      })
      if (validation && validation.valid === false) {
        setBookError('Selected time conflicts with availability.')
        setBookSubmitting(false)
        return
      }
      await appointmentService.createAppointment({
        doctorId: bookingDoctor.id,
        dateTime: isoDate,
        duration: bookDuration,
        reason: bookReason.trim(),
        notes: undefined,
      })
      setBookingDoctor(null)
      setBookDateTime('')
      setBookReason('')
      setBookError(null)
      setBookingNotice(
        'Appointment request sent. Awaiting doctor approval.'
      )
    } catch (err: any) {
      setBookError(
        err?.response?.data?.error || 'Booking failed. Please try again.'
      )
    } finally {
      setBookSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader />

      {/* Page Title Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Find a Doctor</h1>
              <p className="text-blue-100 mt-1">
                Search from our network of qualified healthcare professionals
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search Section */}
        <Card className="p-6 shadow-lg border-0 bg-card/50 backdrop-blur-sm -mt-8 relative z-10">
          <div className="space-y-4">
            {/* Main Search Row */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by doctor name, specialty, or keyword..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-12 h-12 text-base border-2 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Specialty Dropdown */}
              <div className="relative min-w-[200px]">
                <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <select
                  title="Select specialty"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 border-2 border-border bg-background text-foreground rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">All specialties</option>
                  {specsLoading
                    ? null
                    : specializations.map((spec: any) => (
                        <option key={spec.id} value={spec.name}>
                          {spec.name}
                        </option>
                      ))}
                </select>
              </div>

              {/* Location Input */}
              <div className="relative min-w-[200px]">
                <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="City or location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Save Preset Button */}
              <Button
                variant="outline"
                onClick={handleSavePreset}
                className="h-12 gap-2 px-6"
                disabled={!query && !specialization && !location}
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save Search</span>
              </Button>
            </div>

            {/* Saved Presets */}
            {presets.length > 0 && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Saved searches:</span>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset, idx) => (
                    <Badge
                      key={`${preset.name}-${idx}`}
                      variant="secondary"
                      className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors px-3 py-1"
                      onClick={() => applyPreset(preset)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {preset.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Success Notice */}
        {bookingNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-5 py-4 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-200">Booking Confirmed!</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">{bookingNotice}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {isLoading ? 'Searching...' : filtered.length > 0 ? `${filtered.length} Doctor${filtered.length !== 1 ? 's' : ''} Found` : 'Search Results'}
              </h2>
            </div>
            {filtered.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing qualified healthcare professionals
              </p>
            )}
          </div>

          {/* Results Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <div className="p-4 bg-muted rounded-full">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">No doctors found</h3>
                  <p className="text-muted-foreground mt-2">
                    We couldn't find any doctors matching your search criteria. Try adjusting your filters or search terms.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setSpecialization('Cardiology')}>
                    Try Cardiology
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setSpecialization('Dermatology')}>
                    Try Dermatology
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setSpecialization('Pediatrics')}>
                    Try Pediatrics
                  </Badge>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((doctor: Doctor) => (
                <Card key={doctor.id} className="p-5 hover:shadow-lg transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-800 group">
                  <div className="flex items-start gap-4">
                    {/* Doctor Avatar */}
                    <Avatar className="h-16 w-16 border-2 border-blue-100 dark:border-blue-900">
                      {(doctor as any).profilePhotoUrl ? (
                        <img 
                          src={resolveProfilePhotoUrl((doctor as any).profilePhotoUrl)} 
                          alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-lg font-semibold">
                          {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    {/* Doctor Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                            Dr. {doctor.firstName} {doctor.lastName}
                          </h3>
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {doctor.specialization}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-medium">4.8</span>
                        </div>
                      </div>

                      {/* Experience & Location */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <GraduationCap className="h-4 w-4 flex-shrink-0" />
                          <span>{doctor.experience ? `${doctor.experience}+ years experience` : 'Experienced professional'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {(doctor as any).clinic?.name || (doctor as any).clinic?.address || 'Private Practice'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Video className="h-3 w-3" /> Video Consult
                    </Badge>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <MapPin className="h-3 w-3" /> In-Person
                    </Badge>
                    {isDoctorPreferred(doctor) ? (
                      <Badge className="gap-1 text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                        <Star className="h-3 w-3 fill-current" /> Preferred
                      </Badge>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToPreferred(doctor);
                        }}
                        disabled={addPreferredMutation.isPending}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50"
                      >
                        {addPreferredMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Heart className="h-3 w-3" />
                        )}
                        Add to Preferred
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-4">
                    <Button
                      className="flex-1"
                      onClick={() => router.push(`/doctor/${doctor.userId}`)}
                    >
                      View Profile
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => setBookingDoctor(doctor)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Now
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {bookingDoctor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-white/20">
                    {(bookingDoctor as any).profilePhotoUrl ? (
                      <img 
                        src={resolveProfilePhotoUrl((bookingDoctor as any).profilePhotoUrl)} 
                        alt={`Dr. ${bookingDoctor.firstName} ${bookingDoctor.lastName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
                        {bookingDoctor.firstName?.[0]}{bookingDoctor.lastName?.[0]}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-sm text-blue-100">Book Appointment</p>
                    <h3 className="text-xl font-semibold">
                      Dr. {bookingDoctor.firstName} {bookingDoctor.lastName}
                    </h3>
                    <p className="text-sm text-blue-200">{bookingDoctor.specialization}</p>
                  </div>
                </div>
                <button
                  onClick={() => setBookingDoctor(null)}
                  aria-label="Close"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Date & Duration Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Select Date
                  </label>
                  <Input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Duration
                  </label>
                  <select
                    title="Select duration"
                    value={bookDuration}
                    onChange={(e) => setBookDuration(Number(e.target.value))}
                    className="w-full h-11 border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background"
                  >
                    {[15, 30, 45, 60].map((d) => (
                      <option key={d} value={d}>
                        {d} minutes
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Available Slots */}
              <div>
                <label className="block text-sm font-medium mb-3 text-foreground">
                  Available Time Slots
                </label>
                {availabilityLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading available slots...
                  </div>
                ) : availabilityError ? (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{availabilityError}</div>
                ) : availabilitySlots.length === 0 ? (
                  <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg text-center">
                    No available slots for this date. Try another date.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {availabilitySlots.map((slot) => {
                      const slotValue = `${slot.date}T${slot.startTime}`
                      const selected = bookDateTime === slotValue
                      return (
                        <button
                          key={`${slot.date}-${slot.startTime}`}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          disabled={!slot.isAvailable}
                          className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                            slot.isAvailable
                              ? selected
                                ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                                : 'border-border text-foreground hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                              : 'border-border bg-muted text-muted-foreground cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Manual DateTime (fallback) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Or select specific time
                </label>
                <Input
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  value={bookDateTime}
                  onChange={(e) => setBookDateTime(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Reason for Visit
                </label>
                <textarea
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  rows={3}
                  className="w-full border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background resize-none"
                  placeholder="Briefly describe your symptoms or reason for the appointment..."
                />
              </div>

              {/* Error/Success Messages */}
              {bookError && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg flex items-center gap-2">
                  <X className="h-4 w-4" />
                  {bookError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <Button
                className="flex-1 h-12 text-base"
                onClick={handleBook}
                disabled={bookSubmitting || !bookDateTime || !bookReason.trim()}
              >
                {bookSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Confirm Appointment
                  </>
                )}
              </Button>
              <Button
                className="flex-1 h-12"
                variant="outline"
                onClick={() => setBookingDoctor(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
