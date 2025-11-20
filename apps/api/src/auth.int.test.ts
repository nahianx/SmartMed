import request from 'supertest'
import app from './index'

// NOTE: These tests assume a test database and prisma schema are properly configured.

describe('Auth integration', () => {
  const doctorEmail = 'doctor.test@example.com'
  const patientEmail = 'patient.test@example.com'
  const password = 'Aa1!test!'

  it('registers a new doctor and logs in', async () => {
    const registerRes = await request(app).post('/api/auth/register/doctor').send({
      fullName: 'Dr Test',
      email: doctorEmail,
      password,
    })

    expect(registerRes.status).toBe(201)
    expect(registerRes.body.user).toMatchObject({ email: doctorEmail, role: 'DOCTOR' })
    expect(registerRes.body.accessToken).toBeDefined()

    const loginRes = await request(app).post('/api/auth/login').send({
      email: doctorEmail,
      password,
    })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.user).toMatchObject({ email: doctorEmail, role: 'DOCTOR' })
    expect(loginRes.body.accessToken).toBeDefined()
  })

  it('registers a new patient and logs in', async () => {
    const registerRes = await request(app).post('/api/auth/register/patient').send({
      fullName: 'Patient Test',
      email: patientEmail,
      password,
    })

    expect(registerRes.status).toBe(201)
    expect(registerRes.body.user).toMatchObject({ email: patientEmail, role: 'PATIENT' })
    expect(registerRes.body.accessToken).toBeDefined()

    const loginRes = await request(app).post('/api/auth/login').send({
      email: patientEmail,
      password,
    })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.user).toMatchObject({ email: patientEmail, role: 'PATIENT' })
    expect(loginRes.body.accessToken).toBeDefined()
  })

  it('rejects duplicate email registration', async () => {
    const res = await request(app).post('/api/auth/register/doctor').send({
      fullName: 'Duplicate',
      email: doctorEmail,
      password,
    })

    expect(res.status).toBe(400)
  })

  it('supports password reset request endpoint', async () => {
    const res = await request(app).post('/api/auth/password-reset/request').send({
      email: doctorEmail,
    })

    expect(res.status).toBe(200)
  })
})
