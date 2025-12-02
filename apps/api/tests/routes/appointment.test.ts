import request from 'supertest'
import express from 'express'
import appointmentRoutes from '../../src/routes/appointment.routes'
import { validateSchema } from '../../src/middleware/validation'

// Mock the prisma client
const mockPrisma = {
  patient: {
    findUnique: jest.fn()
  },
  doctor: {
    findUnique: jest.fn()
  },
  appointment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  },
  activity: {
    create: jest.fn(),
    updateMany: jest.fn()
  }
}

jest.mock('@smartmed/database', () => ({
  prisma: mockPrisma,
  AppointmentStatus: {
    SCHEDULED: 'SCHEDULED',
    CONFIRMED: 'CONFIRMED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
  },
  ActivityType: {
    APPOINTMENT: 'APPOINTMENT'
  }
}))

// Create test app
const app = express()
app.use(express.json())

// Mock auth middleware
app.use((req, res, next) => {
  (req as any).user = {
    id: 'user-123',
    role: 'PATIENT',
    email: 'test@example.com'
  }
  next()
})

app.use('/api/appointments', appointmentRoutes)

describe('Appointment API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/appointments', () => {
    it('returns appointments for patient', async () => {
      const mockPatient = { id: 'patient-123' }
      const mockAppointments = [
        {
          id: 'apt-1',
          patientId: 'patient-123',
          doctorId: 'doctor-123',
          dateTime: '2024-12-31T14:00:00.000Z',
          reason: 'Checkup',
          status: 'SCHEDULED',
          doctor: {
            id: 'doctor-123',
            firstName: 'Dr.',
            lastName: 'Smith',
            specialization: 'Cardiology'
          }
        }
      ]

      mockPrisma.patient.findUnique.mockResolvedValueOnce(mockPatient)
      mockPrisma.appointment.findMany.mockResolvedValueOnce(mockAppointments)

      const response = await request(app)
        .get('/api/appointments')
        .expect(200)

      expect(response.body).toEqual({ appointments: mockAppointments })
      expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' }
      })
    })

    it('returns 404 when patient not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValueOnce(null)

      await request(app)
        .get('/api/appointments')
        .expect(404)
    })

    it('validates query parameters', async () => {
      await request(app)
        .get('/api/appointments')
        .query({ limit: '101' })
        .expect(400)
    })
  })

  describe('POST /api/appointments', () => {
    const validAppointmentData = {
      patientId: '550e8400-e29b-41d4-a716-446655440000',
      doctorId: '550e8400-e29b-41d4-a716-446655440001',
      dateTime: '2024-12-31T14:00:00.000Z',
      reason: 'Regular checkup'
    }

    it('creates appointment successfully', async () => {
      const mockCreatedAppointment = {
        id: 'apt-123',
        ...validAppointmentData,
        status: 'SCHEDULED',
        duration: 30,
        patient: { id: 'patient-1', firstName: 'John', lastName: 'Doe' },
        doctor: { 
          id: 'doctor-1', 
          firstName: 'Dr.', 
          lastName: 'Smith', 
          specialization: 'Cardiology' 
        }
      }

      mockPrisma.appointment.findFirst.mockResolvedValueOnce(null) // No conflicts
      mockPrisma.appointment.create.mockResolvedValueOnce(mockCreatedAppointment)
      mockPrisma.activity.create.mockResolvedValueOnce({})

      const response = await request(app)
        .post('/api/appointments')
        .send(validAppointmentData)
        .expect(201)

      expect(response.body.message).toBe('Appointment created successfully')
      expect(response.body.appointment).toEqual(mockCreatedAppointment)
    })

    it('validates required fields', async () => {
      const invalidData = { ...validAppointmentData }
      delete (invalidData as any).patientId

      const response = await request(app)
        .post('/api/appointments')
        .send(invalidData)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })

    it('prevents appointment conflicts', async () => {
      const conflictingAppointment = { id: 'existing-apt' }
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(conflictingAppointment)

      await request(app)
        .post('/api/appointments')
        .send(validAppointmentData)
        .expect(409)
    })

    it('validates future datetime', async () => {
      const pastDate = new Date()
      pastDate.setHours(pastDate.getHours() - 1)
      
      const pastAppointment = {
        ...validAppointmentData,
        dateTime: pastDate.toISOString()
      }

      const response = await request(app)
        .post('/api/appointments')
        .send(pastAppointment)
        .expect(400)

      expect(response.body.error).toBe('Validation failed')
    })
  })

  describe('PUT /api/appointments/:id', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000'
    
    it('updates appointment successfully', async () => {
      const mockExistingAppointment = {
        id: appointmentId,
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        dateTime: new Date('2024-12-31T14:00:00.000Z'),
        reason: 'Original reason',
        patient: { id: 'patient-123' },
        doctor: { 
          id: 'doctor-123', 
          firstName: 'Dr.', 
          lastName: 'Smith' 
        }
      }

      const updateData = { reason: 'Updated reason' }
      const mockUpdatedAppointment = { 
        ...mockExistingAppointment, 
        reason: 'Updated reason',
        patient: { id: 'patient-123', firstName: 'John', lastName: 'Doe' },
        doctor: { 
          id: 'doctor-123', 
          firstName: 'Dr.', 
          lastName: 'Smith', 
          specialization: 'Cardiology' 
        }
      }

      // Mock finding patient for authorization
      mockPrisma.patient.findUnique.mockResolvedValueOnce({ id: 'patient-123' })
      mockPrisma.appointment.findUnique.mockResolvedValueOnce(mockExistingAppointment)
      mockPrisma.appointment.update.mockResolvedValueOnce(mockUpdatedAppointment)
      mockPrisma.activity.updateMany.mockResolvedValueOnce({})

      const response = await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .send(updateData)
        .expect(200)

      expect(response.body.message).toBe('Appointment updated successfully')
    })

    it('validates UUID format in parameters', async () => {
      await request(app)
        .put('/api/appointments/invalid-uuid')
        .send({ reason: 'Updated reason' })
        .expect(400)
    })

    it('returns 404 for non-existent appointment', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValueOnce(null)

      await request(app)
        .put(`/api/appointments/${appointmentId}`)
        .send({ reason: 'Updated reason' })
        .expect(404)
    })
  })

  describe('DELETE /api/appointments/:id', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000'

    it('cancels appointment successfully', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)

      const mockAppointment = {
        id: appointmentId,
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        dateTime: futureDate,
        patient: { id: 'patient-123' },
        doctor: { 
          id: 'doctor-123', 
          firstName: 'Dr.', 
          lastName: 'Smith' 
        }
      }

      // Mock finding patient for authorization
      mockPrisma.patient.findUnique.mockResolvedValueOnce({ id: 'patient-123' })
      mockPrisma.appointment.findUnique.mockResolvedValueOnce(mockAppointment)
      mockPrisma.appointment.update.mockResolvedValueOnce({
        ...mockAppointment,
        status: 'CANCELLED'
      })
      mockPrisma.activity.updateMany.mockResolvedValueOnce({})

      const response = await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .expect(200)

      expect(response.body.message).toBe('Appointment cancelled successfully')
    })

    it('prevents cancelling past appointments', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      const mockAppointment = {
        id: appointmentId,
        patientId: 'patient-123',
        dateTime: pastDate,
        patient: { id: 'patient-123' },
        doctor: { firstName: 'Dr.', lastName: 'Smith' }
      }

      // Mock finding patient for authorization
      mockPrisma.patient.findUnique.mockResolvedValueOnce({ id: 'patient-123' })
      mockPrisma.appointment.findUnique.mockResolvedValueOnce(mockAppointment)

      await request(app)
        .delete(`/api/appointments/${appointmentId}`)
        .expect(400)
    })
  })
})