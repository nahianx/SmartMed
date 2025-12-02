import './config/env'
import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import path from 'path'
import { csrfProtection, setCSRFToken, generateCSRFToken } from './middleware/csrf'
import { authStub } from './middleware/auth_stub'
import { startReminderScheduler } from './scheduler/reminder_scheduler'

// Import routes
import patientRoutes from './routes/patient.routes'
import doctorRoutes from './routes/doctor.routes'
import appointmentRoutes from './routes/appointment.routes'
import authRoutes from './routes/auth.routes'
import dashboardRoutes from './routes/dashboard.routes'
import profileRoutes from './routes/profile.routes'
import timelineRoutes from './routes/timeline.routes'
import reportRoutes from './routes/report.routes'
import notificationRoutes from './routes/notification.routes'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app: Application = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(authStub)

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')))

// Conditionally enable CSRF protection. Set DISABLE_CSRF=true for local/dev/Postman convenience.
const disableCsrf = process.env.DISABLE_CSR === 'true' || process.env.DISABLE_CSRF === 'true'
if (!disableCsrf && process.env.NODE_ENV !== 'test') {
  app.use(setCSRFToken)
  app.use(csrfProtection)
} else {
  console.log('⚠️  CSRF protection is disabled (DISABLE_CSRF=true or NODE_ENV=test)')
}

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'SmartMed API is running',
    timestamp: new Date().toISOString(),
  })
})

// API-prefixed health check (keeps Postman and docs working)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'SmartMed API is running',
    timestamp: new Date().toISOString(),
  })
})

// Dev-friendly CSRF token endpoint. Returns a token and sets the CSRF cookie.
app.get('/api/csrf-token', (_req: Request, res: Response) => {
  const token = generateCSRFToken()
  res.cookie('csrf-token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  })
  return res.json({ csrfToken: token })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/patient', patientRoutes)
app.use('/api/doctor', doctorRoutes)
app.use('/api/doctors', doctorRoutes) // for /api/doctors/search
app.use('/api/appointments', appointmentRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/timeline', timelineRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/notifications', notificationRoutes)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Central error handler
app.use(errorHandler)

// Only start the server when not running tests
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 SmartMed API server running on port ${PORT}`)
    console.log(`📍 Health check: http://localhost:${PORT}/health`)
  })

  // Start background reminder scheduler
  startReminderScheduler()
}

export default app
