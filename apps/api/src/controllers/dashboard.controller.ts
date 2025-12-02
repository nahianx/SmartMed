import { Request, Response } from 'express'
import { prisma, UserRole } from '@smartmed/database'

export class DashboardController {
  static async doctorDashboard(req: Request, res: Response) {
    const userId = (req as any).user.id as string

    const doctor = await prisma.doctor.findFirst({ where: { userId } })

    res.json({
      role: UserRole.DOCTOR,
      profile: doctor,
    })
  }

  static async patientDashboard(req: Request, res: Response) {
    const userId = (req as any).user.id as string

    const patient = await prisma.patient.findFirst({ where: { userId } })

    res.json({
      role: UserRole.PATIENT,
      profile: patient,
    })
  }
}
