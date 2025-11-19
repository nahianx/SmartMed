import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { UserRole } from '@smartmed/types'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

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
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (!authHeader || typeof authHeader !== 'string') {
    return next()
  }

  const [, token] = authHeader.split(' ')
  if (!token) {
    return next()
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser
    req.user = { id: payload.id, role: payload.role }
  } catch {
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
