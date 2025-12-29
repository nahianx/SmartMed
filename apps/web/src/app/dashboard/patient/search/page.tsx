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
} from 'lucide-react'
import { Badge, Button, Card, Input, Skeleton } from '@smartmed/ui'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../../../../context/AuthContext'
import {
  useDoctorSearch,
  useSpecializations,
} from '../../../../hooks/useProfile'
import type { Doctor } from '@smartmed/types'
import { appointmentService } from '../../../../services/appointmentService'
import { apiClient } from '../../../../services/apiClient'

interface Preset {
  name: string
  query: string
  specialization?: string
}

export default function DoctorFinderPage() {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [specialization, setSpecialization] = useState<string>('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [presets, setPresets] = useState<Preset[]>([])
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null)
  const [bookDateTime, setBookDateTime] = useState('')
  const [bookDuration, setBookDuration] = useState(30)
  const [bookReason, setBookReason] = useState('')
  const [bookError, setBookError] = useState<string | null>(null)
  const [bookSubmitting, setBookSubmitting] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)

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
      } else {
        // Fetch patient ID from dashboard API
        const fetchPatientId = async () => {
          try {
            const res = await apiClient.get('/dashboard/patient')
            setPatientId(res.data.profile?.id)
          } catch (err) {
            console.error('Failed to load patient profile:', err)
          }
        }
        fetchPatientId()
      }
    }
  }, [loading, user, router])

  const { data: specializations = [], isLoading: specsLoading } =
    useSpecializations()
  const { data: doctors = [], isLoading } = useDoctorSearch(
    debouncedQuery,
    specialization
  )

  const handleSavePreset = () => {
    if (!query && !specialization) return
    const next: Preset[] = [
      ...presets,
      {
        name: query || specialization || 'Saved search',
        query,
        specialization,
      },
    ]
    setPresets(next)
    localStorage.setItem('doctor-search-presets', JSON.stringify(next))
  }

  const applyPreset = (preset: Preset) => {
    setQuery(preset.query)
    setSpecialization(preset.specialization || '')
  }

  const filtered = useMemo(() => doctors, [doctors])

  const handleBook = async () => {
    if (!bookingDoctor || !bookDateTime || !bookReason.trim()) {
      setBookError('Select a time and add a reason to book.')
      return
    }
    if (!patientId) {
      setBookError('Patient profile not loaded. Please try again.')
      return
    }

    try {
      setBookSubmitting(true)
      setBookError(null)
      const isoDate = new Date(bookDateTime).toISOString()
      const validation = await appointmentService.validateAppointment({
        patientId,
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
        patientId,
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
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Find a Doctor</h1>
              <Badge variant="outline" className="text-xs">
                Patient
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/patient')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name or keyword"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <select
                title="select specialities"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleSavePreset}
              className="gap-2"
            >
              <Save className="h-4 w-4" /> Save preset
            </Button>
          </div>

          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, idx) => (
                <Badge
                  key={`${preset.name}-${idx}`}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-6 w-1/2 mb-3" />
                  <Skeleton className="h-4 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center">
              <div className="flex flex-col items-center gap-2">
                <Search className="h-8 w-8 text-slate-400" />
                <p className="text-slate-700 font-medium">No doctors found</p>
                <p className="text-slate-500 text-sm">
                  Try another specialty or search term.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((doctor: Doctor) => (
                <Card key={doctor.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">
                        Dr. {doctor.firstName} {doctor.lastName}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {doctor.specialization}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof (doctor as any).relevanceScore === 'number' && (
                        <Badge variant="secondary">
                          {Math.round((doctor as any).relevanceScore * 100) /
                            100}{' '}
                          score
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {doctor.experience
                          ? `${doctor.experience}+ yrs`
                          : 'Experience'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {(doctor as any).clinic?.address ||
                        (doctor as any).clinic?.name ||
                        'Clinic info unavailable'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" /> Preferred-ready
                    </Badge>
                    <Badge variant="secondary">Tele-visit</Badge>
                    <Badge variant="secondary">In-person</Badge>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/profile?userId=${doctor.userId || doctor.id}&role=DOCTOR`
                        )
                      }
                    >
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setBookingDoctor(doctor)}
                    >
                      Book
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {bookingDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Booking</p>
                <h3 className="text-lg font-semibold">
                  Dr. {bookingDoctor.firstName} {bookingDoctor.lastName}
                </h3>
              </div>
              <button
                onClick={() => setBookingDoctor(null)}
                aria-label="Close"
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date & Time
                </label>
                <Input
                  type="datetime-local"
                  min={new Date().toISOString().slice(0, 16)}
                  value={bookDateTime}
                  onChange={(e) => setBookDateTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Duration
                </label>
                <select
                  title="timess"
                  value={bookDuration}
                  onChange={(e) => setBookDuration(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[15, 30, 45, 60].map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea
                value={bookReason}
                onChange={(e) => setBookReason(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your visit reason"
              />
            </div>
            {bookError && (
              <div className="text-sm text-red-600">{bookError}</div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                onClick={handleBook}
                disabled={bookSubmitting}
              >
                {bookSubmitting ? 'Booking...' : 'Confirm Booking'}
              </Button>
              <Button
                className="flex-1"
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
