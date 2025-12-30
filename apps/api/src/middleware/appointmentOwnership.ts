import { Response, NextFunction } from 'express'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest } from './auth'
import { UserRole } from '@smartmed/types'

export async function requireAppointmentOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const appointmentId = req.params.id || req.params.appointmentId
  if (!appointmentId) {
    return res.status(400).json({ error: 'Appointment ID is required' })
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  })

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' })
  }

  if (req.user.role === UserRole.PATIENT) {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    })
    if (!patient || appointment.patientId !== patient.id) {
      return res.status(403).json({ error: 'Access denied' })
    }
  } else if (req.user.role === UserRole.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    })
    if (!doctor || appointment.doctorId !== doctor.id) {
      return res.status(403).json({ error: 'Access denied' })
    }
  } else {
    return res.status(403).json({ error: 'Access denied' })
  }

  ;(req as any).appointment = appointment
  return next()
}
