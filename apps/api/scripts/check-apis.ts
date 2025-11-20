import request from 'supertest'
import dotenv from 'dotenv'
import app from '../src/index'

dotenv.config()

async function main() {
  const base = '/api'

  console.log('=== LOGIN DOCTOR ===')
  const loginDoctor = await request(app)
    .post(`${base}/auth/login`)
    .send({ email: 'doctor@smartmed.com', password: 'doctor123' })

  console.log('Status:', loginDoctor.status)
  console.log('Body:', loginDoctor.body)

  const doctorToken: string | undefined = loginDoctor.body?.token

  console.log('\n=== LOGIN PATIENT ===')
  const loginPatient = await request(app)
    .post(`${base}/auth/login`)
    .send({ email: 'patient@smartmed.com', password: 'patient123' })

  console.log('Status:', loginPatient.status)
  console.log('Body:', loginPatient.body)

  const patientToken: string | undefined = loginPatient.body?.token

  const docAuth = doctorToken ? { Authorization: `Bearer ${doctorToken}` } : {}
  const patAuth = patientToken ? { Authorization: `Bearer ${patientToken}` } : {}

  console.log('\n=== GET /api/profile (doctor) ===')
  const profile = await request(app).get(`${base}/profile`).set(docAuth)
  console.log('Status:', profile.status)
  console.log('Body:', profile.body)

  console.log('\n=== GET /api/doctor/profile ===')
  const doctorProfile = await request(app)
    .get(`${base}/doctor/profile`)
    .set(docAuth)
  console.log('Status:', doctorProfile.status)
  console.log('Body:', doctorProfile.body)

  console.log('\n=== GET /api/patient/profile ===')
  const patientProfile = await request(app)
    .get(`${base}/patient/profile`)
    .set(patAuth)
  console.log('Status:', patientProfile.status)
  console.log('Body:', patientProfile.body)

  console.log('\n=== GET /api/doctor/availability ===')
  const doctorAvail = await request(app)
    .get(`${base}/doctor/availability`)
    .set(docAuth)
  console.log('Status:', doctorAvail.status)
  console.log('Body:', doctorAvail.body)

  console.log('\n=== GET /api/patient/preferred-doctors ===')
  const preferredDocs = await request(app)
    .get(`${base}/patient/preferred-doctors`)
    .set(patAuth)
  console.log('Status:', preferredDocs.status)
  console.log('Body:', preferredDocs.body)
}

main().catch((err) => {
  console.error('check-apis error:', err)
  process.exit(1)
})
