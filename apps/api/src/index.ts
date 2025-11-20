import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'

// Import routes
import patientRoutes from './routes/patient.routes'
import doctorRoutes from './routes/doctor.routes'
import appointmentRoutes from './routes/appointment.routes'
import authRoutes from './routes/auth.routes'
import dashboardRoutes from './routes/dashboard.routes'
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
app.use('/api/dashboard', dashboardRoutes)

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
}

export default app
