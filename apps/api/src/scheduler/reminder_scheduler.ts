import { prisma, NotificationType } from '@smartmed/database'

const FIVE_MINUTES_MS = 5 * 60 * 1000

async function runReminderScan() {
  const now = new Date()

  const window24Start = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const window24End = new Date(window24Start.getTime() + FIVE_MINUTES_MS)

  const window1Start = new Date(now.getTime() + 60 * 60 * 1000)
  const window1End = new Date(window1Start.getTime() + FIVE_MINUTES_MS)

  // 24h reminders
  const appointments24h = await prisma.appointment.findMany({
    where: {
      dateTime: {
        gte: window24Start,
        lt: window24End,
      },
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  })

  // 1h reminders
  const appointments1h = await prisma.appointment.findMany({
    where: {
      dateTime: {
        gte: window1Start,
        lt: window1End,
      },
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  })

  for (const appt of appointments24h) {
    await createAppointmentReminderNotifications(appt.id, NotificationType.APPOINTMENT_REMINDER_24H, appt.patient.user.id, appt.doctor.user.id)
  }

  for (const appt of appointments1h) {
    await createAppointmentReminderNotifications(appt.id, NotificationType.APPOINTMENT_REMINDER_1H, appt.patient.user.id, appt.doctor.user.id)
  }
}

async function createAppointmentReminderNotifications(
  appointmentId: string,
  type: NotificationType,
  patientUserId: string,
  doctorUserId: string,
) {
  const title24 = type === NotificationType.APPOINTMENT_REMINDER_24H ? 'Upcoming appointment in 24 hours' : 'Upcoming appointment in 1 hour'

  // Patient notification
  await prisma.notification.upsert({
    where: {
      userId_appointmentId_type: {
        userId: patientUserId,
        appointmentId,
        type,
      },
    },
    update: {},
    create: {
      userId: patientUserId,
      appointmentId,
      type,
      title: title24,
    },
  })

  // Doctor notification
  await prisma.notification.upsert({
    where: {
      userId_appointmentId_type: {
        userId: doctorUserId,
        appointmentId,
        type,
      },
    },
    update: {},
    create: {
      userId: doctorUserId,
      appointmentId,
      type,
      title: title24,
    },
  })
}

export function startReminderScheduler() {
  // Run once at startup, then every 5 minutes
  runReminderScan().catch((err) => console.error('Reminder scan error', err))
  setInterval(() => {
    runReminderScan().catch((err) => console.error('Reminder scan error', err))
  }, FIVE_MINUTES_MS)
}
