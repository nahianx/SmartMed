'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  GraduationCap,
  Video,
  Building2,
  Calendar,
  Heart,
  Phone,
  Mail,
  Award,
  Loader2,
  User,
  CheckCircle,
  Shield,
  MessageSquare,
  Stethoscope,
  BadgeCheck,
  Briefcase,
  X,
} from 'lucide-react'
import {
  Button,
  Card,
  Badge,
  Avatar,
  AvatarFallback,
  Skeleton,
  Input,
} from '@smartmed/ui'
import { DashboardHeader } from '@/components/layout/DashboardHeader'
import { resolveProfilePhotoUrl } from '@/utils/apiBase'
import { usePreferredDoctors, useAddPreferredDoctor, useRemovePreferredDoctor } from '@/hooks/useProfile'
import { useAuthContext } from '@/context/AuthContext'
import { appointmentService, AvailabilitySlot } from '@/services/appointmentService'

interface DoctorProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  specialization: string
  qualification?: string
  experience?: number
  consultationFee?: number
  profilePhotoUrl?: string
  bio?: string
  education?: string
  phoneNumber?: string
  licenseNumber?: string
  availabilityStatus?: string
  isAvailable?: boolean
  clinic?: {
    name?: string
    address?: string
    phone?: string
  }
  user?: {
    email?: string
    phoneNumber?: string
    profilePhotoUrl?: string
  }
}

