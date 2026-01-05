import { prisma, AppointmentStatus, QueueStatus } from '@smartmed/database'
import { AuditService } from './audit.service'

export interface PatientContextData {
  patient: {
    id: string
    firstName: string
    lastName: string
    dateOfBirth: Date
    age: number
    gender: string
    phoneNumber: string
    bloodGroup: string | null
    emergencyContact: string | null
    profilePhotoUrl: string | null
  }
  allergies: {
    list: string[]
    lastUpdated: Date | null
  }
  medicalHistory: {
    summary: string | null
    conditions: string[]
  }
  previousAppointments: {
    id: string
    date: Date
    status: string
    doctorName: string
    specialization: string
    notes: string | null
  }[]
  prescriptions: {
    id: string
    date: Date
    doctorName: string
    medications: {
      name: string
      dosage: string
      frequency: string
      duration: string
    }[]
    status: string
  }[]
  recentReports: {
    id: string
    title: string
    type: string
    date: Date
    fileUrl: string | null
  }[]
  timeline: {
    id: string
    type: 'appointment' | 'prescription' | 'report' | 'queue'
    date: Date
    title: string
    description: string
    metadata?: Record<string, any>
  }[]
  queueHistory: {
    id: string
    date: Date
    doctorName: string
    type: string
    status: string
    waitTime: number | null // in minutes
  }[]
  stats: {
    totalAppointments: number
    completedAppointments: number
    cancelledAppointments: number
    noShowCount: number
    totalPrescriptions: number
    lastVisit: Date | null
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

function parseAllergies(allergiesJson: any): string[] {
  if (!allergiesJson) return []
  if (Array.isArray(allergiesJson)) return allergiesJson
  if (typeof allergiesJson === 'string') {
    try {
      const parsed = JSON.parse(allergiesJson)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return allergiesJson.split(',').map((a: string) => a.trim()).filter(Boolean)
    }
  }
  return []
}

function parseMedicalHistory(history: string | null): { summary: string | null; conditions: string[] } {
  if (!history) return { summary: null, conditions: [] }
  
  // Try to parse as JSON if it looks like it
  if (history.startsWith('{') || history.startsWith('[')) {
    try {
      const parsed = JSON.parse(history)
      if (Array.isArray(parsed)) {
        return { summary: null, conditions: parsed }
      }
      return { 
        summary: parsed.summary || null, 
        conditions: parsed.conditions || []
      }
    } catch {
      // Fall through to plain text handling
    }
  }
  
  return { summary: history, conditions: [] }
}

export class PatientContextService {
  /**
   * Get comprehensive patient context for a consultation
   * This is the main method doctors will use when seeing a patient
   */
  static async getPatientContext(
    patientId: string,
    requestingDoctorId: string,
    options: {
      includeTimeline?: boolean
      appointmentLimit?: number
      prescriptionLimit?: number
      reportLimit?: number
    } = {}
  ): Promise<PatientContextData | null> {
    const {
      includeTimeline = true,
      appointmentLimit = 10,
      prescriptionLimit = 10,
      reportLimit = 5
    } = options

    // Get patient with user data
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: {
          select: {
            profilePhotoUrl: true,
            phoneNumber: true
          }
        }
      }
    })

    if (!patient) {
      return null
    }

