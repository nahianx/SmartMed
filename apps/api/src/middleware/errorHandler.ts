import { Request, Response, NextFunction } from 'express'
import multer from 'multer'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error(err)

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size must be less than 5MB' })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' })
    }
    return res.status(400).json({ error: err.message })
  }

  // Handle file filter errors (e.g., wrong file type)
  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message })
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message })
  }

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
