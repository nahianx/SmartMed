import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma, User } from '@smartmed/database'

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

const JWT_SECRET = process.env.JWT_SECRET as string
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  // In production you should fail fast at startup; here we keep it simple.
  // eslint-disable-next-line no-console
  console.warn('JWT secrets are not set. Make sure JWT_SECRET and JWT_REFRESH_SECRET are configured.')
}

export class TokenService {
  static generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
  }

  static async generateRefreshToken(): Promise<string> {
    return crypto.randomBytes(64).toString('hex')
  }

  static verifyAccessToken(token: string) {
    return jwt.verify(token, JWT_SECRET)
  }

  static async issueTokensForUser(user: User, ipAddress: string, deviceInfo: unknown) {
    const accessToken = this.generateAccessToken(user)
    const refreshToken = await this.generateRefreshToken()

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress,
        deviceInfo: deviceInfo as any,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    })

    return { accessToken, refreshToken, session }
  }

  static async rotateRefreshToken(oldToken: string, ipAddress: string, deviceInfo: unknown) {
    const existing = await prisma.userSession.findUnique({ where: { refreshToken: oldToken } })
    if (!existing || existing.expiresAt < new Date()) {
      throw new Error('INVALID_REFRESH_TOKEN')
    }

    const user = await prisma.user.findUnique({ where: { id: existing.userId } })
    if (!user) {
      throw new Error('INVALID_REFRESH_TOKEN')
    }

    const newRefreshToken = await this.generateRefreshToken()

    await prisma.userSession.update({
      where: { id: existing.id },
      data: {
        refreshToken: newRefreshToken,
        ipAddress,
        deviceInfo: deviceInfo as any,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    })

    const accessToken = this.generateAccessToken(user)

    return { accessToken, refreshToken: newRefreshToken }
  }

  static async revokeRefreshToken(token: string) {
    await prisma.userSession.deleteMany({ where: { refreshToken: token } })
  }

  static async revokeAllUserTokens(userId: string) {
    await prisma.userSession.deleteMany({ where: { userId } })
  }
}
