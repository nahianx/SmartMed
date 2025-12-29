import { Request, Response } from 'express'
import { prisma, UserRole, AppointmentStatus } from '@smartmed/database'

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
    try {
      const userId = (req as any).user.id as string

      const patient = await prisma.patient.findFirst({ where: { userId } })

      if (!patient) {
        return res.status(404).json({ error: 'Patient profile not found' })
      }

      // Fetch upcoming appointments (not completed or no-show)
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          patientId: patient.id,
          status: {
            notIn: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW],
          },
          dateTime: {
            gte: new Date(), // Only future appointments
          },
        },
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
        },
        orderBy: {
          dateTime: 'asc',
        },
        take: 10,
      })

      res.json({
        role: UserRole.PATIENT,
        profile: patient,
        upcomingAppointments: upcomingAppointments.map((apt) => ({
          id: apt.id,
          dateTime: apt.dateTime,
          reason: apt.reason,
          status: apt.status,
          doctorName: apt.doctor
            ? `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`
            : 'Doctor visit',
          specialization: apt.doctor?.specialization,
        })),
      })
    } catch (error) {
      console.error('Error fetching patient dashboard:', error)
      res.status(500).json({ error: 'Failed to fetch dashboard data' })
    }
  }
}
