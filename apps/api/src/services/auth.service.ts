import { prisma, UserRole, AuthProvider } from '@smartmed/database'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { TokenService } from './token.service'
import { ValidationService } from './validation.service'
import { EmailService } from './email.service'

export interface RegisterInput {
  fullName: string
  email: string
  password: string
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    fullName: string | null
    role: string
    emailVerified: boolean
  }
  requiresEmailVerification?: boolean
}

// Environment flag to require email verification before login
const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'

// Grace period in hours - users can login without verification within this period
const VERIFICATION_GRACE_PERIOD_HOURS = parseInt(process.env.VERIFICATION_GRACE_PERIOD_HOURS || '24', 10)

export class AuthService {
  private static SALT_ROUNDS = 12

  static async registerUser(
    data: RegisterInput,
    role: UserRole,
    ipAddress: string,
    deviceInfo: unknown
  ): Promise<AuthResult> {
    const { fullName, email, password } = data

    ValidationService.validateName(fullName)
    ValidationService.validateEmail(email)
    ValidationService.validatePassword(password)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new Error('EMAIL_ALREADY_IN_USE')
    }

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS)

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role,
        authProvider: AuthProvider.LOCAL,
      },
    })

    // Create email verification token and send verification email
    const verificationToken = crypto.randomBytes(32).toString('hex')
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        verificationToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      },
    })

    // Send verification email (async, don't block registration)
    EmailService.sendVerificationEmail(user, verificationToken).catch(err => {
      console.error('[AuthService] Failed to send verification email:', err)
    })

    const { accessToken, refreshToken } =
      await TokenService.issueTokensForUser(user, ipAddress, deviceInfo)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        profilePhotoUrl: user.profilePhotoUrl,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        region: user.region,
        postalCode: user.postalCode,
        country: user.country,
      },
      requiresEmailVerification: !user.emailVerified,
    }
  }

  static async loginUser(
    email: string,
    password: string,
    ipAddress: string,
    deviceInfo: unknown
  ): Promise<AuthResult> {
    ValidationService.validateEmail(email)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      throw new Error('INVALID_CREDENTIALS')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS')
    }

    if (!user.isActive) {
      throw new Error('ACCOUNT_INACTIVE')
    }

    // Check email verification if required
    if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
      // Check if user is within grace period
      const accountAge = Date.now() - new Date(user.createdAt).getTime()
      const gracePeriodMs = VERIFICATION_GRACE_PERIOD_HOURS * 60 * 60 * 1000
      
      if (accountAge > gracePeriodMs) {
        throw new Error('EMAIL_NOT_VERIFIED')
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    const { accessToken, refreshToken } = await TokenService.issueTokensForUser(
      user,
      ipAddress,
      deviceInfo
    )

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        profilePhotoUrl: user.profilePhotoUrl,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        city: user.city,
        region: user.region,
        postalCode: user.postalCode,
        country: user.country,
      },
    }
  }

  /**
   * Resend verification email for a user
   */
  static async resendVerificationEmail(email: string): Promise<void> {
    ValidationService.validateEmail(email)

    const user = await prisma.user.findUnique({ where: { email } })
    
    // Don't reveal if user exists
    if (!user) {
      return
    }

    // Already verified
    if (user.emailVerified) {
      return
    }

    // Check for rate limiting - only allow resend every 2 minutes
    const recentVerification = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 2 * 60 * 1000) },
      },
    })

    if (recentVerification) {
      throw new Error('VERIFICATION_EMAIL_RATE_LIMITED')
    }

    // Invalidate old tokens
    await prisma.emailVerification.updateMany({
      where: { userId: user.id, verified: false },
      data: { expiresAt: new Date() }, // Expire them
    })

    // Create new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        verificationToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      },
    })

    // Send new verification email
    await EmailService.sendVerificationEmail(user, verificationToken)
  }

  static async verifyEmail(token: string) {
    const record = await prisma.emailVerification.findUnique({
      where: { verificationToken: token },
      include: { user: true },
    })

    if (!record || record.expiresAt < new Date()) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN')
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerification.update({
        where: { id: record.id },
        data: { verified: true },
      }),
    ])

    return {
      id: record.user.id,
      email: record.user.email,
      fullName: record.user.fullName,
      role: record.user.role,
      emailVerified: true,
    }
  }

  static async requestPasswordReset(email: string) {
    ValidationService.validateEmail(email)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return
    }

    const resetToken = crypto.randomBytes(32).toString('hex')

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    await EmailService.sendPasswordResetEmail(user, resetToken)
  }

  static async verifyPasswordResetToken(token: string) {
    const record = await prisma.passwordReset.findUnique({
      where: { resetToken: token },
    })
    if (!record || record.expiresAt < new Date() || record.used) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN')
    }

    return record
  }

  static async completePasswordReset(token: string, newPassword: string) {
    const record = await prisma.passwordReset.findUnique({
      where: { resetToken: token },
    })
    if (!record || record.expiresAt < new Date() || record.used) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN')
    }

    ValidationService.validatePassword(newPassword)
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: record.id },
        data: { used: true },
      }),
      prisma.userSession.deleteMany({ where: { userId: record.userId } }),
    ])
  }

  static async refreshAccessToken(
    refreshToken: string,
    ipAddress: string,
    deviceInfo: unknown
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { accessToken, refreshToken: newRefresh } =
      await TokenService.rotateRefreshToken(refreshToken, ipAddress, deviceInfo)
    return { accessToken, refreshToken: newRefresh }
  }

  static async logout(refreshToken: string) {
    await TokenService.revokeRefreshToken(refreshToken)
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error('NOT_FOUND')
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
    }
  }
}