export default function DoctorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const doctorId = params.id as string

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookDateTime, setBookDateTime] = useState('')
  const [bookDuration, setBookDuration] = useState(30)
  const [bookReason, setBookReason] = useState('')
  const [bookError, setBookError] = useState<string | null>(null)
  const [bookSubmitting, setBookSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  // Doctor's weekly schedule
  interface ScheduleSlot {
    dayOfWeek: number
    startTime: string
    endTime: string
    hasBreak: boolean
    breakStart?: string
    breakEnd?: string
  }
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)

  // Preferred doctors
  const { data: preferredRecords = [] } = usePreferredDoctors()
  const addPreferredMutation = useAddPreferredDoctor()
  const removePreferredMutation = useRemovePreferredDoctor()

  const isPreferred = (preferredRecords as any[]).some(
    (record) => record.doctorId === doctor?.id || record.doctor?.id === doctor?.id
  )

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1080/api'}/doctors/profile?userId=${doctorId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Doctor not found')
        }

        const data = await response.json()
        setDoctor(data.doctor || data)
      } catch (err: any) {
        setError(err.message || 'Failed to load doctor profile')
      } finally {
        setLoading(false)
      }
    }

    if (doctorId) {
      fetchDoctor()
    }
  }, [doctorId])

  // Fetch availability when booking modal is open and date changes
  useEffect(() => {
    if (!showBookingModal || !doctor || !selectedDate) return

    const loadAvailability = async () => {
      setAvailabilityLoading(true)
      setAvailabilityError(null)
      try {
        // Create start and end date for the selected day
        const startDate = new Date(selectedDate)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(selectedDate)
        endDate.setHours(23, 59, 59, 999)

        const slots = await appointmentService.getDoctorAvailability({
          doctorId: doctor.id,
          startDate,
          endDate,
          duration: bookDuration,
        })
        setAvailabilitySlots(slots)
      } catch (err: any) {
        console.error('Failed to load availability:', err)
        setAvailabilityError('Unable to load available time slots. Please try again.')
        setAvailabilitySlots([])
      } finally {
        setAvailabilityLoading(false)
      }
    }

    loadAvailability()
  }, [showBookingModal, doctor, selectedDate, bookDuration])

  // Fetch doctor's weekly schedule
  useEffect(() => {
    if (!doctor?.id) return

    const loadSchedule = async () => {
      setScheduleLoading(true)
      try {
        const scheduleData = await appointmentService.getDoctorSchedule(doctor.id)
        setSchedule(scheduleData)
      } catch (err) {
        console.error('Failed to load doctor schedule:', err)
        setSchedule([])
      } finally {
        setScheduleLoading(false)
      }
    }

    loadSchedule()
  }, [doctor?.id])

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    if (!slot.isAvailable) return
    setBookDateTime(`${slot.date}T${slot.startTime}`)
    setBookError(null)
  }

  const handleTogglePreferred = async () => {
    if (!doctor) return

    try {
      if (isPreferred) {
        await removePreferredMutation.mutateAsync(doctor.id)
      } else {
        await addPreferredMutation.mutateAsync(doctor.id)
      }
    } catch (error) {
      console.error('Error toggling preferred:', error)
    }
  }

  const handleBookAppointment = () => {
    // Reset booking state and open modal
    setBookDateTime('')
    setBookReason('')
    setBookError(null)
    setBookingSuccess(false)
    setSelectedDate(new Date().toISOString().slice(0, 10))
    setAvailabilitySlots([])
    setShowBookingModal(true)
  }

  const handleCloseBookingModal = () => {
    setShowBookingModal(false)
    setBookDateTime('')
    setBookReason('')
    setBookError(null)
    setSelectedDate('')
    setAvailabilitySlots([])
  }

  const handleBookSubmit = async () => {
    if (!doctor || !bookDateTime || !bookReason.trim()) {
      setBookError('Select a time and add a reason to book.')
      return
    }

    try {
      setBookSubmitting(true)
      setBookError(null)
      const isoDate = new Date(bookDateTime).toISOString()
      
      // Only validate if the slot wasn't already marked as available from the slots list
      const selectedSlot = availabilitySlots.find(
        s => `${s.date}T${s.startTime}` === bookDateTime
      )
      
      // Skip validation for pre-validated available slots
      if (!selectedSlot || !selectedSlot.isAvailable) {
        // Validate appointment for manually entered times
        const validation = await appointmentService.validateAppointment({
          doctorId: doctor.id,
          dateTime: isoDate,
          duration: bookDuration,
        })
        
        if (validation && validation.valid === false) {
          const errorMessage = validation.reason 
            || (validation.conflicts?.length 
              ? 'This time slot is already booked. Please select another time.'
              : 'Doctor is not available at this time. Please select from the available slots.')
          setBookError(errorMessage)
          setBookSubmitting(false)
          return
        }
      }
      
      // Create appointment
      await appointmentService.createAppointment({
        doctorId: doctor.id,
        dateTime: isoDate,
        duration: bookDuration,
        reason: bookReason.trim(),
        notes: undefined,
      })
      
      setBookingSuccess(true)
      setBookDateTime('')
      setBookReason('')
      setBookError(null)
    } catch (err: any) {
      // Extract detailed error message from response
      const errorData = err?.response?.data
      let errorMessage = 'Booking failed. Please try again.'
      
      if (errorData?.details && Array.isArray(errorData.details)) {
        // Get the first validation error message
        const firstError = errorData.details[0]
        errorMessage = firstError?.message || errorData.error || errorMessage
      } else if (errorData?.error) {
        errorMessage = errorData.error
      } else if (err?.message) {
        errorMessage = err.message
      }
      
      setBookError(errorMessage)
    } finally {
      setBookSubmitting(false)
    }
  }

  // Get profile photo URL - check multiple sources
  const getProfilePhotoUrl = () => {
    const url = doctor?.profilePhotoUrl || doctor?.user?.profilePhotoUrl
    return url ? resolveProfilePhotoUrl(url) : null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
        <DashboardHeader />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-32" />
            <div className="bg-card rounded-2xl border shadow-sm p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <Skeleton className="h-40 w-40 rounded-2xl" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-10 w-72" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-36" />
                  <div className="flex gap-3 mt-6">
                    <Skeleton className="h-11 w-36" />
                    <Skeleton className="h-11 w-44" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
        <DashboardHeader />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Card className="p-16 text-center rounded-2xl">
            <div className="flex flex-col items-center gap-6">
              <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
                <User className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Doctor Not Found</h2>
                <p className="text-muted-foreground max-w-sm">
                  {error || "We couldn't find the doctor you're looking for. They may have moved or the link is incorrect."}
                </p>
              </div>
              <Button size="lg" onClick={() => router.push('/dashboard/patient/search')}>
                Browse Doctors
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const photoUrl = getProfilePhotoUrl()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      <DashboardHeader />

      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 dark:from-blue-800 dark:via-blue-700 dark:to-cyan-700" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-white/90 hover:text-white hover:bg-white/10 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 pb-12 relative z-10">
        {/* Main Profile Card */}
        <Card className="rounded-2xl shadow-xl border-0 overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Avatar Section */}
              <div className="flex flex-col items-center lg:items-start gap-4">
                <div className="relative">
                  <Avatar className="h-40 w-40 rounded-2xl border-4 border-white shadow-lg">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                        className="h-full w-full object-cover rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-4xl font-bold rounded-xl">
                      {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  {doctor.isAvailable && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Available
                    </div>
                  )}
                </div>

                {/* Quick Stats - Mobile */}
                <div className="flex lg:hidden gap-6 text-center">
                  {doctor.experience !== undefined && doctor.experience > 0 && (
                    <div>
                      <div className="text-2xl font-bold text-foreground">{doctor.experience}+</div>
                      <div className="text-xs text-muted-foreground">Years Exp.</div>
                    </div>
                  )}
                  <div>
                    <div className="text-2xl font-bold text-foreground">4.8</div>
                    <div className="text-xs text-muted-foreground">Rating</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">124</div>
                    <div className="text-xs text-muted-foreground">Reviews</div>
                  </div>
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                      <h1 className="text-3xl font-bold text-foreground">
                        Dr. {doctor.firstName} {doctor.lastName}
                      </h1>
                      <BadgeCheck className="h-6 w-6 text-blue-500" />
                    </div>
                    
                    <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                      <Stethoscope className="h-5 w-5 text-blue-500" />
                      <span className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                        {doctor.specialization}
                      </span>
                    </div>

                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                      <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-amber-700 dark:text-amber-400">4.8</span>
                      </div>
                      <span className="text-muted-foreground">(124 reviews)</span>
                    </div>

                    <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        Verified
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                        <Video className="h-3.5 w-3.5 text-blue-500" />
                        Video Consult
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                        <Shield className="h-3.5 w-3.5 text-purple-500" />
                        Board Certified
                      </Badge>
                    </div>
                  </div>

                  {/* Quick Stats - Desktop */}
                  <div className="hidden lg:flex gap-6 text-center">
                    {doctor.experience !== undefined && doctor.experience > 0 && (
                      <div className="px-4">
                        <div className="text-3xl font-bold text-foreground">{doctor.experience}+</div>
                        <div className="text-sm text-muted-foreground">Years Exp.</div>
                      </div>
                    )}
                    <div className={doctor.experience && doctor.experience > 0 ? 'border-l px-4' : 'px-4'}>
                      <div className="text-3xl font-bold text-foreground">4.8</div>
                      <div className="text-sm text-muted-foreground">Rating</div>
                    </div>
                    <div className="border-l px-4">
                      <div className="text-3xl font-bold text-foreground">124</div>
                      <div className="text-sm text-muted-foreground">Reviews</div>
                    </div>
                  </div>
                </div>

                {user?.role === 'PATIENT' && (
                  <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 mt-6">
                    <Button
                      size="lg"
                      onClick={handleBookAppointment}
                      className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25"
                    >
                      <Calendar className="h-5 w-5" />
                      Book Appointment
                    </Button>
                    <Button
                      size="lg"
                      variant={isPreferred ? 'secondary' : 'outline'}
                      onClick={handleTogglePreferred}
                      disabled={addPreferredMutation.isPending || removePreferredMutation.isPending}
                      className="gap-2"
                    >
                      {addPreferredMutation.isPending || removePreferredMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Heart className={`h-5 w-5 ${isPreferred ? 'fill-red-500 text-red-500' : ''}`} />
                      )}
                      {isPreferred ? 'Saved to Favorites' : 'Add to Favorites'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Info Bar */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border-t px-8 py-4">
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-2">
              {doctor.experience !== undefined && doctor.experience > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{doctor.experience}+ years experience</span>
                </div>
              )}
              {doctor.qualification && (
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>{doctor.qualification}</span>
                </div>
              )}
              {doctor.consultationFee !== undefined && doctor.consultationFee > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600 dark:text-green-400 font-semibold">${doctor.consultationFee}</span>
                  <span className="text-muted-foreground">per visit</span>
                </div>
              )}
              {doctor.clinic?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{doctor.clinic.name}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Details Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card className="p-6 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                About
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {doctor.bio ||
                  `Dr. ${doctor.firstName} ${doctor.lastName} is a dedicated ${doctor.specialization} specialist with ${doctor.experience ? `${doctor.experience}+` : 'several'} years of experience in providing quality healthcare services. Known for a patient-centered approach, Dr. ${doctor.lastName} combines expertise with compassion to deliver the best possible care.`}
              </p>
            </Card>

            {/* Services */}
            <Card className="p-6 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-500" />
                Services Offered
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { name: 'General Consultation', icon: MessageSquare },
                  { name: 'Video Consultation', icon: Video },
                  { name: 'In-Person Visit', icon: Building2 },
                  { name: 'Follow-up Care', icon: Calendar },
                  { name: 'Health Screening', icon: Shield },
                  { name: 'Second Opinion', icon: CheckCircle },
                ].map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <service.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-sm">{service.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Education & Qualifications */}
            <Card className="p-6 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                Education & Qualifications
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold">{doctor.qualification || doctor.education || 'Medical Degree'}</p>
                    <p className="text-sm text-muted-foreground">Board Certified {doctor.specialization}</p>
                  </div>
                </div>
                {doctor.licenseNumber && (
                  <div className="flex gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                      <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold">Licensed Practitioner</p>
                      <p className="text-sm text-muted-foreground">License #{doctor.licenseNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card className="p-6 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-500" />
                Contact Information
              </h2>
              <div className="space-y-4">
                {(doctor.phoneNumber || doctor.user?.phoneNumber) && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm">{doctor.phoneNumber || doctor.user?.phoneNumber}</span>
                  </div>
                )}
                {doctor.user?.email && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm truncate">{doctor.user.email}</span>
                  </div>
                )}
                {!doctor.phoneNumber && !doctor.user?.phoneNumber && !doctor.user?.email && (
                  <p className="text-sm text-muted-foreground">Contact information not available</p>
                )}
              </div>
            </Card>

            {/* Office Hours / Schedule */}
            <Card className="p-6 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Office Hours
              </h2>
              {scheduleLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : schedule.length > 0 ? (
                <div className="space-y-3">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                    const daySchedule = schedule.find(s => s.dayOfWeek === index)
                    return (
                      <div key={day} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span className={`text-sm font-medium ${daySchedule ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {day}
                        </span>
                        {daySchedule ? (
                          <div className="text-right">
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                              {daySchedule.startTime} - {daySchedule.endTime}
                            </span>
                            {daySchedule.hasBreak && daySchedule.breakStart && daySchedule.breakEnd && (
                              <p className="text-xs text-muted-foreground">
                                Break: {daySchedule.breakStart} - {daySchedule.breakEnd}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Closed</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Schedule information not available</p>
              )}
            </Card>

            {/* Clinic Location */}
            <Card className="p-6 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                Clinic Location
              </h2>
              {doctor.clinic?.name ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg mt-0.5">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{doctor.clinic.name}</p>
                      {doctor.clinic.address && (
                        <p className="text-sm text-muted-foreground mt-1">{doctor.clinic.address}</p>
                      )}
                    </div>
                  </div>
                  {doctor.clinic.phone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm">{doctor.clinic.phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Location information not available</p>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && doctor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="bg-white/20 text-white font-semibold">
                      {doctor.firstName?.[0]}{doctor.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Dr. {doctor.firstName} {doctor.lastName}
                    </h3>
                    <p className="text-sm text-blue-200">{doctor.specialization}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseBookingModal}
                  aria-label="Close"
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {bookingSuccess ? (
              <div className="p-6 text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/20">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Appointment Requested!</h3>
                <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                  Your appointment request has been sent to Dr. {doctor.lastName}. 
                  You'll receive a notification once it's confirmed.
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    onClick={() => router.push('/dashboard/patient/appointments')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Appointments
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-10"
                    onClick={handleCloseBookingModal}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedDate ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                    <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">1</span>
                    Date
                  </div>
                  <div className="w-6 h-0.5 bg-border" />
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${bookDateTime ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : selectedDate ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                    <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">2</span>
                    Time
                  </div>
                  <div className="w-6 h-0.5 bg-border" />
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${bookReason.trim() ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : bookDateTime ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                    <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">3</span>
                    Details
                  </div>
                </div>

                {/* Date & Duration Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/40">
                        <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      Select Date
                    </label>
                    <Input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-10 border-2 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/40">
                        <Clock className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      Duration
                    </label>
                    <select
                      title="Select duration"
                      value={bookDuration}
                      onChange={(e) => setBookDuration(Number(e.target.value))}
                      className="w-full h-10 border-2 border-border rounded-lg px-3 text-sm focus:outline-none focus:border-blue-500 bg-background transition-colors cursor-pointer"
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
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <div className="p-1 rounded bg-green-100 dark:bg-green-900/40">
                      <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    Available Time Slots
                  </label>
                  {!selectedDate ? (
                    <div className="text-sm text-muted-foreground bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 rounded-lg text-center border-2 border-dashed border-border">
                      <Calendar className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/50" />
                      Select a date to see available slots
                    </div>
                  ) : availabilityLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg">
                      <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-muted-foreground">Finding available slots...</span>
                    </div>
                  ) : availabilityError ? (
                    <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                      <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-xs">No preset slots available</p>
                        <p className="text-xs opacity-80">Select a specific time below.</p>
                      </div>
                    </div>
                  ) : availabilitySlots.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 rounded-lg text-center border border-border">
                      <Clock className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/50" />
                      No slots for this date. Try another or select time below.
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-1.5 max-h-28 overflow-y-auto p-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-border">
                      {availabilitySlots.map((slot) => {
                        const slotValue = `${slot.date}T${slot.startTime}`
                        const selected = bookDateTime === slotValue
                        return (
                          <button
                            key={`${slot.date}-${slot.startTime}`}
                            type="button"
                            onClick={() => handleSlotSelect(slot)}
                            disabled={!slot.isAvailable}
                            className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                              slot.isAvailable
                                ? selected
                                  ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                                  : 'border-border bg-white dark:bg-slate-800 text-foreground hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 cursor-not-allowed line-through'
                            }`}
                            title={slot.isAvailable ? 'Available' : 'Already booked'}
                          >
                            {slot.startTime}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Manual DateTime (fallback) */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <div className="p-1 rounded bg-orange-100 dark:bg-orange-900/40">
                      <Calendar className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                    </div>
                    Or select specific date & time
                  </label>
                  <Input
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    value={bookDateTime}
                    onChange={(e) => setBookDateTime(e.target.value)}
                    className="h-10 border-2 focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Reason */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <div className="p-1 rounded bg-pink-100 dark:bg-pink-900/40">
                      <MessageSquare className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                    </div>
                    Reason for Visit
                  </label>
                  <textarea
                    value={bookReason}
                    onChange={(e) => setBookReason(e.target.value)}
                    rows={2}
                    className="w-full border-2 border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-background resize-none transition-colors"
                    placeholder="Briefly describe your symptoms or reason..."
                  />
                </div>

                {/* Error Messages */}
                {bookError && (
                  <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-800">
                    <X className="h-4 w-4 shrink-0" />
                    <span>{bookError}</span>
                  </div>
                )}

                {/* Summary Card */}
                {bookDateTime && bookReason.trim() && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-medium text-blue-600 dark:text-blue-400">Summary:</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{new Date(bookDateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{new Date(bookDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{bookDuration} min</Badge>
                    </div>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="flex gap-3 pt-1">
                  <Button
                    className="flex-1 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20 transition-all"
                    onClick={handleBookSubmit}
                    disabled={bookSubmitting || !bookDateTime || !bookReason.trim()}
                  >
                    {bookSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirm Appointment
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1 h-10"
                    variant="outline"
                    onClick={handleCloseBookingModal}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
