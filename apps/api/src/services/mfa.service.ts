import * as crypto from 'crypto'
import { prisma } from '@smartmed/database'
import { authenticator } from 'otplib'
import * as qrcode from 'qrcode'

// Configure authenticator
authenticator.options = {
  step: 30, // 30 second window
  digits: 6,
  algorithm: 'sha1'
}

const APP_NAME = 'SmartMed'

// Encryption key for MFA secrets (should be in env vars)
const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

interface MfaSetupResult {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

interface MfaVerifyResult {
  success: boolean
  message: string
  usedBackupCode?: boolean
}

/**
 * Encrypt a string using AES-256-GCM
 */
function encrypt(text: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 */
function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Generate random backup codes
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  
  return codes
}

/**
 * Hash a backup code for storage
 */
function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex')
}

export class MfaService {
  /**
   * Generate MFA setup data for a user
   * Returns the secret, QR code, and backup codes
   */
  static async generateMfaSetup(userId: string, userEmail: string): Promise<MfaSetupResult> {
    // Generate TOTP secret
    const secret = authenticator.generateSecret()
    
    // Generate QR code URL (otpauth URI)
    const otpauthUrl = authenticator.keyuri(userEmail, APP_NAME, secret)
    
    // Generate QR code as data URL
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl)
    
    // Generate backup codes
    const backupCodes = generateBackupCodes(10)
    
    // Hash backup codes for storage
    const hashedBackupCodes = backupCodes.map(hashBackupCode)
    
    // Encrypt and store the secret temporarily
    // The user must verify with a TOTP code before MFA is enabled
    const encryptedSecret = encrypt(secret)
    
    // Store the setup data (but don't enable MFA yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: encryptedSecret,
        mfaBackupCodes: hashedBackupCodes,
        // Don't enable MFA until verified
        isMfaEnabled: false
      }
    })
    
    return {
      secret,
      qrCodeUrl,
      backupCodes
    }
  }

  /**
   * Verify TOTP code and enable MFA for user
   */
  static async verifyAndEnableMfa(userId: string, totpCode: string): Promise<MfaVerifyResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, isMfaEnabled: true }
    })
    
    if (!user || !user.mfaSecret) {
      return { success: false, message: 'MFA setup not found. Please initiate MFA setup first.' }
    }
    
    if (user.isMfaEnabled) {
      return { success: false, message: 'MFA is already enabled.' }
    }
    
    // Decrypt the secret
    const secret = decrypt(user.mfaSecret)
    
    // Verify the TOTP code
    const isValid = authenticator.verify({ token: totpCode, secret })
    
    if (!isValid) {
      return { success: false, message: 'Invalid verification code. Please try again.' }
    }
    
    // Enable MFA
    await prisma.user.update({
      where: { id: userId },
      data: {
        isMfaEnabled: true,
        mfaVerifiedAt: new Date()
      }
    })
    
    return { success: true, message: 'MFA enabled successfully.' }
  }

  /**
   * Verify a TOTP code for login
   */
  static async verifyTotpCode(userId: string, totpCode: string): Promise<MfaVerifyResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, isMfaEnabled: true, mfaBackupCodes: true }
    })
    
    if (!user || !user.mfaSecret || !user.isMfaEnabled) {
      return { success: false, message: 'MFA is not enabled for this user.' }
    }
    
    // First, try to verify as a TOTP code
    const secret = decrypt(user.mfaSecret)
    const isTotpValid = authenticator.verify({ token: totpCode, secret })
    
    if (isTotpValid) {
      return { success: true, message: 'TOTP verification successful.' }
    }
    
    // If TOTP fails, try as a backup code
    const hashedInputCode = hashBackupCode(totpCode)
    const backupCodeIndex = user.mfaBackupCodes.findIndex(code => code === hashedInputCode)
    
    if (backupCodeIndex !== -1) {
      // Remove the used backup code
      const updatedBackupCodes = [...user.mfaBackupCodes]
      updatedBackupCodes.splice(backupCodeIndex, 1)
      
      await prisma.user.update({
        where: { id: userId },
        data: { mfaBackupCodes: updatedBackupCodes }
      })
      
      return { 
        success: true, 
        message: 'Backup code used successfully. You have ' + updatedBackupCodes.length + ' backup codes remaining.',
        usedBackupCode: true
      }
    }
    
    return { success: false, message: 'Invalid verification code.' }
  }

  /**
   * Disable MFA for a user (requires password verification done by caller)
   */
  static async disableMfa(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isMfaEnabled: true }
    })
    
    if (!user) {
      return { success: false, message: 'User not found.' }
    }
    
    if (!user.isMfaEnabled) {
      return { success: false, message: 'MFA is not enabled.' }
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        isMfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        mfaVerifiedAt: null
      }
    })
    
    return { success: true, message: 'MFA disabled successfully.' }
  }

  /**
   * Regenerate backup codes for a user
   */
  static async regenerateBackupCodes(userId: string): Promise<{ success: boolean; backupCodes?: string[]; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isMfaEnabled: true }
    })
    
    if (!user) {
      return { success: false, message: 'User not found.' }
    }
    
    if (!user.isMfaEnabled) {
      return { success: false, message: 'MFA is not enabled.' }
    }
    
    // Generate new backup codes
    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = backupCodes.map(hashBackupCode)
    
    await prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: hashedBackupCodes }
    })
    
    return { 
      success: true, 
      backupCodes,
      message: 'Backup codes regenerated successfully. Previous codes are no longer valid.'
    }
  }

  /**
   * Get MFA status for a user
   */
  static async getMfaStatus(userId: string): Promise<{ 
    enabled: boolean; 
    verifiedAt: Date | null;
    backupCodesRemaining: number;
  } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        isMfaEnabled: true, 
        mfaVerifiedAt: true,
        mfaBackupCodes: true
      }
    })
    
    if (!user) {
      return null
    }
    
    return {
      enabled: user.isMfaEnabled,
      verifiedAt: user.mfaVerifiedAt,
      backupCodesRemaining: user.mfaBackupCodes.length
    }
  }

  /**
   * Check if a user has MFA enabled
   */
  static async isMfaEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isMfaEnabled: true }
    })
    
    return user?.isMfaEnabled ?? false
  }
}
