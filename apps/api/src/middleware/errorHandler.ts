import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error(err)

  const known = new Set([
    'INVALID_EMAIL',
    'INVALID_NAME',
    'WEAK_PASSWORD',
    'EMAIL_ALREADY_IN_USE',
    'INVALID_CREDENTIALS',
    'ACCOUNT_INACTIVE',
    'INVALID_OR_EXPIRED_TOKEN',
    'INVALID_REFRESH_TOKEN',
    'NOT_FOUND',
  ])

  if (known.has(err.message)) {
    return res.status(400).json({ error: err.message })
  }

  return res.status(500).json({ error: 'Internal server error' })
}
