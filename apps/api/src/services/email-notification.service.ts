/**
 * SmartMed Email Notification Service
 * 
 * Handles all email notifications for booking management:
 * - Booking confirmations
 * - Booking updates/cancellations
 * - Appointment reminders (24h and 1h before)
 * - .ics calendar file attachments
 * - Google Calendar links
 * 
 * Uses Resend for email delivery (free tier: 3,000 emails/month)
 */

import { Resend } from 'resend'
import ical, { ICalCalendarMethod, ICalEventStatus, ICalAlarmType, ICalAttendeeRole } from 'ical-generator'
import { Prisma } from '@smartmed/database'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Email configuration
const EMAIL_FROM = process.env.EMAIL_FROM || 'SmartMed <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const APP_NAME = 'SmartMed'

// Type for appointment with relations - using Prisma's generated type
type AppointmentWithDetails = Prisma.AppointmentGetPayload<{
  include: {
    patient: { include: { user: true } }
    doctor: { include: { user: true } }
  }
}>

// ============================================
// iCalendar (.ics) File Generation
// ============================================

/**
 * Generates an iCalendar (.ics) file for an appointment
 */
export function generateICSFile(appointment: AppointmentWithDetails): string {
  const startDate = new Date(appointment.dateTime)
  const endDate = new Date(startDate.getTime() + appointment.duration * 60 * 1000)
  
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`
  
  const calendar = ical({
    name: `${APP_NAME} Appointment`,
    method: ICalCalendarMethod.REQUEST,
    prodId: {
      company: APP_NAME,
      product: 'Appointment Booking',
      language: 'EN',
    },
  })

  calendar.createEvent({
    start: startDate,
    end: endDate,
    summary: `Medical Appointment with ${doctorName}`,
    description: `
Appointment Details:
- Patient: ${patientName}
- Doctor: ${doctorName}
- Specialization: ${appointment.doctor.specialization}
- Reason: ${appointment.reason}
${appointment.notes ? `- Notes: ${appointment.notes}` : ''}

Manage your appointment: ${FRONTEND_URL}/appointments/${appointment.id}
    `.trim(),
    location: appointment.doctor.clinicId 
      ? `SmartMed Clinic` 
      : 'SmartMed Healthcare Center',
    url: `${FRONTEND_URL}/appointments/${appointment.id}`,
    status: mapAppointmentStatusToICalStatus(appointment.status),
    organizer: {
      name: APP_NAME,
      email: process.env.EMAIL_FROM_ADDRESS || 'appointments@smartmed.local',
    },
    attendees: [
      {
        name: patientName,
        email: appointment.patient.user.email,
        rsvp: true,
        role: ICalAttendeeRole.REQ,
      },
      {
        name: doctorName,
        email: appointment.doctor.user.email,
        role: ICalAttendeeRole.CHAIR,
      },
    ],
    alarms: [
      // Reminder 24 hours before
      {
        type: ICalAlarmType.display,
        trigger: 24 * 60 * 60, // 24 hours in seconds (before event)
        description: `Reminder: Appointment with ${doctorName} tomorrow`,
      },
      // Reminder 1 hour before
      {
        type: ICalAlarmType.display,
        trigger: 60 * 60, // 1 hour in seconds
        description: `Reminder: Appointment with ${doctorName} in 1 hour`,
      },
    ],
  })

  return calendar.toString()
}

function mapAppointmentStatusToICalStatus(status: string): ICalEventStatus {
  switch (status) {
    case 'CONFIRMED':
    case 'SCHEDULED':
    case 'ACCEPTED':
      return ICalEventStatus.CONFIRMED
    case 'CANCELLED':
    case 'REJECTED':
      return ICalEventStatus.CANCELLED
    case 'PENDING':
    default:
      return ICalEventStatus.TENTATIVE
  }
}

// ============================================
// Google Calendar Link Generation
// ============================================

/**
 * Generates a Google Calendar "Add to Calendar" URL
 */
export function generateGoogleCalendarLink(appointment: AppointmentWithDetails): string {
  const startDate = new Date(appointment.dateTime)
  const endDate = new Date(startDate.getTime() + appointment.duration * 60 * 1000)
  
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`
  
  // Format dates to Google Calendar format: YYYYMMDDTHHmmssZ
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  
  const title = encodeURIComponent(`Medical Appointment with ${doctorName}`)
  const dates = `${formatDate(startDate)}/${formatDate(endDate)}`
  const details = encodeURIComponent(
    `Patient: ${patientName}\n` +
    `Doctor: ${doctorName}\n` +
    `Specialization: ${appointment.doctor.specialization}\n` +
    `Reason: ${appointment.reason}\n` +
    `\nView appointment: ${FRONTEND_URL}/appointments/${appointment.id}`
  )
  const location = encodeURIComponent(
    appointment.doctor.clinicId 
      ? 'SmartMed Clinic' 
      : 'SmartMed Healthcare Center'
  )
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`
}

/**
 * Generates an Outlook Calendar "Add to Calendar" URL
 */
export function generateOutlookCalendarLink(appointment: AppointmentWithDetails): string {
  const startDate = new Date(appointment.dateTime)
  const endDate = new Date(startDate.getTime() + appointment.duration * 60 * 1000)
  
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  
  const formatDate = (date: Date): string => {
    return date.toISOString()
  }
  
  const subject = encodeURIComponent(`Medical Appointment with ${doctorName}`)
  const body = encodeURIComponent(`Appointment at SmartMed Healthcare`)
  const startdt = encodeURIComponent(formatDate(startDate))
  const enddt = encodeURIComponent(formatDate(endDate))
  const location = encodeURIComponent('SmartMed Healthcare Center')
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&body=${body}&startdt=${startdt}&enddt=${enddt}&location=${location}`
}

