import { jest } from '@jest/globals'
jest.unmock('@smartmed/database')
import request from 'supertest'
import app from './index'

describe('Health check endpoint', () => {
  it('returns API status', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      status: 'ok',
      message: 'SmartMed API is running',
    })
  })
})
