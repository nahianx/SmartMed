/**
 * Enhanced Appointment Reminder Scheduler
 * 
 * This scheduler:
 * 1. Scans for upcoming appointments
 * 2. Creates in-app notifications (existing functionality)
 * 3. Sends email reminders with .ics attachments
 * 4. Tracks which reminders have been sent to prevent duplicates
 * 
 * Runs every 5 minutes, sends reminders at 24h and 1h before appointments
 */

import { prisma, NotificationType, Prisma } from '@smartmed/database'
import { 
  sendAppointmentReminderEmail, 
  isEmailEnabled 
} from '../services/email-notification.service'

// Valid statuses for reminders
const REMINDER_STATUSES = ['SCHEDULED', 'CONFIRMED', 'ACCEPTED'] as const

const FIVE_MINUTES_MS = 5 * 60 * 1000

// Define the type for appointment with full relations
type AppointmentWithDetails = Prisma.AppointmentGetPayload<{
  include: {
    patient: { include: { user: true } }
    doctor: { include: { user: true } }
  }
}>

/**
 * Main reminder scan function
 * Runs periodically to check for upcoming appointments and send reminders
 */
async function runReminderScan() {
  const now = new Date()
  const emailEnabled = isEmailEnabled()

  // Define time windows for reminders
  // 24-hour reminder: appointments between 24h and 24h+5min from now
  const window24Start = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const window24End = new Date(window24Start.getTime() + FIVE_MINUTES_MS)

  // 1-hour reminder: appointments between 1h and 1h+5min from now
  const window1Start = new Date(now.getTime() + 60 * 60 * 1000)
  const window1End = new Date(window1Start.getTime() + FIVE_MINUTES_MS)

  console.log(`[REMINDER] Starting scan at ${now.toISOString()}`)
  console.log(`[REMINDER] Email sending ${emailEnabled ? 'ENABLED' : 'DISABLED (dev mode)'}`)

  try {
    // Fetch appointments for 24h reminders (filter by date range first, then status in JS)
    const rawAppointments24h = await prisma.appointment.findMany({
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
    // Filter by valid statuses (SCHEDULED, CONFIRMED, ACCEPTED)
    const appointments24h = rawAppointments24h.filter(
      (a) => a.status && REMINDER_STATUSES.includes(a.status as typeof REMINDER_STATUSES[number])
    )

    // Fetch appointments for 1h reminders
    const rawAppointments1h = await prisma.appointment.findMany({
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
    // Filter by valid statuses (SCHEDULED, CONFIRMED, ACCEPTED)
    const appointments1h = rawAppointments1h.filter(
      (a) => a.status && REMINDER_STATUSES.includes(a.status as typeof REMINDER_STATUSES[number])
    )

    console.log(`[REMINDER] Found ${appointments24h.length} appointments for 24h reminder`)
    console.log(`[REMINDER] Found ${appointments1h.length} appointments for 1h reminder`)

    // Process 24-hour reminders
    for (const appt of appointments24h) {
      await processReminder(appt, NotificationType.APPOINTMENT_REMINDER_24H, '24h')
    }

    // Process 1-hour reminders
    for (const appt of appointments1h) {
      await processReminder(appt, NotificationType.APPOINTMENT_REMINDER_1H, '1h')
    }

  } catch (error) {
    console.error('[REMINDER] Error during reminder scan:', error)
  }
}

/**
 * Process a single reminder - creates in-app notification and sends email
 */
async function processReminder(
  appt: AppointmentWithDetails,
  type: NotificationType,
  reminderType: '24h' | '1h'
) {
  const patientUserId = appt.patient.user.id
  const doctorUserId = appt.doctor.user.id
  const title = type === NotificationType.APPOINTMENT_REMINDER_24H 
    ? 'Upcoming appointment in 24 hours' 
    : 'Upcoming appointment in 1 hour'

  try {
    // Create patient notification (upsert to prevent duplicates)
    const patientNotification = await prisma.notification.upsert({
      where: {
        userId_appointmentId_type: {
          userId: patientUserId,
          appointmentId: appt.id,
          type,
        },
      },
      update: {},
      create: {
        userId: patientUserId,
        appointmentId: appt.id,
        type,
        title,
        body: `Your appointment with Dr. ${appt.doctor.firstName} ${appt.doctor.lastName} is ${reminderType === '24h' ? 'tomorrow' : 'in 1 hour'}.`,
      },
    })

    // Create doctor notification
    await prisma.notification.upsert({
      where: {
        userId_appointmentId_type: {
          userId: doctorUserId,
          appointmentId: appt.id,
          type,
        },
      },
      update: {},
      create: {
        userId: doctorUserId,
        appointmentId: appt.id,
        type,
        title,
        body: `Appointment with ${appt.patient.firstName} ${appt.patient.lastName} is ${reminderType === '24h' ? 'tomorrow' : 'in 1 hour'}.`,
      },
    })

    // Send email reminder to patient (only if notification was just created)
    // Check if this notification already has an email sent marker
    if (patientNotification.createdAt.getTime() >= Date.now() - FIVE_MINUTES_MS) {
      // This is a new notification, send the email
      const emailResult = await sendAppointmentReminderEmail(appt, reminderType)
      
      if (emailResult.success) {
        console.log(`[REMINDER] ${reminderType} reminder email sent for appointment ${appt.id}`)
      } else {
        console.error(`[REMINDER] Failed to send ${reminderType} email for appointment ${appt.id}:`, emailResult.error)
      }
    } else {
      console.log(`[REMINDER] ${reminderType} reminder already sent for appointment ${appt.id}, skipping email`)
    }

  } catch (error) {
    console.error(`[REMINDER] Error processing reminder for appointment ${appt.id}:`, error)
  }
}

/**
 * Start the reminder scheduler
 * Runs immediately on startup, then every 5 minutes
 */
export function startReminderScheduler() {
  console.log('[REMINDER] Starting reminder scheduler...')
  
  // Run once at startup
  runReminderScan().catch((err) => console.error('[REMINDER] Initial scan error:', err))
  
  // Then run every 5 minutes
  setInterval(() => {
    runReminderScan().catch((err) => console.error('[REMINDER] Scheduled scan error:', err))
  }, FIVE_MINUTES_MS)
  
  console.log('[REMINDER] Scheduler started, running every 5 minutes')
}

/**
 * Stop the reminder scheduler (for graceful shutdown)
 */
let schedulerIntervalId: NodeJS.Timeout | null = null

export function startReminderSchedulerWithCleanup() {
  console.log('[REMINDER] Starting reminder scheduler with cleanup support...')
  
  runReminderScan().catch((err) => console.error('[REMINDER] Initial scan error:', err))
  
  schedulerIntervalId = setInterval(() => {
    runReminderScan().catch((err) => console.error('[REMINDER] Scheduled scan error:', err))
  }, FIVE_MINUTES_MS)
  
  return schedulerIntervalId
}

export function stopReminderScheduler() {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId)
    schedulerIntervalId = null
    console.log('[REMINDER] Scheduler stopped')
  }
}

/**
 * Manually trigger a reminder scan (for testing)
 */
export async function triggerReminderScan() {
  console.log('[REMINDER] Manual scan triggered')
  await runReminderScan()
}
