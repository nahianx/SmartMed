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
  // Debug logging to help understand why a request may be rejected in dev
  // (will only print when NODE_ENV !== 'production').
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('csrf-check', { path: req.path, headerToken: token, cookieToken, NODE_ENV: process.env.NODE_ENV, DISABLE_CSRF: process.env.DISABLE_CSRF || process.env.DISABLE_CSR })
  }

  // Development convenience: if the CSRF cookie is missing but a token
  // header is present, allow the request in non-production environments.
  // In production we require both header and cookie and that they match.
  if (!token) {
    return res.status(403).json({ error: 'Invalid CSRF token' })
  }

  if (process.env.NODE_ENV === 'production') {
    if (!cookieToken || token !== cookieToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' })
    }
  } else {
    // Non-production: accept header-only token if cookie absent, otherwise require match
    if (cookieToken && token !== cookieToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' })
    }
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