    // Get previous appointments with this patient
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true
          }
        }
      },
      orderBy: { dateTime: 'desc' },
      take: appointmentLimit
    })

    // Get prescriptions
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        medications: {
          include: {
            drug: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: prescriptionLimit
    })

    // Get recent reports
    const reports = await prisma.report.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: reportLimit
    })

    // Get queue history
    const queueEntries = await prisma.queueEntry.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' },
      take: 20
    })

    // Calculate stats
    const allAppointments = await prisma.appointment.findMany({
      where: { patientId },
      select: { status: true, dateTime: true }
    })

    const completedAppointments = allAppointments.filter(a => a.status === AppointmentStatus.COMPLETED).length
    const cancelledAppointments = allAppointments.filter(a => a.status === AppointmentStatus.CANCELLED).length
    const noShowCount = allAppointments.filter(a => a.status === AppointmentStatus.NO_SHOW).length

    const totalPrescriptions = await prisma.prescription.count({ where: { patientId } })

    const lastVisit = allAppointments
      .filter(a => a.status === AppointmentStatus.COMPLETED)
      .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())[0]?.dateTime || null

    // Build response
    const response: PatientContextData = {
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        age: calculateAge(patient.dateOfBirth),
        gender: patient.gender,
        phoneNumber: patient.phoneNumber || patient.user.phoneNumber || 'N/A',
        bloodGroup: patient.bloodGroup,
        emergencyContact: patient.emergencyContact,
        profilePhotoUrl: patient.user.profilePhotoUrl
      },
      allergies: {
        list: parseAllergies(patient.allergies),
        lastUpdated: patient.updatedAt
      },
      medicalHistory: parseMedicalHistory(patient.medicalHistory),
      previousAppointments: appointments.map(apt => ({
        id: apt.id,
        date: apt.dateTime,
        status: apt.status,
        doctorName: `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`,
        specialization: apt.doctor.specialization,
        notes: apt.notes
      })),
      prescriptions: prescriptions.map(rx => ({
        id: rx.id,
        date: rx.createdAt,
        doctorName: `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName}`,
        medications: rx.medications.map(med => ({
          name: med.drug?.name || med.drugName,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration || 'As needed'
        })),
        status: rx.status
      })),
      recentReports: reports.map(report => ({
        id: report.id,
        title: report.title,
        type: report.reportType,
        date: report.createdAt,
        fileUrl: report.fileUrl
      })),
      timeline: [],
      queueHistory: queueEntries.map(entry => ({
        id: entry.id,
        date: entry.joinedAt,
        doctorName: `Dr. ${entry.doctor.firstName} ${entry.doctor.lastName}`,
        type: entry.queueType,
        status: entry.status,
        waitTime: entry.completedAt && entry.joinedAt 
          ? Math.round((entry.completedAt.getTime() - entry.joinedAt.getTime()) / 60000)
          : null
      })),
      stats: {
        totalAppointments: allAppointments.length,
        completedAppointments,
        cancelledAppointments,
        noShowCount,
        totalPrescriptions,
        lastVisit
      }
    }

    // Build timeline if requested
    if (includeTimeline) {
      response.timeline = this.buildTimeline(appointments, prescriptions, reports, queueEntries)
    }

    // Log access for audit
    await AuditService.log({
      userId: requestingDoctorId,
      action: 'PATIENT_HISTORY_ACCESS' as any,
      resourceType: 'Patient',
      resourceId: patientId,
      metadata: {
        includeTimeline,
        appointmentCount: appointments.length,
        prescriptionCount: prescriptions.length
      }
    }).catch(console.error)

    return response
  }

  /**
   * Build a unified timeline from various patient data
   */
  private static buildTimeline(
    appointments: any[],
    prescriptions: any[],
    reports: any[],
    queueEntries: any[]
  ) {
    const timeline: PatientContextData['timeline'] = []

    // Add appointments to timeline
    for (const apt of appointments) {
      timeline.push({
        id: apt.id,
        type: 'appointment',
        date: apt.dateTime,
        title: `Appointment with Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`,
        description: apt.notes || `${apt.status} - ${apt.doctor.specialization}`,
        metadata: { status: apt.status, specialization: apt.doctor.specialization }
      })
    }

    // Add prescriptions to timeline
    for (const rx of prescriptions) {
      timeline.push({
        id: rx.id,
        type: 'prescription',
        date: rx.createdAt,
        title: `Prescription from Dr. ${rx.doctor.firstName} ${rx.doctor.lastName}`,
        description: `${rx.medications.length} medication(s) prescribed`,
        metadata: { 
          medicationCount: rx.medications.length,
          medications: rx.medications.map((m: any) => m.drug?.name || m.drugName)
        }
      })
    }

    // Add reports to timeline
    for (const report of reports) {
      timeline.push({
        id: report.id,
        type: 'report',
        date: report.createdAt,
        title: report.title,
        description: `${report.reportType} report uploaded`,
        metadata: { reportType: report.reportType }
      })
    }

    // Add significant queue events
    for (const entry of queueEntries.filter(e => e.status === QueueStatus.COMPLETED)) {
      timeline.push({
        id: entry.id,
        type: 'queue',
        date: entry.completedAt || entry.joinedAt,
        title: `Visited Dr. ${entry.doctor.firstName} ${entry.doctor.lastName}`,
        description: `Walk-in consultation`,
        metadata: { queueType: entry.queueType }
      })
    }

    // Sort by date descending
    timeline.sort((a, b) => b.date.getTime() - a.date.getTime())

    return timeline
  }

  /**
   * Get quick patient summary (for queue view, etc.)
   */
  static async getPatientSummary(patientId: string): Promise<{
    name: string
    age: number
    gender: string
    allergies: string[]
    lastVisit: Date | null
    visitCount: number
  } | null> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        allergies: true
      }
    })

    if (!patient) return null

    const appointments = await prisma.appointment.findMany({
      where: { 
        patientId,
        status: AppointmentStatus.COMPLETED
      },
      orderBy: { dateTime: 'desc' },
      select: { dateTime: true }
    })

    return {
      name: `${patient.firstName} ${patient.lastName}`,
      age: calculateAge(patient.dateOfBirth),
      gender: patient.gender,
      allergies: parseAllergies(patient.allergies),
      lastVisit: appointments[0]?.dateTime || null,
      visitCount: appointments.length
    }
  }

  /**
   * Get patient allergies only (for prescription checks)
   */
  static async getPatientAllergies(patientId: string): Promise<string[]> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { allergies: true }
    })

    return parseAllergies(patient?.allergies)
  }

  /**
   * Get patient's active medications (from recent prescriptions)
   */
  static async getActiveMedications(patientId: string): Promise<{
    name: string
    dosage: string
    startDate: Date
    endDate: Date | null
    prescribedBy: string
  }[]> {
    const now = new Date()

    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId,
        status: 'ACTIVE'
      },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        medications: {
          include: {
            drug: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const activeMeds: {
      name: string
      dosage: string
      startDate: Date
      endDate: Date | null
      prescribedBy: string
    }[] = []

    for (const rx of prescriptions) {
      for (const med of rx.medications) {
        activeMeds.push({
          name: med.drug?.name || med.drugName,
          dosage: med.dosage,
          startDate: rx.createdAt,
          endDate: null, // Could calculate from duration if needed
          prescribedBy: `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName}`
        })
      }
    }

    return activeMeds
  }
}
