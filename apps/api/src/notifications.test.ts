import request from 'supertest'
import app from './index'

describe('Notifications API', () => {
  it('responds with a list of notifications for the current user', async () => {
    const res = await request(app).get('/api/notifications')

    expect(res.status).toBe(401)
  })
})
