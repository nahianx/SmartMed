import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'csrf-token'

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  // Skip CSRF for API routes that use JWT authentication only
  if (req.path.startsWith('/api/auth/refresh') || req.path.startsWith('/api/auth/logout')) {
    return next()
  }

  const token = req.headers[CSRF_HEADER] as string
  const cookieToken = req.cookies?.[CSRF_COOKIE]

  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' })
  }

  next()
}

export function setCSRFToken(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = generateCSRFToken()
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // Allow JS access for headers
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })
  }
  next()
}