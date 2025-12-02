import { Response, NextFunction } from 'express'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest, AuthUser } from '../types/auth'

// Simple auth stub that derives the current user from headers for development/testing.
// In a real system, this would be replaced with JWT-based authentication.
export async function authStub(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    // Allow tests/clients to specify user email via header
    const emailHeader = req.header('x-user-email')

    let user: AuthUser | null = null

    if (emailHeader) {
      const dbUser = await prisma.user.findUnique({ where: { email: emailHeader } })
      if (dbUser) {
        user = {
          id: dbUser.id,
          role: dbUser.role,
          email: dbUser.email,
        }
      }
    }

    // Fallback: use a default seeded patient user if present
    if (!user) {
      const dbUser = await prisma.user.findFirst({ where: { role: 'PATIENT' } })
      if (dbUser) {
        user = {
          id: dbUser.id,
          role: dbUser.role,
          email: dbUser.email,
        }
      }
    }

    if (user) {
      req.user = user
    }

    next()
  } catch (err) {
    // On auth stub failure, continue without user; downstream can decide how to handle
    console.error('authStub error', err)
    next()
  }
}
