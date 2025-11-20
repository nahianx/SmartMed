import request from 'supertest'
import app from './index'
import { prisma } from '@smartmed/database'
import bcrypt from 'bcryptjs'

describe('Auth API - Registration', () => {
  // Clean up test users after each test
  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-registration'
        }
      }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('successfully registers a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-1@example.com',
          password: 'SecurePass123',
          role: 'PATIENT'
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('message', 'User registered successfully')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('id')
      expect(response.body.user).toHaveProperty('email', 'test-registration-1@example.com')
      expect(response.body.user).toHaveProperty('role', 'PATIENT')
      expect(response.body.user).not.toHaveProperty('password')

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'test-registration-1@example.com' }
      })
      expect(user).toBeTruthy()
      expect(user?.email).toBe('test-registration-1@example.com')
    })

    it('hashes the password correctly', async () => {
      const plainPassword = 'SecurePass123'
      
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-2@example.com',
          password: plainPassword,
          role: 'DOCTOR'
        })

      const user = await prisma.user.findUnique({
        where: { email: 'test-registration-2@example.com' }
      })

      expect(user).toBeTruthy()
      expect(user?.password).not.toBe(plainPassword)
      
      // Verify password hash is valid
      const isValid = await bcrypt.compare(plainPassword, user?.password || '')
      expect(isValid).toBe(true)
    })

    it('returns 409 if user with email already exists', async () => {
      // Create a user first
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-3@example.com',
          password: 'SecurePass123',
          role: 'PATIENT'
        })

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-3@example.com',
          password: 'DifferentPass456',
          role: 'DOCTOR'
        })

      expect(response.status).toBe(409)
      expect(response.body).toHaveProperty('error', 'User with this email already exists')
    })

    it('validates email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123',
          role: 'PATIENT'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Invalid email format'
          })
        ])
      )
    })

    it('validates password strength - minimum length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-4@example.com',
          password: 'Short1',
          role: 'PATIENT'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('at least 8 characters')
          })
        ])
      )
    })

    it('validates password strength - requires uppercase letter', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-5@example.com',
          password: 'lowercase123',
          role: 'PATIENT'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('uppercase letter')
          })
        ])
      )
    })

    it('validates password strength - requires lowercase letter', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-6@example.com',
          password: 'UPPERCASE123',
          role: 'PATIENT'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('lowercase letter')
          })
        ])
      )
    })

    it('validates password strength - requires number', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-7@example.com',
          password: 'NoNumbers',
          role: 'PATIENT'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('number')
          })
        ])
      )
    })

    it('validates role is one of allowed values', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-8@example.com',
          password: 'SecurePass123',
          role: 'INVALID_ROLE'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation failed')
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'role',
            message: expect.stringContaining('ADMIN, DOCTOR, PATIENT, NURSE')
          })
        ])
      )
    })

    it('accepts all valid roles', async () => {
      const roles = ['PATIENT', 'DOCTOR', 'NURSE', 'ADMIN']
      
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i]
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-registration-role-${i}@example.com`,
            password: 'SecurePass123',
            role
          })

        expect(response.status).toBe(201)
        expect(response.body.user.role).toBe(role)
      }
    })

    it('requires all fields to be present', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test-registration-9@example.com'
          // Missing password and role
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Validation failed')
    })

    it('normalizes email to lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'Test-Registration-10@EXAMPLE.COM',
          password: 'SecurePass123',
          role: 'PATIENT'
        })

      expect(response.status).toBe(201)
      expect(response.body.user.email).toBe('test-registration-10@example.com')

      const user = await prisma.user.findUnique({
        where: { email: 'test-registration-10@example.com' }
      })
      expect(user).toBeTruthy()
    })
  })
})
