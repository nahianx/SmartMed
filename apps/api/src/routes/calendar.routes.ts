/**
 * Calendar Integration Routes
 * 
 * Provides endpoints for:
 * - Downloading .ics calendar files
 * - Getting calendar links (Google, Outlook)
 * - Email admin/monitoring (for debugging)
 */

import { Router, Request, Response } from 'express'
import { prisma } from '@smartmed/database'
import { 
  getAppointmentCalendarLinks, 
  getAppointmentICSFile 
} from '../services/appointment-email.service'
import { 
  getEmailQueueStats, 
  getRecentEmails, 
  canSendEmail 
} from '../services/email-queue.service'
import { isEmailEnabled } from '../services/email-notification.service'

const router = Router()

/**
 * GET /api/appointments/:id/calendar
 * Get calendar links for an appointment
 */
router.get('/appointments/:id/calendar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const links = await getAppointmentCalendarLinks(id)
    
    if (links.error) {
      return res.status(404).json({ error: links.error })
    }
    
    res.json({
      success: true,
      data: {
        googleCalendar: links.googleCalendar,
        outlookCalendar: links.outlookCalendar,
        icsDownload: links.icsDownload,
      },
    })
  } catch (error) {
    console.error('[CALENDAR] Error getting calendar links:', error)
    res.status(500).json({ error: 'Failed to generate calendar links' })
  }
})

/**
 * GET /api/appointments/:id/calendar.ics
 * Download .ics calendar file for an appointment
 */
router.get('/appointments/:id/calendar.ics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await getAppointmentICSFile(id)
    
    if (result.error || !result.content) {
      return res.status(404).json({ error: result.error || 'ICS file not generated' })
    }
    
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.content)
  } catch (error) {
    console.error('[CALENDAR] Error generating ICS file:', error)
    res.status(500).json({ error: 'Failed to generate calendar file' })
  }
})

/**
 * GET /api/admin/email/stats
 * Get email sending statistics (admin only)
 */
router.get('/admin/email/stats', async (req: Request, res: Response) => {
  try {
    const stats = getEmailQueueStats()
    const canSendResult = canSendEmail()
    
    res.json({
      success: true,
      data: {
        enabled: isEmailEnabled(),
        canSend: canSendResult.allowed,
        canSendReason: canSendResult.reason,
        stats: {
          today: {
            sent: stats.todaySent,
            remaining: stats.dailyRemaining,
            limit: 100,
          },
          month: {
            sent: stats.monthSent,
            remaining: stats.monthlyRemaining,
            limit: 3000,
          },
          queue: {
            pending: stats.pending,
            failed: stats.failed,
          },
        },
      },
    })
  } catch (error) {
    console.error('[EMAIL-ADMIN] Error getting stats:', error)
    res.status(500).json({ error: 'Failed to get email stats' })
  }
})

/**
 * GET /api/admin/email/logs
 * Get recent email logs (admin only)
 */
router.get('/admin/email/logs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const logs = getRecentEmails(limit)
    
    res.json({
      success: true,
      data: {
        count: logs.length,
        logs: logs.map(log => ({
          id: log.id,
          to: log.to,
          subject: log.subject,
          type: log.type,
          status: log.status,
          sentAt: log.sentAt,
          error: log.error,
        })),
      },
    })
  } catch (error) {
    console.error('[EMAIL-ADMIN] Error getting logs:', error)
    res.status(500).json({ error: 'Failed to get email logs' })
  }
})

/**
 * POST /api/admin/email/test
 * Send a test email (admin only, development mode)
 */
router.post('/admin/email/test', async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' })
    }
    
    // Import Resend for direct test
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    if (!process.env.RESEND_API_KEY) {
      return res.json({
        success: true,
        message: 'Test email logged (RESEND_API_KEY not configured)',
        devMode: true,
      })
    }
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SmartMed <onboarding@resend.dev>',
      to: email,
      subject: 'SmartMed Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #667eea;">🎉 Email Configuration Working!</h1>
          <p>This is a test email from SmartMed.</p>
          <p>If you received this, your email configuration is set up correctly.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toISOString()}<br>
            Environment: ${process.env.NODE_ENV || 'development'}
          </p>
        </div>
      `,
    })
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      })
    }
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: data?.id,
    })
  } catch (error) {
    console.error('[EMAIL-ADMIN] Error sending test email:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send test email' 
    })
  }
})

export default router
