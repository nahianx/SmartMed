import { Request } from 'express'
import { UserRole } from '@smartmed/types'

export interface AuthUser {
  id: string
  role: UserRole
  email?: string
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser
}
