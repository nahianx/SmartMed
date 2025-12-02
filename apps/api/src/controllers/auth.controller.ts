import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { UserRole } from '@smartmed/database'

const REFRESH_COOKIE_NAME = 'refreshToken'

function getDeviceInfo(req: Request) {
  return {
    userAgent: req.headers['user-agent'] || 'unknown',
  }
}

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

export class AuthController {
  static async registerDoctor(req: Request, res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip
    const deviceInfo = getDeviceInfo(req)

    const { fullName, email, password } = req.body

    const result = await AuthService.registerUser(
      { fullName, email, password },
      UserRole.DOCTOR,
      ip,
      deviceInfo,
    )

    setRefreshCookie(res, result.refreshToken)

    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    })
  }

  static async registerPatient(req: Request, res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip
    const deviceInfo = getDeviceInfo(req)

    const { fullName, email, password } = req.body

    const result = await AuthService.registerUser(
      { fullName, email, password },
      UserRole.PATIENT,
      ip,
      deviceInfo,
    )

    setRefreshCookie(res, result.refreshToken)

    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    })
  }

  static async login(req: Request, res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip
    const deviceInfo = getDeviceInfo(req)

    const { email, password } = req.body

    const result = await AuthService.loginUser(email, password, ip, deviceInfo)

    setRefreshCookie(res, result.refreshToken)

    res.json({
      user: result.user,
      accessToken: result.accessToken,
    })
  }

  static async refresh(req: Request, res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip
    const deviceInfo = getDeviceInfo(req)

    const refreshToken =
      (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) || req.body.refreshToken
    if (!refreshToken) {
      return res.status(401).json({ error: 'Missing refresh token' })
    }

    const { accessToken, refreshToken: newRefresh } =
      await AuthService.refreshAccessToken(refreshToken, ip, deviceInfo)

    setRefreshCookie(res, newRefresh)

    res.json({ accessToken })
  }

  static async logout(req: Request, res: Response) {
    const refreshToken =
      (req.cookies && req.cookies[REFRESH_COOKIE_NAME]) || req.body.refreshToken

    if (refreshToken) {
      await AuthService.logout(refreshToken)
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })

    res.json({ success: true })
  }

  static async requestPasswordReset(req: Request, res: Response) {
    const { email } = req.body
    await AuthService.requestPasswordReset(email)
    res.json({ success: true })
  }

  static async verifyPasswordResetToken(req: Request, res: Response) {
    const { token } = req.params
    await AuthService.verifyPasswordResetToken(token)
    res.json({ valid: true })
  }

  static async completePasswordReset(req: Request, res: Response) {
    const { token, newPassword } = req.body
    await AuthService.completePasswordReset(token, newPassword)
    res.json({ success: true })
  }

  static async verifyEmail(req: Request, res: Response) {
    const { token } = req.params
    const user = await AuthService.verifyEmail(token)
    res.json({ user })
  }
}
