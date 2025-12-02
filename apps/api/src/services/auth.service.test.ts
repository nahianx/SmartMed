import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AuthService } from '../services/auth.service'
import { prisma } from '@smartmed/database'
import bcrypt from 'bcryptjs'
import { TokenService } from '../services/token.service'
import { EmailService } from '../services/email.service'
import { ValidationService } from '../services/validation.service'

// Mock dependencies
jest.mock('@smartmed/database')
jest.mock('bcryptjs')
jest.mock('../services/token.service')
jest.mock('../services/email.service')
jest.mock('../services/validation.service')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockTokenService = TokenService as jest.Mocked<typeof TokenService>
const mockEmailService = EmailService as jest.Mocked<typeof EmailService>
const mockValidationService = ValidationService as jest.Mocked<typeof ValidationService>

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('registerUser', () => {
    const mockUserData = {
      fullName: 'Dr. John Smith',
      email: 'john@example.com',
      password: 'SecurePass123!'
    }

    const mockCreatedUser = {
      id: 'user-123',
      email: 'john@example.com',
      fullName: 'Dr. John Smith',
      role: 'DOCTOR',
      emailVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    beforeEach(() => {
      mockValidationService.validateName.mockReturnValue(undefined)
      mockValidationService.validateEmail.mockReturnValue(undefined)
      mockValidationService.validatePassword.mockReturnValue(undefined)
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockBcrypt.hash.mockResolvedValue('hashed-password')
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser as any)
      mockPrisma.emailVerification.create.mockResolvedValue({
        id: 'verification-123',
        verificationToken: 'token-123'
      } as any)
      mockTokenService.issueTokensForUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        session: {} as any
      })
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined)
    })

    it('should successfully register a new doctor', async () => {
      const result = await AuthService.registerUser(
        mockUserData,
        'DOCTOR' as any,
        '127.0.0.1',
        { userAgent: 'test' }
      )

      expect(mockValidationService.validateName).toHaveBeenCalledWith('Dr. John Smith')
      expect(mockValidationService.validateEmail).toHaveBeenCalledWith('john@example.com')
      expect(mockValidationService.validatePassword).toHaveBeenCalledWith('SecurePass123!')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@example.com' } })
      expect(mockBcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 12)
      expect(mockPrisma.user.create).toHaveBeenCalled()
      expect(result.user.email).toBe('john@example.com')
      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
    })

    it('should throw error if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockCreatedUser as any)

      await expect(
        AuthService.registerUser(mockUserData, 'DOCTOR' as any, '127.0.0.1', {})
      ).rejects.toThrow('EMAIL_ALREADY_IN_USE')
    })

    it('should throw error for invalid email', async () => {
      mockValidationService.validateEmail.mockImplementation(() => {
        throw new Error('INVALID_EMAIL')
      })

      await expect(
        AuthService.registerUser(mockUserData, 'DOCTOR' as any, '127.0.0.1', {})
      ).rejects.toThrow('INVALID_EMAIL')
    })
  })

  describe('loginUser', () => {
    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      fullName: 'Dr. John Smith',
      role: 'DOCTOR',
      passwordHash: 'hashed-password',
      emailVerified: true,
      isActive: true
    }

    beforeEach(() => {
      mockValidationService.validateEmail.mockReturnValue(undefined)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockBcrypt.compare.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser as any)
      mockTokenService.issueTokensForUser.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        session: {} as any
      })
    })

    it('should successfully login with valid credentials', async () => {
      const result = await AuthService.loginUser(
        'john@example.com',
        'SecurePass123!',
        '127.0.0.1',
        {}
      )

      expect(mockValidationService.validateEmail).toHaveBeenCalledWith('john@example.com')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      })
      expect(mockBcrypt.compare).toHaveBeenCalledWith('SecurePass123!', 'hashed-password')
      expect(result.user.email).toBe('john@example.com')
      expect(result.accessToken).toBe('access-token')
    })

    it('should throw error for invalid credentials', async () => {
      mockBcrypt.compare.mockResolvedValue(false)

      await expect(
        AuthService.loginUser('john@example.com', 'wrongpassword', '127.0.0.1', {})
      ).rejects.toThrow('INVALID_CREDENTIALS')
    })

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(
        AuthService.loginUser('john@example.com', 'SecurePass123!', '127.0.0.1', {})
      ).rejects.toThrow('INVALID_CREDENTIALS')
    })

    it('should throw error for inactive account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false
      } as any)

      await expect(
        AuthService.loginUser('john@example.com', 'SecurePass123!', '127.0.0.1', {})
      ).rejects.toThrow('ACCOUNT_INACTIVE')
    })
  })

  describe('verifyEmail', () => {
    const mockVerification = {
      id: 'verification-123',
      userId: 'user-123',
      verificationToken: 'token-123',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      user: {
        id: 'user-123',
        email: 'john@example.com',
        fullName: 'Dr. John Smith',
        role: 'DOCTOR'
      }
    }

    it('should successfully verify email with valid token', async () => {
      mockPrisma.emailVerification.findUnique.mockResolvedValue(mockVerification as any)
      mockPrisma.$transaction.mockResolvedValue([{}, {}] as any)

      const result = await AuthService.verifyEmail('token-123')

      expect(mockPrisma.emailVerification.findUnique).toHaveBeenCalledWith({
        where: { verificationToken: 'token-123' },
        include: { user: true }
      })
      expect(result.email).toBe('john@example.com')
      expect(result.emailVerified).toBe(true)
    })

    it('should throw error for expired token', async () => {
      mockPrisma.emailVerification.findUnique.mockResolvedValue({
        ...mockVerification,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      } as any)

      await expect(AuthService.verifyEmail('token-123')).rejects.toThrow('INVALID_OR_EXPIRED_TOKEN')
    })

    it('should throw error for non-existent token', async () => {
      mockPrisma.emailVerification.findUnique.mockResolvedValue(null)

      await expect(AuthService.verifyEmail('invalid-token')).rejects.toThrow('INVALID_OR_EXPIRED_TOKEN')
    })
  })

  describe('requestPasswordReset', () => {
    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      fullName: 'Dr. John Smith'
    }

    it('should create password reset for existing user', async () => {
      mockValidationService.validateEmail.mockReturnValue(undefined)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
      mockPrisma.passwordReset.create.mockResolvedValue({} as any)
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined)

      await AuthService.requestPasswordReset('john@example.com')

      expect(mockValidationService.validateEmail).toHaveBeenCalledWith('john@example.com')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      })
      expect(mockPrisma.passwordReset.create).toHaveBeenCalled()
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled()
    })

    it('should silently return for non-existent user', async () => {
      mockValidationService.validateEmail.mockReturnValue(undefined)
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(AuthService.requestPasswordReset('john@example.com')).resolves.toBeUndefined()
      expect(mockPrisma.passwordReset.create).not.toHaveBeenCalled()
    })
  })
})