// ============================================
// Email Templates
// ============================================

function getBaseEmailStyles(): string {
  return `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
      .appointment-card { background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; }
      .appointment-detail { display: flex; margin: 10px 0; }
      .detail-label { font-weight: 600; color: #555; min-width: 120px; }
      .detail-value { color: #333; }
      .btn { display: inline-block; padding: 12px 24px; margin: 5px; border-radius: 6px; text-decoration: none; font-weight: 600; text-align: center; }
      .btn-primary { background: #667eea; color: white !important; }
      .btn-secondary { background: #f8f9fa; color: #333 !important; border: 1px solid #ddd; }
      .btn-google { background: #4285f4; color: white !important; }
      .btn-outlook { background: #0078d4; color: white !important; }
      .calendar-buttons { text-align: center; margin: 20px 0; }
      .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
      .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      .status-confirmed { background: #d4edda; color: #155724; }
      .status-pending { background: #fff3cd; color: #856404; }
      .status-cancelled { background: #f8d7da; color: #721c24; }
    </style>
  `
}

function getAppointmentDetailsHTML(appointment: AppointmentWithDetails): string {
  const startDate = new Date(appointment.dateTime)
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  
  const statusClass = appointment.status === 'CONFIRMED' || appointment.status === 'SCHEDULED' 
    ? 'status-confirmed' 
    : appointment.status === 'CANCELLED' 
      ? 'status-cancelled' 
      : 'status-pending'

  return `
    <div class="appointment-card">
      <div class="appointment-detail">
        <span class="detail-label">📅 Date:</span>
        <span class="detail-value">${startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div class="appointment-detail">
        <span class="detail-label">⏰ Time:</span>
        <span class="detail-value">${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="appointment-detail">
        <span class="detail-label">👨‍⚕️ Doctor:</span>
        <span class="detail-value">${doctorName}</span>
      </div>
      <div class="appointment-detail">
        <span class="detail-label">🏥 Specialty:</span>
        <span class="detail-value">${appointment.doctor.specialization}</span>
      </div>
      <div class="appointment-detail">
        <span class="detail-label">⏱️ Duration:</span>
        <span class="detail-value">${appointment.duration} minutes</span>
      </div>
      <div class="appointment-detail">
        <span class="detail-label">📋 Reason:</span>
        <span class="detail-value">${appointment.reason}</span>
      </div>
      <div class="appointment-detail">
        <span class="detail-label">📊 Status:</span>
        <span class="status-badge ${statusClass}">${appointment.status}</span>
      </div>
    </div>
  `
}

