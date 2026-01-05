import { Request, Response } from 'express'
import { PatientContextService } from '../services/patientContext.service'
import { prisma, UserRole } from '@smartmed/database'

export class PatientContextController {
  /**
   * GET /api/consultation/patient/:patientId/context
   * Get full patient context for a consultation
   * Accessible by doctors and nurses
   */
  static async getPatientContext(req: Request, res: Response) {
    try {
      const { patientId } = req.params
      const user = (req as any).user
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      // Only doctors, nurses, and admins can access patient context
      if (![UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN].includes(user.role)) {
        return res.status(403).json({ 
          error: 'Access denied. Only medical staff can view patient context.' 
        })
      }
      
      // Get doctor ID if user is a doctor
      let requestingDoctorId = user.id
      if (user.role === UserRole.DOCTOR) {
        const doctor = await prisma.doctor.findUnique({
          where: { userId: user.id },
          select: { id: true }
        })
        if (doctor) {
          requestingDoctorId = doctor.id
        }
      }
      
      // Parse query options
      const options = {
        includeTimeline: req.query.timeline !== 'false',
        appointmentLimit: parseInt(req.query.appointmentLimit as string) || 10,
        prescriptionLimit: parseInt(req.query.prescriptionLimit as string) || 10,
        reportLimit: parseInt(req.query.reportLimit as string) || 5
      }
      
      const context = await PatientContextService.getPatientContext(
        patientId,
        requestingDoctorId,
        options
      )
      
      if (!context) {
        return res.status(404).json({ error: 'Patient not found' })
      }
      
      return res.json({ patientContext: context })
    } catch (error) {
      console.error('[PatientContextController] Error getting patient context:', error)
      return res.status(500).json({ error: 'Failed to get patient context' })
    }
  }

  /**
   * GET /api/consultation/patient/:patientId/summary
   * Get quick patient summary
   */
  static async getPatientSummary(req: Request, res: Response) {
    try {
      const { patientId } = req.params
      const user = (req as any).user
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      // Only medical staff can access
      if (![UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN].includes(user.role)) {
        return res.status(403).json({ error: 'Access denied' })
      }
      
      const summary = await PatientContextService.getPatientSummary(patientId)
      
      if (!summary) {
        return res.status(404).json({ error: 'Patient not found' })
      }
      
      return res.json({ summary })
    } catch (error) {
      console.error('[PatientContextController] Error getting patient summary:', error)
      return res.status(500).json({ error: 'Failed to get patient summary' })
    }
  }

  /**
   * GET /api/consultation/patient/:patientId/allergies
   * Get patient allergies only
   */
  static async getPatientAllergies(req: Request, res: Response) {
    try {
      const { patientId } = req.params
      const user = (req as any).user
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      // Doctors, nurses, and admins can access
      if (![UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN].includes(user.role)) {
        return res.status(403).json({ error: 'Access denied' })
      }
      
      const allergies = await PatientContextService.getPatientAllergies(patientId)
      
      return res.json({ allergies })
    } catch (error) {
      console.error('[PatientContextController] Error getting allergies:', error)
      return res.status(500).json({ error: 'Failed to get allergies' })
    }
  }

  /**
   * GET /api/consultation/patient/:patientId/medications
   * Get patient's active medications
   */
  static async getActiveMedications(req: Request, res: Response) {
    try {
      const { patientId } = req.params
      const user = (req as any).user
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      // Doctors, nurses, and admins can access
      if (![UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN].includes(user.role)) {
        return res.status(403).json({ error: 'Access denied' })
      }
      
      const medications = await PatientContextService.getActiveMedications(patientId)
      
      return res.json({ medications })
    } catch (error) {
      console.error('[PatientContextController] Error getting medications:', error)
      return res.status(500).json({ error: 'Failed to get medications' })
    }
  }

  /**
   * GET /api/consultation/current-patient
   * Get context for the current patient being served (from queue)
   */
  static async getCurrentPatientContext(req: Request, res: Response) {
    try {
      const user = (req as any).user
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      
      if (user.role !== UserRole.DOCTOR) {
        return res.status(403).json({ error: 'Only doctors can access current patient context' })
      }
      
      // Get the doctor
      const doctor = await prisma.doctor.findUnique({
        where: { userId: user.id },
        select: { id: true, currentPatientId: true, currentQueueEntryId: true }
      })
      
      if (!doctor) {
        return res.status(404).json({ error: 'Doctor profile not found' })
      }
      
      if (!doctor.currentPatientId) {
        return res.status(404).json({ 
          error: 'No patient currently being served',
          message: 'Call the next patient from the queue first'
        })
      }
      
      const context = await PatientContextService.getPatientContext(
        doctor.currentPatientId,
        doctor.id,
        { includeTimeline: true }
      )
      
      if (!context) {
        return res.status(404).json({ error: 'Patient not found' })
      }
      
      // Include queue entry info if available
      let queueInfo = null
      if (doctor.currentQueueEntryId) {
        const queueEntry = await prisma.queueEntry.findUnique({
          where: { id: doctor.currentQueueEntryId },
          select: {
            id: true,
            position: true,
            queueType: true,
            joinedAt: true,
            calledAt: true,
            notes: true
          }
        })
        queueInfo = queueEntry
      }
      
      return res.json({ 
        patientContext: context,
        queueInfo
      })
    } catch (error) {
      console.error('[PatientContextController] Error getting current patient:', error)
      return res.status(500).json({ error: 'Failed to get current patient context' })
    }
  }
}
