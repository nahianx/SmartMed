import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('0123456789abcdef0123456789abcdef', 'hex')),
  createCipheriv: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue('encrypted'),
    final: jest.fn().mockReturnValue(''),
    getAuthTag: jest.fn().mockReturnValue(Buffer.from('0123456789abcdef', 'hex')),
  }),
  createDecipheriv: jest.fn().mockReturnValue({
    setAuthTag: jest.fn(),
    update: jest.fn().mockReturnValue('decrypted-secret'),
    final: jest.fn().mockReturnValue(''),
  }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('hashed-backup-code'),
  }),
}))

// Mock otplib
jest.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: jest.fn().mockReturnValue('MOCK_SECRET_KEY'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/SmartMed:test@email.com?secret=MOCK_SECRET_KEY'),
    verify: jest.fn(),
  },
}))

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
}))

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

jest.mock('@smartmed/database', () => ({
  prisma: mockPrisma,
}))

import { MfaService } from './mfa.service'
import { authenticator } from 'otplib'

describe('MfaService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateMfaSetup', () => {
    it('generates MFA setup with secret, QR code, and backup codes', async () => {
      mockPrisma.user.update.mockResolvedValue({})

      const result = await MfaService.generateMfaSetup('user-123', 'test@email.com')

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('qrCodeUrl')
      expect(result).toHaveProperty('backupCodes')
      expect(result.backupCodes).toHaveLength(10)
      expect(result.qrCodeUrl).toContain('data:image/png;base64')
    })

    it('stores encrypted secret and hashed backup codes', async () => {
      mockPrisma.user.update.mockResolvedValue({})

      await MfaService.generateMfaSetup('user-123', 'test@email.com')

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          mfaSecret: expect.any(String),
          mfaBackupCodes: expect.any(Array),
          isMfaEnabled: false,
        },
      })
    })

    it('does not enable MFA until verified', async () => {
      mockPrisma.user.update.mockResolvedValue({})

      await MfaService.generateMfaSetup('user-123', 'test@email.com')

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isMfaEnabled: false,
          }),
        })
      )
    })
  })

  describe('verifyAndEnableMfa', () => {
    it('returns error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await MfaService.verifyAndEnableMfa('user-123', '123456')

      expect(result.success).toBe(false)
      expect(result.message).toContain('MFA setup not found')
    })

    it('returns error when MFA secret not set', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ mfaSecret: null })

      const result = await MfaService.verifyAndEnableMfa('user-123', '123456')

      expect(result.success).toBe(false)
      expect(result.message).toContain('MFA setup not found')
    })

    it('returns error when MFA is already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'encrypted-secret',
        isMfaEnabled: true,
      })

      const result = await MfaService.verifyAndEnableMfa('user-123', '123456')

      expect(result.success).toBe(false)
      expect(result.message).toContain('already enabled')
    })

    it('returns error for invalid TOTP code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'iv:tag:encrypted',
        isMfaEnabled: false,
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false)

      const result = await MfaService.verifyAndEnableMfa('user-123', '000000')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid verification code')
    })

    it('enables MFA on successful verification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'iv:tag:encrypted',
        isMfaEnabled: false,
      })
      mockPrisma.user.update.mockResolvedValue({});

      (authenticator.verify as jest.Mock).mockReturnValue(true)

      const result = await MfaService.verifyAndEnableMfa('user-123', '123456')

      expect(result.success).toBe(true)
      expect(result.message).toContain('enabled successfully')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          isMfaEnabled: true,
          mfaVerifiedAt: expect.any(Date),
        },
      })
    })
  })

  describe('verifyTotpCode', () => {
    it('returns error when MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'secret',
        isMfaEnabled: false,
        mfaBackupCodes: [],
      })

      const result = await MfaService.verifyTotpCode('user-123', '123456')

      expect(result.success).toBe(false)
      expect(result.message).toContain('not enabled')
    })

    it('succeeds with valid TOTP code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'iv:tag:encrypted',
        isMfaEnabled: true,
        mfaBackupCodes: [],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(true)

      const result = await MfaService.verifyTotpCode('user-123', '123456')

      expect(result.success).toBe(true)
      expect(result.message).toContain('TOTP verification successful')
      expect(result.usedBackupCode).toBeUndefined()
    })

    it('succeeds with valid backup code', async () => {
      const hashedBackupCode = 'hashed-backup-code'
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'iv:tag:encrypted',
        isMfaEnabled: true,
        mfaBackupCodes: [hashedBackupCode, 'other-code'],
      })
      mockPrisma.user.update.mockResolvedValue({});

      (authenticator.verify as jest.Mock).mockReturnValue(false)

      const result = await MfaService.verifyTotpCode('user-123', 'BACKUP01')

      expect(result.success).toBe(true)
      expect(result.usedBackupCode).toBe(true)
      expect(result.message).toContain('Backup code used')
    })

    it('removes used backup code from list', async () => {
      const hashedBackupCode = 'hashed-backup-code'
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'iv:tag:encrypted',
        isMfaEnabled: true,
        mfaBackupCodes: [hashedBackupCode, 'other-code', 'third-code'],
      })
      mockPrisma.user.update.mockResolvedValue({});

      (authenticator.verify as jest.Mock).mockReturnValue(false)

      await MfaService.verifyTotpCode('user-123', 'BACKUP01')

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          mfaBackupCodes: ['other-code', 'third-code'],
        },
      })
    })

    it('fails with invalid code and no matching backup', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'iv:tag:encrypted',
        isMfaEnabled: true,
        mfaBackupCodes: ['different-hash'],
      });

      (authenticator.verify as jest.Mock).mockReturnValue(false)

      const result = await MfaService.verifyTotpCode('user-123', 'WRONGCODE')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid verification code')
    })
  })

  describe('disableMfa', () => {
    it('returns error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await MfaService.disableMfa('user-123')

      expect(result.success).toBe(false)
    })

    it('returns error when MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMfaEnabled: false,
      })

      const result = await MfaService.disableMfa('user-123')

      expect(result.success).toBe(false)
      expect(result.message).toContain('not enabled')
    })

    it('disables MFA and clears secrets', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMfaEnabled: true,
      })
      mockPrisma.user.update.mockResolvedValue({})

      const result = await MfaService.disableMfa('user-123')

      expect(result.success).toBe(true)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          isMfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
          mfaVerifiedAt: null,
        },
      })
    })
  })

  describe('regenerateBackupCodes', () => {
    it('returns error when MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMfaEnabled: false,
      })

      const result = await MfaService.regenerateBackupCodes('user-123')

      expect(result.success).toBe(false)
      expect(result.message).toContain('MFA is not enabled')
    })

    it('generates and stores new backup codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMfaEnabled: true,
      })
      mockPrisma.user.update.mockResolvedValue({})

      const result = await MfaService.regenerateBackupCodes('user-123')

      expect(result.success).toBe(true)
      expect(result.backupCodes).toHaveLength(10)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          mfaBackupCodes: expect.any(Array),
        },
      })
    })
  })

  describe('getMfaStatus', () => {
    it('returns MFA status for user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMfaEnabled: true,
        mfaVerifiedAt: new Date('2024-01-15'),
        mfaBackupCodes: ['code1', 'code2', 'code3'],
      })

      const result = await MfaService.getMfaStatus('user-123')

      expect(result).toEqual({
        enabled: true,
        verifiedAt: expect.any(Date),
        backupCodesRemaining: 3,
      })
    })

    it('returns disabled status when MFA not set up', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        isMfaEnabled: false,
        mfaVerifiedAt: null,
        mfaBackupCodes: [],
      })

      const result = await MfaService.getMfaStatus('user-123')

      expect(result).toEqual({
        enabled: false,
        verifiedAt: null,
        backupCodesRemaining: 0,
      })
    })

    it('returns null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await MfaService.getMfaStatus('non-existent')

      expect(result).toBeNull()
    })
  })
})
