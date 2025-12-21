import { jest } from '@jest/globals'
// Ensure we use real Prisma client
jest.unmock('@smartmed/database')
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { prisma } from '@smartmed/database'

// Ensure JWT secret matches API middleware default
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me'

import app from './index'

describe('Doctor advanced search', () => {
  const email = 'search.doctor@example.com'
  let doctorId: string
  let token: string

  beforeAll(async () => {
    // Cleanup any existing test data
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      await prisma.doctor.deleteMany({ where: { userId: existingUser.id } })
      await prisma.user.delete({ where: { id: existingUser.id } })
    }

    const user = await prisma.user.create({
      data: {
        email,
        fullName: 'Search Doctor',
        role: 'DOCTOR',
        authProvider: 'LOCAL',
        emailVerified: true,
      },
    })

    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        firstName: 'Searchy',
        lastName: 'Doctor',
        specialization: 'Cardiology',
        qualification: 'MD',
        experience: 5,
        phoneNumber: '123-456-7890',
        licenseNumber: `LIC-${user.id.slice(0, 8)}`,
        consultationFee: 100,
        availableDays: [],
        availableTimeSlots: [],
      },
    })

    doctorId = doctor.id

    token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: 'DOCTOR',
      },
      jwtSecret,
      { expiresIn: '1h' },
    )
  })

  afterAll(async () => {
    await prisma.doctor.deleteMany({ where: { id: doctorId } })
    await prisma.user.deleteMany({ where: { email } })
  })

  it('returns matching doctors with pagination metadata', async () => {
    const res = await request(app)
      .get('/api/doctors/search/advanced')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'Searchy', page: 1, limit: 5 })

    expect(res.status).toBe(200)
    expect(res.body.doctors?.length).toBeGreaterThan(0)
    const ids = res.body.doctors.map((d: any) => d.id)
    expect(ids).toContain(doctorId)
    expect(res.body.pagination).toMatchObject({
      currentPage: 1,
      limit: 5,
    })
  })
})