// ============================================
// Email Sending Functions
// ============================================

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send booking confirmation email to patient
 */
export async function sendBookingConfirmationEmail(
  appointment: AppointmentWithDetails
): Promise<EmailResult> {
  const patientEmail = appointment.patient.user.email
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  
  // Generate calendar attachments
  const icsContent = generateICSFile(appointment)
  const googleCalendarLink = generateGoogleCalendarLink(appointment)
  const outlookCalendarLink = generateOutlookCalendarLink(appointment)
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseEmailStyles()}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Appointment Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>Your appointment has been successfully booked with ${doctorName}. Here are the details:</p>
          
          ${getAppointmentDetailsHTML(appointment)}
          
          <div class="calendar-buttons">
            <p><strong>Add to your calendar:</strong></p>
            <a href="${googleCalendarLink}" class="btn btn-google" target="_blank">📅 Google Calendar</a>
            <a href="${outlookCalendarLink}" class="btn btn-outlook" target="_blank">📅 Outlook</a>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">
            📎 An .ics calendar file is attached to this email for other calendar applications.
          </p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${FRONTEND_URL}/appointments/${appointment.id}" class="btn btn-primary">View Appointment Details</a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <h3>📝 Important Reminders:</h3>
          <ul>
            <li>Please arrive 10 minutes before your scheduled time</li>
            <li>Bring any relevant medical records or test results</li>
            <li>If you need to cancel or reschedule, please do so at least 24 hours in advance</li>
          </ul>
        </div>
        <div class="footer">
          <p>This email was sent by ${APP_NAME}</p>
          <p>If you didn't book this appointment, please <a href="${FRONTEND_URL}/support">contact support</a></p>
        </div>
      </div>
    </body>
    </html>
  `
  
  try {
    // Check if we're in development/test mode
    if (!process.env.RESEND_API_KEY || process.env.NODE_ENV === 'test') {
      console.log(`[EMAIL-DEV] Booking confirmation would be sent to: ${patientEmail}`)
      console.log(`[EMAIL-DEV] Subject: Appointment Confirmed - ${doctorName}`)
      return { success: true, messageId: 'dev-mode-' + Date.now() }
    }
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: patientEmail,
      subject: `✅ Appointment Confirmed - ${doctorName} on ${new Date(appointment.dateTime).toLocaleDateString()}`,
      html,
      attachments: [
        {
          filename: 'appointment.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar',
        },
      ],
    })
    
    if (error) {
      console.error('[EMAIL] Failed to send booking confirmation:', error)
      return { success: false, error: error.message }
    }
    
    console.log(`[EMAIL] Booking confirmation sent to ${patientEmail}, ID: ${data?.id}`)
    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('[EMAIL] Error sending booking confirmation:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send booking update/modification email
 */
export async function sendBookingUpdateEmail(
  appointment: AppointmentWithDetails,
  updateType: 'rescheduled' | 'status_changed' | 'modified',
  previousDateTime?: Date
): Promise<EmailResult> {
  const patientEmail = appointment.patient.user.email
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  
  const icsContent = generateICSFile(appointment)
  const googleCalendarLink = generateGoogleCalendarLink(appointment)
  
  const updateMessages = {
    rescheduled: {
      title: '📅 Appointment Rescheduled',
      message: previousDateTime 
        ? `Your appointment has been rescheduled from ${previousDateTime.toLocaleString()} to the new time shown below.`
        : 'Your appointment has been rescheduled. Please see the updated details below.',
    },
    status_changed: {
      title: '🔄 Appointment Status Updated',
      message: `Your appointment status has been updated to: ${appointment.status}`,
    },
    modified: {
      title: '✏️ Appointment Details Updated',
      message: 'Your appointment details have been modified. Please review the updated information below.',
    },
  }
  
  const { title, message } = updateMessages[updateType]
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseEmailStyles()}</head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <h1>${title}</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>${message}</p>
          
          ${getAppointmentDetailsHTML(appointment)}
          
          <div class="calendar-buttons">
            <p><strong>Update your calendar:</strong></p>
            <a href="${googleCalendarLink}" class="btn btn-google" target="_blank">📅 Update in Google Calendar</a>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${FRONTEND_URL}/appointments/${appointment.id}" class="btn btn-primary">View Updated Details</a>
          </div>
        </div>
        <div class="footer">
          <p>This email was sent by ${APP_NAME}</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  try {
    if (!process.env.RESEND_API_KEY || process.env.NODE_ENV === 'test') {
      console.log(`[EMAIL-DEV] Booking update (${updateType}) would be sent to: ${patientEmail}`)
      return { success: true, messageId: 'dev-mode-' + Date.now() }
    }
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: patientEmail,
      subject: `${title} - ${doctorName}`,
      html,
      attachments: [
        {
          filename: 'appointment-updated.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar',
        },
      ],
    })
    
    if (error) {
      console.error('[EMAIL] Failed to send booking update:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('[EMAIL] Error sending booking update:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send booking cancellation email
 */
export async function sendBookingCancellationEmail(
  appointment: AppointmentWithDetails,
  cancelledBy: 'patient' | 'doctor' | 'system',
  reason?: string
): Promise<EmailResult> {
  const patientEmail = appointment.patient.user.email
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  
  const cancelMessages = {
    patient: 'You have cancelled this appointment.',
    doctor: `${doctorName} has cancelled this appointment.`,
    system: 'This appointment has been cancelled by the system.',
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseEmailStyles()}</head>
    <body>
      <div class="container">
        <div class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); opacity: 0.8;">
          <h1>❌ Appointment Cancelled</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>${cancelMessages[cancelledBy]}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          
          <div class="appointment-card" style="border-left-color: #dc3545;">
            <p style="color: #666; text-decoration: line-through;">
              Appointment with ${doctorName} on ${new Date(appointment.dateTime).toLocaleString()}
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="${FRONTEND_URL}/book-appointment" class="btn btn-primary">Book New Appointment</a>
          </div>
        </div>
        <div class="footer">
          <p>This email was sent by ${APP_NAME}</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  try {
    if (!process.env.RESEND_API_KEY || process.env.NODE_ENV === 'test') {
      console.log(`[EMAIL-DEV] Cancellation email would be sent to: ${patientEmail}`)
      return { success: true, messageId: 'dev-mode-' + Date.now() }
    }
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: patientEmail,
      subject: `Appointment Cancelled - ${doctorName}`,
      html,
    })
    
    if (error) {
      console.error('[EMAIL] Failed to send cancellation email:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('[EMAIL] Error sending cancellation email:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send appointment reminder email (24h or 1h before)
 */
export async function sendAppointmentReminderEmail(
  appointment: AppointmentWithDetails,
  reminderType: '24h' | '1h'
): Promise<EmailResult> {
  const patientEmail = appointment.patient.user.email
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  
  const googleCalendarLink = generateGoogleCalendarLink(appointment)
  
  const reminderConfig = {
    '24h': {
      emoji: '📅',
      title: 'Appointment Tomorrow',
      timeText: 'tomorrow',
      urgencyColor: '#667eea',
    },
    '1h': {
      emoji: '⏰',
      title: 'Appointment in 1 Hour',
      timeText: 'in 1 hour',
      urgencyColor: '#f5576c',
    },
  }
  
  const config = reminderConfig[reminderType]
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseEmailStyles()}</head>
    <body>
      <div class="container">
        <div class="header" style="background: ${config.urgencyColor};">
          <h1>${config.emoji} ${config.title}</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${patientName}</strong>,</p>
          <p>This is a friendly reminder that your appointment is ${config.timeText}.</p>
          
          ${getAppointmentDetailsHTML(appointment)}
          
          <div style="background: #fff3cd; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #856404;">📝 Preparation Checklist:</h4>
            <ul style="margin: 0; color: #856404;">
              <li>Bring your ID and insurance card</li>
              <li>Prepare a list of current medications</li>
              <li>Note down any questions for the doctor</li>
              <li>Arrive 10 minutes early</li>
            </ul>
          </div>
          
          <div class="calendar-buttons">
            <a href="${googleCalendarLink}" class="btn btn-google" target="_blank">📅 View in Calendar</a>
            <a href="${FRONTEND_URL}/appointments/${appointment.id}" class="btn btn-primary">View Details</a>
          </div>
          
          <p style="text-align: center; margin-top: 20px;">
            Need to reschedule? <a href="${FRONTEND_URL}/appointments/${appointment.id}/reschedule">Click here</a>
          </p>
        </div>
        <div class="footer">
          <p>This email was sent by ${APP_NAME}</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  try {
    if (!process.env.RESEND_API_KEY || process.env.NODE_ENV === 'test') {
      console.log(`[EMAIL-DEV] ${reminderType} reminder would be sent to: ${patientEmail}`)
      return { success: true, messageId: 'dev-mode-' + Date.now() }
    }
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: patientEmail,
      subject: `${config.emoji} Reminder: Appointment ${config.timeText} with ${doctorName}`,
      html,
    })
    
    if (error) {
      console.error('[EMAIL] Failed to send reminder email:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('[EMAIL] Error sending reminder email:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send email notification to doctor about new booking
 */
export async function sendDoctorNewBookingNotification(
  appointment: AppointmentWithDetails
): Promise<EmailResult> {
  const doctorEmail = appointment.doctor.user.email
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
  const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`
  
  const icsContent = generateICSFile(appointment)
  const googleCalendarLink = generateGoogleCalendarLink(appointment)
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>${getBaseEmailStyles()}</head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 New Appointment Booked</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${doctorName}</strong>,</p>
          <p>A new appointment has been booked with you.</p>
          
          <div class="appointment-card">
            <div class="appointment-detail">
              <span class="detail-label">👤 Patient:</span>
              <span class="detail-value">${patientName}</span>
            </div>
            <div class="appointment-detail">
              <span class="detail-label">📅 Date:</span>
              <span class="detail-value">${new Date(appointment.dateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="appointment-detail">
              <span class="detail-label">⏰ Time:</span>
              <span class="detail-value">${new Date(appointment.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="appointment-detail">
              <span class="detail-label">📋 Reason:</span>
              <span class="detail-value">${appointment.reason}</span>
            </div>
          </div>
          
          <div class="calendar-buttons">
            <a href="${googleCalendarLink}" class="btn btn-google" target="_blank">📅 Add to Calendar</a>
            <a href="${FRONTEND_URL}/doctor/appointments/${appointment.id}" class="btn btn-primary">View Details</a>
          </div>
        </div>
        <div class="footer">
          <p>This email was sent by ${APP_NAME}</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  try {
    if (!process.env.RESEND_API_KEY || process.env.NODE_ENV === 'test') {
      console.log(`[EMAIL-DEV] Doctor notification would be sent to: ${doctorEmail}`)
      return { success: true, messageId: 'dev-mode-' + Date.now() }
    }
    
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: doctorEmail,
      subject: `New Appointment: ${patientName} on ${new Date(appointment.dateTime).toLocaleDateString()}`,
      html,
      attachments: [
        {
          filename: 'appointment.ics',
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar',
        },
      ],
    })
    
    if (error) {
      console.error('[EMAIL] Failed to send doctor notification:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('[EMAIL] Error sending doctor notification:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if email sending is enabled (API key configured)
 */
export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'test'
}

/**
 * Get remaining email quota (for free tier management)
 * Note: Resend doesn't provide a direct API for this, so this is a placeholder
 * In production, you'd track this in your database
 */
export async function getEmailQuotaStatus(): Promise<{
  dailyLimit: number
  dailySent: number
  monthlyLimit: number
  monthlySent: number
}> {
  // For free tier: 100/day, 3000/month
  // In production, track these in database
  return {
    dailyLimit: 100,
    dailySent: 0, // TODO: Implement tracking
    monthlyLimit: 3000,
    monthlySent: 0, // TODO: Implement tracking
  }
}
