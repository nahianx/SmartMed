/**
 * Appointment Email Integration Helpers
 * 
 * Use these functions in your appointment routes/controllers
 * to send emails at appropriate lifecycle events.
 */

import { prisma, Prisma } from '@smartmed/database'
import {
  sendBookingConfirmationEmail,
  sendBookingUpdateEmail,
  sendBookingCancellationEmail,
  sendDoctorNewBookingNotification,
  generateGoogleCalendarLink,
  generateICSFile,
  isEmailEnabled,
} from './email-notification.service'
import {
  logEmailSend,
  updateEmailStatus,
  canSendEmail,
  waitForRateLimit,
} from './email-queue.service'

// Type for appointment with relations
type AppointmentWithDetails = Prisma.AppointmentGetPayload<{
  include: {
    patient: { include: { user: true } }
    doctor: { include: { user: true } }
  }
}>

/**
 * Fetch appointment with all required relations for email sending
 */
export async function getAppointmentForEmail(appointmentId: string): Promise<AppointmentWithDetails | null> {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  })
}

/**
 * Send all booking confirmation emails (patient + doctor)
 * Call this after a new appointment is created
 */
export async function sendBookingConfirmationEmails(appointmentId: string): Promise<{
  patientEmail: { success: boolean; error?: string }
  doctorEmail: { success: boolean; error?: string }
}> {
  const results = {
    patientEmail: { success: false, error: undefined as string | undefined },
    doctorEmail: { success: false, error: undefined as string | undefined },
  }

  // Check rate limits
  const canSend = canSendEmail()
  if (!canSend.allowed) {
    console.warn('[EMAIL] Rate limit reached:', canSend.reason)
    results.patientEmail.error = canSend.reason
    results.doctorEmail.error = canSend.reason
    return results
  }

  // Fetch appointment with relations
  const appointment = await getAppointmentForEmail(appointmentId)
  if (!appointment) {
    const error = `Appointment ${appointmentId} not found`
    results.patientEmail.error = error
    results.doctorEmail.error = error
    return results
  }

  // Send patient confirmation email
  try {
    await waitForRateLimit()
    const logId = logEmailSend({
      to: appointment.patient.user.email,
      subject: 'Booking Confirmation',
      type: 'confirmation',
      appointmentId,
      status: 'pending',
    })

    const result = await sendBookingConfirmationEmail(appointment)
    updateEmailStatus(logId, result.success ? 'sent' : 'failed', result.messageId, result.error)
    results.patientEmail = { success: result.success, error: result.error }
  } catch (error) {
    results.patientEmail.error = error instanceof Error ? error.message : 'Unknown error'
  }

  // Send doctor notification email
  try {
    await waitForRateLimit()
    const logId = logEmailSend({
      to: appointment.doctor.user.email,
      subject: 'New Booking Notification',
      type: 'doctor_notification',
      appointmentId,
      status: 'pending',
    })

    const result = await sendDoctorNewBookingNotification(appointment)
    updateEmailStatus(logId, result.success ? 'sent' : 'failed', result.messageId, result.error)
    results.doctorEmail = { success: result.success, error: result.error }
  } catch (error) {
    results.doctorEmail.error = error instanceof Error ? error.message : 'Unknown error'
  }

  return results
}

/**
 * Send booking update email
 * Call this after an appointment is modified
 */
export async function sendBookingUpdateEmails(
  appointmentId: string,
  updateType: 'rescheduled' | 'status_changed' | 'modified',
  previousDateTime?: Date
): Promise<{ success: boolean; error?: string }> {
  const canSend = canSendEmail()
  if (!canSend.allowed) {
    console.warn('[EMAIL] Rate limit reached:', canSend.reason)
    return { success: false, error: canSend.reason }
  }

  const appointment = await getAppointmentForEmail(appointmentId)
  if (!appointment) {
    return { success: false, error: `Appointment ${appointmentId} not found` }
  }

  try {
    await waitForRateLimit()
    const logId = logEmailSend({
      to: appointment.patient.user.email,
      subject: `Booking ${updateType}`,
      type: 'update',
      appointmentId,
      status: 'pending',
    })

    const result = await sendBookingUpdateEmail(appointment, updateType, previousDateTime)
    updateEmailStatus(logId, result.success ? 'sent' : 'failed', result.messageId, result.error)
    
    return { success: result.success, error: result.error }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Send booking cancellation email
 * Call this after an appointment is cancelled
 */
export async function sendBookingCancellationEmails(
  appointmentId: string,
  cancelledBy: 'patient' | 'doctor' | 'system',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const canSend = canSendEmail()
  if (!canSend.allowed) {
    console.warn('[EMAIL] Rate limit reached:', canSend.reason)
    return { success: false, error: canSend.reason }
  }

  const appointment = await getAppointmentForEmail(appointmentId)
  if (!appointment) {
    return { success: false, error: `Appointment ${appointmentId} not found` }
  }

  try {
    await waitForRateLimit()
    const logId = logEmailSend({
      to: appointment.patient.user.email,
      subject: 'Booking Cancellation',
      type: 'cancellation',
      appointmentId,
      status: 'pending',
    })

    const result = await sendBookingCancellationEmail(appointment, cancelledBy, reason)
    updateEmailStatus(logId, result.success ? 'sent' : 'failed', result.messageId, result.error)
    
    return { success: result.success, error: result.error }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get calendar links for an appointment (for API responses)
 */
export async function getAppointmentCalendarLinks(appointmentId: string): Promise<{
  googleCalendar?: string
  outlookCalendar?: string
  icsDownload?: string
  error?: string
}> {
  const appointment = await getAppointmentForEmail(appointmentId)
  if (!appointment) {
    return { error: `Appointment ${appointmentId} not found` }
  }

  try {
    const { generateOutlookCalendarLink } = await import('./email-notification.service')
    
    return {
      googleCalendar: generateGoogleCalendarLink(appointment),
      outlookCalendar: generateOutlookCalendarLink(appointment),
      icsDownload: `/api/appointments/${appointmentId}/calendar.ics`,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Generate ICS file content for direct download
 */
export async function getAppointmentICSFile(appointmentId: string): Promise<{
  content?: string
  filename?: string
  error?: string
}> {
  const appointment = await getAppointmentForEmail(appointmentId)
  if (!appointment) {
    return { error: `Appointment ${appointmentId} not found` }
  }

  try {
    const icsContent = generateICSFile(appointment)
    const dateStr = new Date(appointment.dateTime).toISOString().split('T')[0]
    const filename = `smartmed-appointment-${dateStr}.ics`
    
    return { content: icsContent, filename }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
