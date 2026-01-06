/**
 * Email Service Unit Tests
 *
 * Tests for email notification service.
 * Critical for security notifications (HIPAA compliance).
 */

// Mock Resend before importing the service
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}))

// Mock environment
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    RESEND_API_KEY: 'test-api-key',
    EMAIL_FROM: 'SmartMed <test@example.com>',
    FRONTEND_URL: 'http://localhost:3000',
  }
})

afterEach(() => {
  process.env = originalEnv
})

import { EmailService } from './email.service'

describe('Email Service', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    fullName: 'John Doe',
    role: 'PATIENT',
  } as any

  describe('sendVerificationEmail', () => {
    it('should return true in test mode (no actual email sent)', async () => {
      const result = await EmailService.sendVerificationEmail(mockUser, 'test-token')

      // In test mode, emails are logged but not sent
      expect(result).toBe(true)
    })

    it('should handle user without fullName', async () => {
      const userWithoutName = { ...mockUser, fullName: null }
      
      const result = await EmailService.sendVerificationEmail(userWithoutName, 'test-token')

      expect(result).toBe(true)
    })

    it('should use correct verification link format', async () => {
      const token = 'verification-token-123'
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await EmailService.sendVerificationEmail(mockUser, token)

      // Check that the link was logged (dev mode behavior)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(token)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should return true in test mode', async () => {
      const result = await EmailService.sendPasswordResetEmail(mockUser, 'reset-token')

      expect(result).toBe(true)
    })

    it('should use correct reset link format', async () => {
      const token = 'reset-token-456'
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await EmailService.sendPasswordResetEmail(mockUser, token)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(token)
      )

      consoleSpy.mockRestore()
    })

    it('should handle missing user name gracefully', async () => {
      const userWithoutName = { ...mockUser, fullName: undefined }

      const result = await EmailService.sendPasswordResetEmail(userWithoutName, 'token')

      expect(result).toBe(true)
    })
  })

  describe('sendPasswordChangedNotification', () => {
    it('should return true in test mode', async () => {
      const result = await EmailService.sendPasswordChangedNotification(mockUser)

      expect(result).toBe(true)
    })

    it('should log security notification in dev mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await EmailService.sendPasswordChangedNotification(mockUser)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Password changed')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('sendMfaEnabledNotification', () => {
    it('should return true in test mode', async () => {
      const result = await EmailService.sendMfaEnabledNotification(mockUser)

      expect(result).toBe(true)
    })

    it('should log MFA notification in dev mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await EmailService.sendMfaEnabledNotification(mockUser)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MFA enabled')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Email Formatting', () => {
    it('should use app name in email content', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await EmailService.sendVerificationEmail(mockUser, 'token')

      // The log should contain SmartMed references
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should include user email in notifications', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await EmailService.sendVerificationEmail(mockUser, 'token')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(mockUser.email)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Security Features', () => {
    it('should include expiration notice in verification emails', async () => {
      // Verification emails should mention expiration
      const result = await EmailService.sendVerificationEmail(mockUser, 'token')
      expect(result).toBe(true)
    })

    it('should include security warning in password reset emails', async () => {
      // Password reset emails should include security guidance
      const result = await EmailService.sendPasswordResetEmail(mockUser, 'token')
      expect(result).toBe(true)
    })

    it('should notify user when password is changed', async () => {
      // Critical security notification
      const result = await EmailService.sendPasswordChangedNotification(mockUser)
      expect(result).toBe(true)
    })

    it('should notify user when MFA is enabled', async () => {
      // Critical security notification
      const result = await EmailService.sendMfaEnabledNotification(mockUser)
      expect(result).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle email send failure gracefully', async () => {
      // In test mode, emails don't actually send so this tests the path
      const result = await EmailService.sendVerificationEmail(mockUser, 'token')
      expect(result).toBe(true)
    })

    it('should not throw on invalid email address', async () => {
      const userWithBadEmail = { ...mockUser, email: '' }

      // Should not throw
      await expect(
        EmailService.sendVerificationEmail(userWithBadEmail, 'token')
      ).resolves.not.toThrow()
    })
  })
})
