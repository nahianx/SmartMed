import { Request, Response } from 'express'
import { prisma, AuthProvider, UserRole } from '@smartmed/database'
import { OAuthService } from '../services/oauth.service'
import { TokenService } from '../services/token.service'

const REFRESH_COOKIE_NAME = 'refreshToken'

function setRefreshCookie(res: Response, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

function getDeviceInfo(req: Request) {
  return {
    userAgent: req.headers['user-agent'] || 'unknown',
  }
}

export class OAuthController {
  static async googleAuth(req: Request, res: Response) {
    const { idToken, role } = req.body as { idToken: string; role?: UserRole }

    if (!idToken) {
      return res.status(400).json({ error: 'Missing idToken' })
    }

    const info = await OAuthService.verifyGoogleToken(idToken)

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip
    const deviceInfo = getDeviceInfo(req)

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: info.googleId }, { email: info.email }],
      },
    })

    if (user) {
      // Link googleId if missing
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: info.googleId,
            authProvider: AuthProvider.GOOGLE,
            emailVerified: info.emailVerified || user.emailVerified,
          },
        })
      }
    } else {
      // Create new user with role hint; default to PATIENT if not provided
      const effectiveRole = role || UserRole.PATIENT

      user = await prisma.user.create({
        data: {
          email: info.email,
          fullName: info.name,
          googleId: info.googleId,
          authProvider: AuthProvider.GOOGLE,
          emailVerified: info.emailVerified,
          role: effectiveRole,
        },
      })
    }

    const { accessToken, refreshToken } = await TokenService.issueTokensForUser(
      user,
      ip,
      deviceInfo,
    )

    setRefreshCookie(res, refreshToken)

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      accessToken,
    })
  }
}
