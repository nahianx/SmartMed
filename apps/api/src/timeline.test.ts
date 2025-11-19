import request from 'supertest'
import app from './index'

describe('Timeline API', () => {
  it('returns a list of activities', async () => {
    const res = await request(app).get('/api/timeline')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(Array.isArray(res.body.items)).toBe(true)
  })
})
