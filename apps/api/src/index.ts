import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'

// Import middleware
import { authStub } from './middleware/auth_stub'

// Scheduler
import { startReminderScheduler } from './scheduler/reminder_scheduler'

// Import routes
import patientRoutes from './routes/patient.routes'
import doctorRoutes from './routes/doctor.routes'
import appointmentRoutes from './routes/appointment.routes'
import authRoutes from './routes/auth.routes'
import timelineRoutes from './routes/timeline.routes'
import reportRoutes from './routes/report.routes'
import notificationRoutes from './routes/notification.routes'

dotenv.config()

const app: Application = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(authStub)

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')))

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'SmartMed API is running',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/doctors', doctorRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/timeline', timelineRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/notifications', notificationRoutes)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err: Error, _req: Request, res: Response) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

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
