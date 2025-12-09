import { prisma, ActivityType, AppointmentStatus } from '@smartmed/database'

interface CreateAppointmentActivityArgs {
  appointmentId: string
}

interface CreatePrescriptionActivityArgs {
  prescriptionId: string
}

interface CreateReportActivityArgs {
  reportId: string
}

export async function createAppointmentActivity({
  appointmentId,
}: CreateAppointmentActivityArgs) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: true,
    },
  })

  if (!appointment) return null

  const title = `Visit with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  const subtitle = appointment.reason

  return prisma.activity.create({
    data: {
      type: ActivityType.APPOINTMENT,
      occurredAt: appointment.dateTime,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      appointmentId: appointment.id,
      title,
      subtitle,
      tags: JSON.stringify([]),
      status: appointment.status,
      notes: appointment.notes ?? undefined,
    },
  })
}

export async function updateAppointmentActivityStatus(
  appointmentId: string,
  status: string,
) {
  const mappedStatus =
    status === AppointmentStatus.COMPLETED ||
    status === AppointmentStatus.CANCELLED ||
    status === AppointmentStatus.NO_SHOW
      ? status
      : undefined

  await prisma.activity.updateMany({
    where: {
      appointmentId,
      type: ActivityType.APPOINTMENT,
    },
    data: {
      status: mappedStatus,
    },
  })
}

export async function createPrescriptionActivity({
  prescriptionId,
}: CreatePrescriptionActivityArgs) {
  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      appointment: true,
    },
  })

  if (!prescription) return null

  return prisma.activity.create({
    data: {
      type: ActivityType.PRESCRIPTION,
      occurredAt: prescription.createdAt,
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      appointmentId: prescription.appointmentId,
      prescriptionId: prescription.id,
      title: `Rx by doctor`,
      subtitle: prescription.diagnosis,
      tags: JSON.stringify([]),
      notes: prescription.notes ?? undefined,
    },
  })
}

export async function createReportActivity({ reportId }: CreateReportActivityArgs) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      appointment: true,
    },
  })

  if (!report) return null

  return prisma.activity.create({
    data: {
      type: ActivityType.REPORT,
      occurredAt: report.uploadedAt,
      patientId: report.patientId,
      doctorId: report.doctorId ?? undefined,
      appointmentId: report.appointmentId ?? undefined,
      reportId: report.id,
      title: `${report.fileName} uploaded`,
      subtitle: 'Lab Report',
      tags: JSON.stringify([]),
      notes: report.notes ?? undefined,
    },
  })
}
