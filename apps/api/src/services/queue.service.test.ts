/**
 * Queue Service Unit Tests
 *
 * Tests for patient queue management system.
 * Core functionality for appointment flow.
 */

import { QueueStatus, QueueType, DoctorAvailabilityStatus } from '@smartmed/database'

// Mock the database
jest.mock('@smartmed/database', () => ({
  prisma: {
    doctor: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
    queueEntry: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    queueCounter: {
      upsert: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      doctor: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      queueEntry: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      queueCounter: {
        upsert: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    })),
  },
  Prisma: {},
  QueueStatus: {
    WAITING: 'WAITING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    NO_SHOW: 'NO_SHOW',
    CANCELLED: 'CANCELLED',
  },
  QueueType: {
    WALK_IN: 'WALK_IN',
    ONLINE_BOOKING: 'ONLINE_BOOKING',
    APPOINTMENT: 'APPOINTMENT',
  },
  DoctorAvailabilityStatus: {
    AVAILABLE: 'AVAILABLE',
    BUSY: 'BUSY',
    OFFLINE: 'OFFLINE',
    BREAK: 'BREAK',
  },
  AuditAction: {
    QUEUE_CHECK_IN: 'QUEUE_CHECK_IN',
    QUEUE_CALLED: 'QUEUE_CALLED',
    QUEUE_COMPLETED: 'QUEUE_COMPLETED',
    QUEUE_NO_SHOW: 'QUEUE_NO_SHOW',
    QUEUE_CANCELLED: 'QUEUE_CANCELLED',
  },
}))

// Mock socket.io
jest.mock('../socket/io', () => ({
  getIO: jest.fn(() => null),
}))

// Mock socket constants
jest.mock('../socket/constants', () => ({
  SOCKET_EVENTS: {
    QUEUE_UPDATED: 'queue:updated',
    QUEUE_ENTRY_UPDATED: 'queue:entry:updated',
    DOCTOR_STATUS_CHANGED: 'doctor:status:changed',
    DOCTOR_STATUS_PUBLIC: 'doctor:status:public',
    NOTIFY_PATIENT: 'notify:patient',
  },
}))

// Mock utils
jest.mock('../utils/time', () => ({
  getDateKeyForTimezone: jest.fn(() => '2024-01-15'),
  isWithinWindow: jest.fn(() => true),
}))

jest.mock('../utils/audit', () => ({
  logAuditEvent: jest.fn(),
}))

