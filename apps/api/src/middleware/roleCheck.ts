import { Request, Response, NextFunction } from 'express'
import { UserRole } from '@smartmed/database'

export function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user || user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
