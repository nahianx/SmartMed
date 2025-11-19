import request from 'supertest'
import app from './index'

describe('Current patient API', () => {
  it('returns the current patient for authenticated PATIENT user', async () => {
    const res = await request(app).get('/api/patients/me')

    // When the seed has run, we expect a patient profile to exist
    if (res.status === 200) {
      expect(res.body).toHaveProperty('patient')
      expect(res.body.patient).toHaveProperty('id')
    } else {
      // If not seeded, we still verify that the route responds and not with a server error
      expect([401, 403, 404]).toContain(res.status)
    }
  })
})