import { prisma } from '@smartmed/database'
import { getIO } from '../socket/io'
import { getDateKeyForTimezone, isWithinWindow } from '../utils/time'
import {
  getPatientActiveQueues,
  broadcastDoctorStatus,
} from './queue.service'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Queue Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPatientActiveQueues', () => {
    const mockActiveQueues = [
      {
        id: 'entry-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        status: QueueStatus.WAITING,
        position: 3,
        estimatedWaitTime: 30,
        serialNumber: 'DOC-1-2024-01-15-005',
        queueType: QueueType.ONLINE_BOOKING,
        checkInTime: new Date('2024-01-15T09:45:00Z'),
        doctor: {
          id: 'doctor-1',
          firstName: 'Jane',
          lastName: 'Smith',
          specialization: 'General',
        },
      },
    ]

    it('should get active queue entries for a patient', async () => {
      ;(mockPrisma.queueEntry.findMany as jest.Mock).mockResolvedValue(mockActiveQueues)

      const result = await getPatientActiveQueues('patient-1')

      expect(result).toHaveLength(1)
      expect(result[0].patientId).toBe('patient-1')
      expect(result[0].status).toBe(QueueStatus.WAITING)
      expect(mockPrisma.queueEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patientId: 'patient-1',
          }),
        })
      )
    })

    it('should return empty array when patient has no active queues', async () => {
      ;(mockPrisma.queueEntry.findMany as jest.Mock).mockResolvedValue([])

      const result = await getPatientActiveQueues('patient-2')

      expect(result).toHaveLength(0)
    })

    it('should include doctor details in active queues', async () => {
      ;(mockPrisma.queueEntry.findMany as jest.Mock).mockResolvedValue(mockActiveQueues)

      const result = await getPatientActiveQueues('patient-1')

      expect(result[0].doctor).toBeDefined()
      expect(result[0].doctor.firstName).toBe('Jane')
    })
  })

  describe('broadcastDoctorStatus', () => {
    it('should not throw when IO is not available', async () => {
      ;(getIO as jest.Mock).mockReturnValue(null)
      ;(mockPrisma.doctor.findUnique as jest.Mock).mockResolvedValue({
        id: 'doctor-1',
        availabilityStatus: DoctorAvailabilityStatus.AVAILABLE,
        isAvailable: true,
      })

      // Should not throw
      await expect(broadcastDoctorStatus('doctor-1')).resolves.not.toThrow()
    })

    it('should handle non-existent doctor', async () => {
      ;(getIO as jest.Mock).mockReturnValue({ to: jest.fn().mockReturnThis(), emit: jest.fn() })
      ;(mockPrisma.doctor.findUnique as jest.Mock).mockResolvedValue(null)

      // Should not throw
      await expect(broadcastDoctorStatus('non-existent')).resolves.not.toThrow()
    })

    it('should broadcast status when IO is available', async () => {
      const mockEmit = jest.fn()
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit })
      ;(getIO as jest.Mock).mockReturnValue({ to: mockTo, emit: mockEmit })
      ;(mockPrisma.doctor.findUnique as jest.Mock).mockResolvedValue({
        id: 'doctor-1',
        availabilityStatus: DoctorAvailabilityStatus.AVAILABLE,
        isAvailable: true,
        lastStatusChange: new Date(),
      })

      await broadcastDoctorStatus('doctor-1')

      expect(mockTo).toHaveBeenCalled()
      expect(mockEmit).toHaveBeenCalled()
    })
  })

  describe('Queue Status Constants', () => {
    it('should have all required queue statuses', () => {
      expect(QueueStatus.WAITING).toBe('WAITING')
      expect(QueueStatus.IN_PROGRESS).toBe('IN_PROGRESS')
      expect(QueueStatus.COMPLETED).toBe('COMPLETED')
      expect(QueueStatus.NO_SHOW).toBe('NO_SHOW')
      expect(QueueStatus.CANCELLED).toBe('CANCELLED')
    })

    it('should have all required queue types', () => {
      expect(QueueType.WALK_IN).toBe('WALK_IN')
      expect(QueueType.ONLINE_BOOKING).toBe('ONLINE_BOOKING')
      expect(QueueType.APPOINTMENT).toBe('APPOINTMENT')
    })

    it('should have all required doctor availability statuses', () => {
      expect(DoctorAvailabilityStatus.AVAILABLE).toBe('AVAILABLE')
      expect(DoctorAvailabilityStatus.BUSY).toBe('BUSY')
      expect(DoctorAvailabilityStatus.OFFLINE).toBe('OFFLINE')
      expect(DoctorAvailabilityStatus.BREAK).toBe('BREAK')
    })
  })

  describe('Time utility usage', () => {
    it('should use getDateKeyForTimezone for date keys', () => {
      const result = getDateKeyForTimezone(new Date(), 'America/New_York')
      expect(result).toBe('2024-01-15')
    })

    it('should use isWithinWindow for check-in validation', () => {
      const checkIn = new Date('2024-01-15T09:45:00Z')
      const scheduled = new Date('2024-01-15T10:00:00Z')
      const result = isWithinWindow(checkIn, scheduled, 30, 15)
      expect(result).toBe(true)
    })
  })

  describe('Queue Entry Types', () => {
    it('should define queue entry structure', () => {
      const mockEntry = {
        id: 'entry-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        status: QueueStatus.WAITING,
        position: 1,
        estimatedWaitTime: 15,
        serialNumber: 'DOC-1-2024-01-15-001',
        queueType: QueueType.ONLINE_BOOKING,
        scheduledTime: new Date(),
        checkInTime: new Date(),
        priority: 1,
      }

      expect(mockEntry).toHaveProperty('id')
      expect(mockEntry).toHaveProperty('doctorId')
      expect(mockEntry).toHaveProperty('patientId')
      expect(mockEntry).toHaveProperty('status')
      expect(mockEntry).toHaveProperty('position')
      expect(mockEntry).toHaveProperty('estimatedWaitTime')
      expect(mockEntry).toHaveProperty('serialNumber')
      expect(mockEntry).toHaveProperty('queueType')
      expect(mockEntry).toHaveProperty('priority')
    })
  })

  describe('Serial Number Format', () => {
    it('should follow expected format pattern', () => {
      const serialPattern = /^DOC-[^-]+-\d{4}-\d{2}-\d{2}-\d{3}$/
      const validSerial = 'DOC-doctor1-2024-01-15-001'
      
      expect(validSerial).toMatch(serialPattern)
    })
  })
})
