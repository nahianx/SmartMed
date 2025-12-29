import { Request, Response, NextFunction, Application } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { MAX_UPLOAD_SIZE_BYTES } from '../config/upload'

export function setupSecurityMiddleware(app: Application) {
  // Helmet for security headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://accounts.google.com',
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://accounts.google.com'],
          frameSrc: ['https://accounts.google.com'],
        },
      },
    })
  )

  // CORS configuration
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    })
  )

  // Cookie parser for refresh tokens and CSRF
  app.use(cookieParser())

  // Body parsing with size limits
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-length']) {
      const size = parseInt(req.headers['content-length'])
      if (size > MAX_UPLOAD_SIZE_BYTES) {
        return res.status(413).json({ error: 'Request too large' })
      }
    }
    next()
  })

  // Security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), camera=(), microphone=()'
    )
    next()
  })
}
