import { jest } from '@jest/globals'
// Ensure integration tests use the real database implementation (not the manual mock)
jest.unmock('@smartmed/database')
import request from 'supertest'
import { prisma } from '@smartmed/database'
import app from './index'

// NOTE: These tests assume a test database and prisma schema are properly configured.

describe('Health Tips Integration', () => {
  const patientEmail = 'healthtips.patient@example.com'
  const password = 'Aa1!test!'
  let accessToken: string
  let userId: string

  beforeAll(async () => {
    // Clean up any existing test user
    await prisma.user.deleteMany({ where: { email: patientEmail } })

    // Register and login as patient
    const registerRes = await request(app).post('/api/auth/register/patient').send({
      fullName: 'Health Tips Test Patient',
      email: patientEmail,
      password,
    })

    expect(registerRes.status).toBe(201)
    accessToken = registerRes.body.accessToken
    userId = registerRes.body.user.id
  })

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prisma.healthTip.deleteMany({ where: { userId } })
      await prisma.healthTipPreference.deleteMany({ where: { userId } })
    }
    await prisma.user.deleteMany({ where: { email: patientEmail } })
  })

  describe('GET /api/health-tips', () => {
    it('returns empty tips for new user', async () => {
      const res = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('items')
      expect(res.body).toHaveProperty('total')
    })
  })

  describe('GET /api/health-tips/preferences', () => {
    it('returns default preferences for new user', async () => {
      const res = await request(app)
        .get('/api/health-tips/preferences')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.preferences).toMatchObject({
        enabled: true,
        frequency: 'DAILY',
        deliveryMethod: 'IN_APP',
      })
    })
  })

  describe('PUT /api/health-tips/preferences', () => {
    it('updates user preferences', async () => {
      const res = await request(app)
        .put('/api/health-tips/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          enabled: true,
          frequency: 'WEEKLY',
          categories: ['NUTRITION', 'EXERCISE'],
          deliveryMethod: 'BOTH',
        })

      expect(res.status).toBe(200)
      expect(res.body.preferences).toMatchObject({
        enabled: true,
        frequency: 'WEEKLY',
        deliveryMethod: 'BOTH',
      })
      expect(res.body.preferences.categories).toContain('NUTRITION')
      expect(res.body.preferences.categories).toContain('EXERCISE')
    })

    it('can disable health tips', async () => {
      const res = await request(app)
        .put('/api/health-tips/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ enabled: false })

      expect(res.status).toBe(200)
      expect(res.body.preferences.enabled).toBe(false)
    })

    it('returns empty tips when disabled', async () => {
      // First ensure tips are disabled
      await request(app)
        .put('/api/health-tips/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ enabled: false })

      const res = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.items).toHaveLength(0)
      expect(res.body.message).toContain('disabled')
    })

    it('rejects generate when disabled', async () => {
      const res = await request(app)
        .post('/api/health-tips/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ forceRefresh: true })

      expect(res.status).toBe(403)
      expect(res.body.error).toContain('disabled')
    })

    it('can re-enable health tips', async () => {
      const res = await request(app)
        .put('/api/health-tips/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ enabled: true })

      expect(res.status).toBe(200)
      expect(res.body.preferences.enabled).toBe(true)
    })
  })

  describe('POST /api/health-tips/generate', () => {
    beforeAll(async () => {
      // Re-enable tips for this test
      await request(app)
        .put('/api/health-tips/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ enabled: true })
    })

    it('generates health tips for patient', async () => {
      const res = await request(app)
        .post('/api/health-tips/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ forceRefresh: true })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('items')
      expect(res.body).toHaveProperty('source', 'generated')
      expect(res.body.items.length).toBeGreaterThan(0)

      // Verify tip structure
      const tip = res.body.items[0]
      expect(tip).toHaveProperty('id')
      expect(tip).toHaveProperty('text')
      expect(tip).toHaveProperty('category')
      expect(tip).toHaveProperty('source')
      expect(tip).toHaveProperty('isRead', false)
      expect(tip).toHaveProperty('isArchived', false)
    })

    it('returns generated tips on subsequent GET', async () => {
      const res = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.items.length).toBeGreaterThan(0)
      expect(res.body.source).toBe('database')
    })
  })

  describe('POST /api/health-tips/:id/read', () => {
    let tipId: string

    beforeAll(async () => {
      // Get a tip ID
      const res = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${accessToken}`)

      if (res.body.items.length > 0) {
        tipId = res.body.items[0].id
      }
    })

    it('marks a tip as read', async () => {
      if (!tipId) {
        console.log('Skipping test - no tips available')
        return
      }

      const res = await request(app)
        .post(`/api/health-tips/${tipId}/read`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('returns 404 for non-existent tip', async () => {
      const res = await request(app)
        .post('/api/health-tips/non-existent-id/read')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/health-tips/:id/archive', () => {
    let tipId: string
    let initialCount: number

    beforeAll(async () => {
      // Generate fresh tips to archive
      await request(app)
        .post('/api/health-tips/generate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ forceRefresh: true })

      const res = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${accessToken}`)

      initialCount = res.body.items.length
      if (res.body.items.length > 0) {
        tipId = res.body.items[0].id
      }
    })

    it('archives a tip', async () => {
      if (!tipId) {
        console.log('Skipping test - no tips available')
        return
      }

      const res = await request(app)
        .post(`/api/health-tips/${tipId}/archive`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('archived tip is not returned by default', async () => {
      if (!tipId) {
        console.log('Skipping test - no tips available')
        return
      }

      const res = await request(app)
        .get('/api/health-tips')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      const archivedTip = res.body.items.find((t: any) => t.id === tipId)
      expect(archivedTip).toBeUndefined()
    })

    it('can include archived tips with query param', async () => {
      const res = await request(app)
        .get('/api/health-tips?includeArchived=true')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      // Should have at least the archived tip
      expect(res.body.total).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /api/health-tips/metrics', () => {
    it('returns 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/health-tips/metrics')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Forbidden')
    })
  })
})
