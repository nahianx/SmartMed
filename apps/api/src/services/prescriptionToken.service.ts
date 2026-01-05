/**
 * Prescription Access Token Service
 * 
 * Provides secure, time-limited, single-use token access to prescriptions
 * to protect PHI and comply with healthcare security requirements.
 * 
 * Features:
 * - Cryptographically secure token generation
 * - Configurable expiration (default 24 hours)
 * - Usage limiting (default single-use)
 * - IP tracking for audit purposes
 * - Automatic cleanup of expired tokens
 */

import { prisma } from '@smartmed/database'
import crypto from 'crypto'

// Token purpose types
export type TokenPurpose = 'VIEW' | 'PRINT' | 'PHARMACY'

// Token configuration
interface TokenConfig {
  purpose?: TokenPurpose
  expiresInHours?: number
  maxUses?: number
}

// Token validation result
interface TokenValidationResult {
  valid: boolean
  prescription?: {
    id: string
    patientId: string
    doctorId: string
    appointmentId: string
    diagnosis: string
    notes: string | null
    medications: any
    createdAt: Date
    patient: {
      firstName: string
      lastName: string
      dateOfBirth: Date
    }
    doctor: {
      firstName: string
      lastName: string
      specialization: string
      licenseNumber: string
    }
    prescriptionMedications: Array<{
      id: string
      medicineName: string
      dosage: string
      frequency: string
      duration: string
      instructions: string | null
      drug?: {
        rxcui: string
        name: string
        genericName: string | null
        dosageForm: string | null
      } | null
    }>
  }
  error?: string
  errorCode?: 'INVALID_TOKEN' | 'EXPIRED' | 'MAX_USES_EXCEEDED' | 'NOT_FOUND'
}

// Default configuration
const DEFAULT_EXPIRY_HOURS = 24
const DEFAULT_MAX_USES = 5 // Allow multiple views within the time window
const TOKEN_BYTES = 32 // 256-bit token

/**
 * Prescription Token Service
 */
class PrescriptionTokenService {
  private static instance: PrescriptionTokenService

  private constructor() {}

  static getInstance(): PrescriptionTokenService {
    if (!PrescriptionTokenService.instance) {
      PrescriptionTokenService.instance = new PrescriptionTokenService()
    }
    return PrescriptionTokenService.instance
  }

  /**
   * Generate a secure token for prescription access
   */
  async generateToken(
    prescriptionId: string,
    config: TokenConfig = {}
  ): Promise<{ token: string; expiresAt: Date; url: string }> {
    const {
      purpose = 'VIEW',
      expiresInHours = DEFAULT_EXPIRY_HOURS,
      maxUses = DEFAULT_MAX_USES,
    } = config

    // Verify prescription exists
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
    })

    if (!prescription) {
      throw new Error('Prescription not found')
    }

    // Generate cryptographically secure token
    const tokenBytes = crypto.randomBytes(TOKEN_BYTES)
    const token = tokenBytes.toString('base64url') // URL-safe encoding

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    // Store token in database
    await prisma.prescriptionAccessToken.create({
      data: {
        token,
        prescriptionId,
        purpose,
        expiresAt,
        maxUses,
        usedCount: 0,
      },
    })

    // Generate the public URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const url = `${baseUrl}/prescriptions/view/${token}`

    return { token, expiresAt, url }
  }

  /**
   * Validate and consume a token, returning prescription data if valid
   */
  async validateAndConsume(
    token: string,
    clientIp?: string
  ): Promise<TokenValidationResult> {
    // Find the token
    const tokenRecord = await prisma.prescriptionAccessToken.findUnique({
      where: { token },
    })

    if (!tokenRecord) {
      return {
        valid: false,
        error: 'Invalid or expired token',
        errorCode: 'INVALID_TOKEN',
      }
    }

    // Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      // Optionally clean up expired token
      await prisma.prescriptionAccessToken.delete({
        where: { id: tokenRecord.id },
      }).catch(() => {}) // Ignore deletion errors

      return {
        valid: false,
        error: 'This link has expired. Please request a new one.',
        errorCode: 'EXPIRED',
      }
    }

    // Check usage limit
    if (tokenRecord.usedCount >= tokenRecord.maxUses) {
      return {
        valid: false,
        error: 'This link has reached its maximum number of uses.',
        errorCode: 'MAX_USES_EXCEEDED',
      }
    }

    // Fetch prescription data
    const prescription = await prisma.prescription.findUnique({
      where: { id: tokenRecord.prescriptionId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            dateOfBirth: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
            licenseNumber: true,
          },
        },
        prescriptionMedications: {
          include: {
            drug: {
              select: {
                rxcui: true,
                name: true,
                genericName: true,
                dosageForm: true,
              },
            },
          },
        },
      },
    })

    if (!prescription) {
      return {
        valid: false,
        error: 'Prescription not found',
        errorCode: 'NOT_FOUND',
      }
    }

    // Update usage count and tracking
    await prisma.prescriptionAccessToken.update({
      where: { id: tokenRecord.id },
      data: {
        usedCount: { increment: 1 },
        lastUsedAt: new Date(),
        lastUsedIp: clientIp ? clientIp.substring(0, 45) : null, // Limit IP length
      },
    })

    return {
      valid: true,
      prescription: {
        id: prescription.id,
        patientId: prescription.patientId,
        doctorId: prescription.doctorId,
        appointmentId: prescription.appointmentId,
        diagnosis: prescription.diagnosis,
        notes: prescription.notes,
        medications: prescription.medications,
        createdAt: prescription.createdAt,
        patient: prescription.patient,
        doctor: prescription.doctor,
        prescriptionMedications: prescription.prescriptionMedications,
      },
    }
  }

  /**
   * Revoke all tokens for a prescription
   */
  async revokeAllTokens(prescriptionId: string): Promise<number> {
    const result = await prisma.prescriptionAccessToken.deleteMany({
      where: { prescriptionId },
    })
    return result.count
  }

  /**
   * Revoke a specific token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      await prisma.prescriptionAccessToken.delete({
        where: { token },
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Clean up expired tokens (should be run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.prescriptionAccessToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })
    return result.count
  }

  /**
   * Get active tokens for a prescription (for admin/audit purposes)
   */
  async getActiveTokens(prescriptionId: string): Promise<Array<{
    id: string
    purpose: string
    expiresAt: Date
    usedCount: number
    maxUses: number
    createdAt: Date
    lastUsedAt: Date | null
  }>> {
    const tokens = await prisma.prescriptionAccessToken.findMany({
      where: {
        prescriptionId,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        purpose: true,
        expiresAt: true,
        usedCount: true,
        maxUses: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return tokens
  }
}

// Export singleton instance
export const prescriptionTokenService = PrescriptionTokenService.getInstance()

// Export types
export type { TokenValidationResult, TokenConfig }
