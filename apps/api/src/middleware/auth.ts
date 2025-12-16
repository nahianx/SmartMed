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
  next: NextFunction
) {
  const rawHeader = (req.headers['authorization'] ||
    req.headers['Authorization']) as string | string[] | undefined
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
    const payload = jwt.verify(token, getJwtSecret()) as any
    req.user = { id: payload.sub || payload.id, role: payload.role }
  } catch (err) {
    // ignore invalid tokens; routes can still enforce requireAuth
  }

  return next()
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return next()
}

export function requireRole(roles: UserRole | UserRole[]) {
  const allowed = (Array.isArray(roles) ? roles : [roles]).map((r) =>
    typeof r === 'string' ? r.toUpperCase() : r
  )
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const userRole =
      typeof req.user.role === 'string'
        ? (req.user.role.toUpperCase() as UserRole)
        : req.user.role
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    return next()
  }
}
