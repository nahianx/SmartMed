import { 
  createAppointmentSchema, 
  updateAppointmentSchema, 
  appointmentIdSchema,
  appointmentQuerySchema 
} from '../../src/schemas/appointment.schemas'
import { AppointmentStatus } from '@smartmed/database'

describe('Appointment Schema Validation', () => {
  describe('createAppointmentSchema', () => {
    const validData = {
      patientId: '550e8400-e29b-41d4-a716-446655440000',
      doctorId: '550e8400-e29b-41d4-a716-446655440001',
      dateTime: '2024-12-31T14:00:00.000Z',
      duration: 30,
      reason: 'Regular checkup'
    }

    it('validates correct appointment data', () => {
      const result = createAppointmentSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.duration).toBe(30)
        expect(result.data.reason).toBe('Regular checkup')
      }
    })

    it('requires patientId', () => {
      const data = { ...validData }
      delete (data as any).patientId
      
      const result = createAppointmentSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ['patientId'],
            code: 'invalid_type'
          })
        )
      }
    })

    it('requires doctorId', () => {
      const data = { ...validData }
      delete (data as any).doctorId
      
      const result = createAppointmentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('requires valid UUID for patientId', () => {
      const data = { ...validData, patientId: 'invalid-uuid' }
      
      const result = createAppointmentSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ['patientId'],
            message: 'Invalid UUID format'
          })
        )
      }
    })

    it('requires future datetime', () => {
      const pastDate = new Date()
      pastDate.setHours(pastDate.getHours() - 1)
      
      const data = { ...validData, dateTime: pastDate.toISOString() }
      
      const result = createAppointmentSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            message: 'Appointment must be scheduled for a future date and time'
          })
        )
      }
    })

    it('validates duration range', () => {
      const shortDuration = { ...validData, duration: 10 }
      const longDuration = { ...validData, duration: 500 }
      
      expect(createAppointmentSchema.safeParse(shortDuration).success).toBe(false)
      expect(createAppointmentSchema.safeParse(longDuration).success).toBe(false)
    })

    it('validates reason length', () => {
      const shortReason = { ...validData, reason: 'No' }
      const longReason = { ...validData, reason: 'A'.repeat(501) }
      
      expect(createAppointmentSchema.safeParse(shortReason).success).toBe(false)
      expect(createAppointmentSchema.safeParse(longReason).success).toBe(false)
    })

    it('trims whitespace from reason', () => {
      const data = { ...validData, reason: '  Regular checkup  ' }
      
      const result = createAppointmentSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.reason).toBe('Regular checkup')
      }
    })

    it('sets default duration to 30 minutes', () => {
      const data = { ...validData }
      delete (data as any).duration
      
      const result = createAppointmentSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.duration).toBe(30)
      }
    })

    it('rejects extra fields', () => {
      const data = { ...validData, extraField: 'not allowed' }
      
      const result = createAppointmentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('updateAppointmentSchema', () => {
    it('allows partial updates', () => {
      const data = { reason: 'Updated reason' }
      
      const result = updateAppointmentSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('validates status enum', () => {
      const validStatus = { status: AppointmentStatus.CONFIRMED }
      const invalidStatus = { status: 'INVALID_STATUS' }
      
      expect(updateAppointmentSchema.safeParse(validStatus).success).toBe(true)
      expect(updateAppointmentSchema.safeParse(invalidStatus).success).toBe(false)
    })

    it('validates future datetime for updates', () => {
      const pastDate = new Date()
      pastDate.setHours(pastDate.getHours() - 1)
      
      const data = { dateTime: pastDate.toISOString() }
      
      const result = updateAppointmentSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('appointmentIdSchema', () => {
    it('validates UUID parameter', () => {
      const validId = { id: '550e8400-e29b-41d4-a716-446655440000' }
      const invalidId = { id: 'invalid-uuid' }
      
      expect(appointmentIdSchema.safeParse(validId).success).toBe(true)
      expect(appointmentIdSchema.safeParse(invalidId).success).toBe(false)
    })
  })

  describe('appointmentQuerySchema', () => {
    it('validates query parameters', () => {
      const validQuery = {
        status: AppointmentStatus.SCHEDULED,
        limit: '25',
        offset: '0',
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-12-31T23:59:59.000Z'
      }
      
      const result = appointmentQuerySchema.safeParse(validQuery)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
        expect(result.data.offset).toBe(0)
      }
    })

    it('sets default pagination values', () => {
      const data = {}
      
      const result = appointmentQuerySchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.offset).toBe(0)
      }
    })

    it('validates date range logic', () => {
      const invalidRange = {
        from: '2024-12-31T00:00:00.000Z',
        to: '2024-01-01T00:00:00.000Z'
      }
      
      const result = appointmentQuerySchema.safeParse(invalidRange)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            message: 'From date must be before or equal to to date'
          })
        )
      }
    })

    it('validates limit range', () => {
      const tooSmall = { limit: '0' }
      const tooLarge = { limit: '101' }
      
      expect(appointmentQuerySchema.safeParse(tooSmall).success).toBe(false)
      expect(appointmentQuerySchema.safeParse(tooLarge).success).toBe(false)
    })
  })
})