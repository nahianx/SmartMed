import { Request, Response } from 'express'
import { MfaService } from '../services/mfa.service'
import { AuditService } from '../services/audit.service'
import { prisma } from '@smartmed/database'
import bcrypt from 'bcryptjs'

export class MfaController {
  /**
   * POST /api/auth/mfa/setup
   * Initiate MFA setup for the authenticated user
   * Returns QR code and backup codes
   */
  static async initiateSetup(req: Request, res: Response) {
    try {
      const user = (req as any).user
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      // Check if MFA is already enabled
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isMfaEnabled: true, email: true }
      })
      
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' })
      }
      
      if (existingUser.isMfaEnabled) {
        return res.status(400).json({ 
          error: 'MFA is already enabled. Disable it first to reconfigure.' 
        })
      }
      
      // Generate MFA setup data
      const setupData = await MfaService.generateMfaSetup(user.id, existingUser.email)
      
      // Audit log
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: 'MFA_SETUP_INITIATED' as any,
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json({
        message: 'MFA setup initiated. Scan the QR code with your authenticator app and enter the verification code to enable MFA.',
        qrCode: setupData.qrCodeUrl,
        secret: setupData.secret, // Only show during setup
        backupCodes: setupData.backupCodes,
        warning: 'Save these backup codes in a safe place. They will only be shown once.'
      })
    } catch (error) {
      console.error('[MfaController] Error initiating MFA setup:', error)
      return res.status(500).json({ error: 'Failed to initiate MFA setup' })
    }
  }

  /**
   * POST /api/auth/mfa/verify-setup
   * Verify the TOTP code and enable MFA
   * Body: { code: string }
   */
  static async verifySetup(req: Request, res: Response) {
    try {
      const user = (req as any).user
      const { code } = req.body
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      if (!code) {
        return res.status(400).json({ error: 'Verification code is required' })
      }
      
      const result = await MfaService.verifyAndEnableMfa(user.id, code)
      
      if (!result.success) {
        return res.status(400).json({ error: result.message })
      }
      
      // Audit log
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: 'MFA_ENABLED' as any,
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json({
        success: true,
        message: 'MFA enabled successfully. You will now need to enter a verification code when logging in.'
      })
    } catch (error) {
      console.error('[MfaController] Error verifying MFA setup:', error)
      return res.status(500).json({ error: 'Failed to verify MFA setup' })
    }
  }

  /**
   * POST /api/auth/mfa/verify
   * Verify TOTP code during login (used after primary authentication)
   * Body: { code: string, userId: string }
   */
  static async verifyCode(req: Request, res: Response) {
    try {
      const { code, userId } = req.body
      
      if (!code || !userId) {
        return res.status(400).json({ error: 'Code and userId are required' })
      }
      
      const result = await MfaService.verifyTotpCode(userId, code)
      
      if (!result.success) {
        // Audit failed attempt
        await AuditService.log({
          userId,
          action: 'MFA_VERIFICATION_FAILED' as any,
          resourceType: 'User',
          resourceId: userId,
          success: false,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }).catch(console.error)
        
        return res.status(401).json({ error: result.message })
      }
      
      // Audit successful verification
      await AuditService.log({
        userId,
        action: 'MFA_VERIFIED' as any,
        resourceType: 'User',
        resourceId: userId,
        metadata: { usedBackupCode: result.usedBackupCode },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json({
        success: true,
        message: result.message,
        usedBackupCode: result.usedBackupCode
      })
    } catch (error) {
      console.error('[MfaController] Error verifying MFA code:', error)
      return res.status(500).json({ error: 'Failed to verify MFA code' })
    }
  }

  /**
   * POST /api/auth/mfa/disable
   * Disable MFA for the authenticated user
   * Body: { password: string }
   */
  static async disable(req: Request, res: Response) {
    try {
      const user = (req as any).user
      const { password } = req.body
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      if (!password) {
        return res.status(400).json({ error: 'Password is required to disable MFA' })
      }
      
      // Verify password
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true, isMfaEnabled: true }
      })
      
      if (!dbUser) {
        return res.status(404).json({ error: 'User not found' })
      }
      
      if (!dbUser.passwordHash) {
        return res.status(400).json({ error: 'Cannot disable MFA for OAuth users without password' })
      }
      
      const passwordValid = await bcrypt.compare(password, dbUser.passwordHash)
      
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid password' })
      }
      
      const result = await MfaService.disableMfa(user.id)
      
      if (!result.success) {
        return res.status(400).json({ error: result.message })
      }
      
      // Audit log
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: 'MFA_DISABLED' as any,
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json({
        success: true,
        message: 'MFA disabled successfully.'
      })
    } catch (error) {
      console.error('[MfaController] Error disabling MFA:', error)
      return res.status(500).json({ error: 'Failed to disable MFA' })
    }
  }

  /**
   * POST /api/auth/mfa/regenerate-backup-codes
   * Generate new backup codes (invalidates old ones)
   * Body: { password: string }
   */
  static async regenerateBackupCodes(req: Request, res: Response) {
    try {
      const user = (req as any).user
      const { password } = req.body
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      if (!password) {
        return res.status(400).json({ error: 'Password is required' })
      }
      
      // Verify password
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { passwordHash: true }
      })
      
      if (!dbUser || !dbUser.passwordHash) {
        return res.status(400).json({ error: 'Cannot regenerate backup codes' })
      }
      
      const passwordValid = await bcrypt.compare(password, dbUser.passwordHash)
      
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid password' })
      }
      
      const result = await MfaService.regenerateBackupCodes(user.id)
      
      if (!result.success) {
        return res.status(400).json({ error: result.message })
      }
      
      // Audit log
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: 'MFA_BACKUP_CODES_REGENERATED' as any,
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(console.error)
      
      return res.json({
        success: true,
        message: result.message,
        backupCodes: result.backupCodes,
        warning: 'Save these backup codes in a safe place. They will only be shown once.'
      })
    } catch (error) {
      console.error('[MfaController] Error regenerating backup codes:', error)
      return res.status(500).json({ error: 'Failed to regenerate backup codes' })
    }
  }

  /**
   * GET /api/auth/mfa/status
   * Get MFA status for the authenticated user
   */
  static async getStatus(req: Request, res: Response) {
    try {
      const user = (req as any).user
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      const status = await MfaService.getMfaStatus(user.id)
      
      if (!status) {
        return res.status(404).json({ error: 'User not found' })
      }
      
      return res.json({
        mfaEnabled: status.enabled,
        verifiedAt: status.verifiedAt,
        backupCodesRemaining: status.backupCodesRemaining
      })
    } catch (error) {
      console.error('[MfaController] Error getting MFA status:', error)
      return res.status(500).json({ error: 'Failed to get MFA status' })
    }
  }
}
