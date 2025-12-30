import request from 'supertest'
import app from './index'

describe('Health Tips API', () => {
  describe('GET /api/health-tips', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/health-tips')
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/health-tips/generate', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/health-tips/generate')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/health-tips/preferences', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/health-tips/preferences')
      expect(res.status).toBe(401)
    })
  })

  describe('PUT /api/health-tips/preferences', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app)
        .put('/api/health-tips/preferences')
        .send({ enabled: true })
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/health-tips/:id/read', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/health-tips/fake-id/read')
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/health-tips/:id/archive', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).post('/api/health-tips/fake-id/archive')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/health-tips/metrics', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/api/health-tips/metrics')
      expect(res.status).toBe(401)
    })
  })
})
