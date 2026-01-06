/**
 * Appointment Service Unit Tests
 *
 * Tests for appointment search, patient history, and doctor history functions.
 */

import { UserRole } from '@smartmed/types'
import { AppointmentStatus } from '@smartmed/database'

// Mock the database
jest.mock('@smartmed/database', () => ({
  prisma: {
    appointment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
  AppointmentStatus: {
    SCHEDULED: 'SCHEDULED',
    CONFIRMED: 'CONFIRMED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
  },
}))

// Mock patient and doctor services
jest.mock('./patient.service', () => ({
  getOrCreatePatient: jest.fn(),
}))

jest.mock('./doctor.service', () => ({
  getOrCreateDoctor: jest.fn(),
}))

import { prisma } from '@smartmed/database'
import { getOrCreatePatient } from './patient.service'
import { getOrCreateDoctor } from './doctor.service'
import {
  searchAppointments,
  getPatientHistory,
  getDoctorHistory,
} from './appointment.service'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetOrCreatePatient = getOrCreatePatient as jest.MockedFunction<typeof getOrCreatePatient>
const mockGetOrCreateDoctor = getOrCreateDoctor as jest.MockedFunction<typeof getOrCreateDoctor>

describe('Appointment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('searchAppointments', () => {
    const mockAppointments = [
      {
        id: 'apt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        dateTime: new Date('2024-01-15T10:00:00Z'),
        status: AppointmentStatus.SCHEDULED,
        reason: 'Check-up',
        patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
        doctor: { id: 'doctor-1', firstName: 'Jane', lastName: 'Smith', specialization: 'General' },
        prescriptions: [],
        reports: [],
      },
      {
        id: 'apt-2',
        patientId: 'patient-2',
        doctorId: 'doctor-1',
        dateTime: new Date('2024-01-16T14:00:00Z'),
        status: AppointmentStatus.CONFIRMED,
        reason: 'Follow-up',
        patient: { id: 'patient-2', firstName: 'Alice', lastName: 'Brown' },
        doctor: { id: 'doctor-1', firstName: 'Jane', lastName: 'Smith', specialization: 'General' },
        prescriptions: [],
        reports: [],
      },
    ]

    it('should search appointments for admin without scoping', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments)
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(2)

      const result = await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 1,
      })

      expect(result.appointments).toHaveLength(2)
      expect(result.pagination.totalResults).toBe(2)
      expect(result.pagination.currentPage).toBe(1)
      expect(mockGetOrCreatePatient).not.toHaveBeenCalled()
      expect(mockGetOrCreateDoctor).not.toHaveBeenCalled()
    })

    it('should scope appointments to patient when user is PATIENT', async () => {
      mockGetOrCreatePatient.mockResolvedValue({ id: 'patient-1' } as any)
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointments[0]])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(1)

      const result = await searchAppointments({
        userId: 'user-1',
        userRole: UserRole.PATIENT,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 1,
      })

      expect(mockGetOrCreatePatient).toHaveBeenCalledWith('user-1')
      expect(result.appointments).toHaveLength(1)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patientId: 'patient-1' }),
        })
      )
    })

    it('should scope appointments to doctor when user is DOCTOR', async () => {
      mockGetOrCreateDoctor.mockResolvedValue({ id: 'doctor-1' } as any)
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments)
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(2)

      const result = await searchAppointments({
        userId: 'user-2',
        userRole: UserRole.DOCTOR,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 1,
      })

      expect(mockGetOrCreateDoctor).toHaveBeenCalledWith('user-2')
      expect(result.appointments).toHaveLength(2)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ doctorId: 'doctor-1' }),
        })
      )
    })

    it('should filter by date range', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointments[0]])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(1)

      const dateFrom = new Date('2024-01-15')
      const dateTo = new Date('2024-01-15')

      await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        dateFrom,
        dateTo,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateTime: { gte: dateFrom, lte: dateTo },
          }),
        })
      )
    })

    it('should filter by status', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointments[0]])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(1)

      await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        status: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
          }),
        })
      )
    })

    it('should support text search in reason, patient, and doctor names', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointments[0]])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(1)

      await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        q: 'John',
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { reason: { contains: 'John', mode: 'insensitive' } },
            ]),
          }),
        })
      )
    })

    it('should handle pagination correctly', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue(mockAppointments)
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(50)

      const result = await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 2,
      })

      expect(result.pagination.currentPage).toBe(2)
      expect(result.pagination.totalPages).toBe(5)
      expect(result.pagination.totalResults).toBe(50)
      expect(result.pagination.hasNextPage).toBe(true)
      expect(result.pagination.hasPreviousPage).toBe(true)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      )
    })

    it('should limit results to max 100', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 500, // Requesting more than allowed
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        })
      )
    })

    it('should support different sort options', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      // Test sorting by status
      await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        sortBy: 'status',
        sortOrder: 'asc',
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ status: 'asc' }],
        })
      )
    })
  })

  describe('getPatientHistory', () => {
    const mockPatientAppointments = [
      {
        id: 'apt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        dateTime: new Date('2024-01-10T10:00:00Z'),
        status: AppointmentStatus.COMPLETED,
        doctor: { id: 'doctor-1', firstName: 'Jane', lastName: 'Smith', specialization: 'General' },
        prescriptions: [],
        reports: [],
      },
    ]

    it('should get patient appointment history', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue(mockPatientAppointments)
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(1)

      const result = await getPatientHistory('patient-1', {
        limit: 10,
        page: 1,
      })

      expect(result.appointments).toHaveLength(1)
      expect(result.pagination.totalResults).toBe(1)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-1' },
          orderBy: { dateTime: 'desc' },
        })
      )
    })

    it('should filter patient history by date range', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      await getPatientHistory('patient-1', {
        startDate,
        endDate,
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 'patient-1',
            dateTime: { gte: startDate, lte: endDate },
          }),
        })
      )
    })

    it('should filter patient history by doctor', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      await getPatientHistory('patient-1', {
        doctorId: 'doctor-1',
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 'patient-1',
            doctorId: 'doctor-1',
          }),
        })
      )
    })

    it('should optionally include prescriptions and reports', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      await getPatientHistory('patient-1', {
        includeRecords: true,
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            prescriptions: true,
            reports: true,
          }),
        })
      )
    })
  })

  describe('getDoctorHistory', () => {
    const mockDoctorAppointments = [
      {
        id: 'apt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        dateTime: new Date('2024-01-10T10:00:00Z'),
        status: AppointmentStatus.COMPLETED,
        patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
        prescriptions: [],
        reports: [],
      },
    ]

    it('should get doctor appointment history', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue(mockDoctorAppointments)
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(1)

      const result = await getDoctorHistory('doctor-1', {
        limit: 10,
        page: 1,
      })

      expect(result.appointments).toHaveLength(1)
      expect(result.pagination.totalResults).toBe(1)
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { doctorId: 'doctor-1' },
          orderBy: { dateTime: 'desc' },
        })
      )
    })

    it('should filter doctor history by date range', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      await getDoctorHistory('doctor-1', {
        startDate,
        endDate,
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doctor-1',
            dateTime: { gte: startDate, lte: endDate },
          }),
        })
      )
    })

    it('should filter doctor history by status', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      await getDoctorHistory('doctor-1', {
        status: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW],
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doctor-1',
            status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] },
          }),
        })
      )
    })

    it('should filter doctor history by patient', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      await getDoctorHistory('doctor-1', {
        patientId: 'patient-1',
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            doctorId: 'doctor-1',
            patientId: 'patient-1',
          }),
        })
      )
    })

    it('should include prescriptions and reports for doctors', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      await getDoctorHistory('doctor-1', {
        limit: 10,
        page: 1,
      })

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            prescriptions: true,
            reports: true,
          }),
        })
      )
    })
  })

  describe('Pagination Edge Cases', () => {
    it('should handle page beyond total pages', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(5)

      const result = await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 100, // Way beyond total
      })

      // Should cap currentPage to totalPages
      expect(result.pagination.currentPage).toBeLessThanOrEqual(result.pagination.totalPages)
    })

    it('should handle negative page number', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: -1,
      })

      // Skip should be capped at 0
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        })
      )
    })

    it('should handle empty results', async () => {
      ;(mockPrisma.appointment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.appointment.count as jest.Mock).mockResolvedValue(0)

      const result = await searchAppointments({
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        sortBy: 'dateTime',
        sortOrder: 'desc',
        limit: 10,
        page: 1,
      })

      expect(result.appointments).toHaveLength(0)
      expect(result.pagination.totalPages).toBe(1) // At least 1 page
      expect(result.pagination.hasNextPage).toBe(false)
      expect(result.pagination.hasPreviousPage).toBe(false)
    })
  })
})
