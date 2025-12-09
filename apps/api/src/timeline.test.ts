import request from 'supertest'
import app from './index'

describe('Timeline API', () => {
  it('returns a list of activities', async () => {
    const res = await request(app).get('/api/timeline')

    expect(res.status).toBe(401)
  })
})
