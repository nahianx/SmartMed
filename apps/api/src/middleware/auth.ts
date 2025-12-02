import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UserRole } from '@smartmed/types'

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-me'
}

export interface AuthUser {
  id: string
  role: UserRole
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const rawHeader = (req.headers['authorization'] || req.headers['Authorization']) as string | string[] | undefined
  const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader

  if (!authHeader || typeof authHeader !== 'string') {
    return next()
  }

  // Accept both "Bearer <token>" and "<token>" formats
  let token = authHeader.trim()
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim()
  }

  if (!token) {
    return next()
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthUser
    console.log('AUTH MIDDLEWARE - verified payload:', payload)
    req.user = { id: payload.id, role: payload.role }
  } catch (err) {
    console.error('AUTH MIDDLEWARE - JWT verify error:', (err as Error).message)
    // ignore invalid tokens; routes can still enforce requireAuth
  }

  return next()
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return next()
}

export function requireRole(roles: UserRole | UserRole[]) {
  const allowed = Array.isArray(roles) ? roles : [roles]
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    return next()
  }
}
