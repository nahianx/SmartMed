/**
 * SmartMed Email Service for Authentication Emails
 * 
 * Handles auth-related emails:
 * - Email verification
 * - Password reset
 * - Account security notifications
 * 
 * Uses Resend for email delivery
 */

import { User } from '@smartmed/database'
import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_FROM = process.env.EMAIL_FROM || 'SmartMed <onboarding@resend.dev>'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const APP_NAME = 'SmartMed'

// Check if email sending is enabled
const isEmailEnabled = (): boolean => {
  return Boolean(process.env.RESEND_API_KEY) && process.env.NODE_ENV !== 'test'
}

export class EmailService {
  /**
   * Send email verification link to new user
   */
  static async sendVerificationEmail(user: User, token: string): Promise<boolean> {
    const link = `${FRONTEND_URL}/auth/verify-email/${token}`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - ${APP_NAME}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🏥 ${APP_NAME}</h1>
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Welcome to ${APP_NAME}!</h2>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      Hi ${user.fullName || 'there'},
    </p>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      Thank you for registering with ${APP_NAME}. To complete your registration and secure your account, please verify your email address by clicking the button below:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #2563eb; font-size: 14px; word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px;">
      ${link}
    </p>
    
    <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        ⏰ This link will expire in 1 hour for security reasons.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
        If you didn't create an account with ${APP_NAME}, you can safely ignore this email.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #9ca3af; font-size: 12px;">
      © ${new Date().getFullYear()} ${APP_NAME} Healthcare. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim()

    const text = `
Welcome to ${APP_NAME}!

Hi ${user.fullName || 'there'},

Thank you for registering with ${APP_NAME}. Please verify your email address by clicking the link below:

${link}

This link will expire in 1 hour for security reasons.

If you didn't create an account with ${APP_NAME}, you can safely ignore this email.

© ${new Date().getFullYear()} ${APP_NAME} Healthcare
    `.trim()

    if (!isEmailEnabled()) {
      console.log(`[EmailService] DEV MODE - Verification email for ${user.email}:`)
      console.log(`  Link: ${link}`)
      return true
    }

    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Verify your email address - ${APP_NAME}`,
        html,
        text,
      })

      if (error) {
        console.error('[EmailService] Failed to send verification email:', error)
        return false
      }

      console.log(`[EmailService] Verification email sent to ${user.email}, id: ${data?.id}`)
      return true
    } catch (err) {
      console.error('[EmailService] Error sending verification email:', err)
      return false
    }
  }

  /**
   * Send password reset link
   */
  static async sendPasswordResetEmail(user: User, token: string): Promise<boolean> {
    const link = `${FRONTEND_URL}/auth/reset-password/${token}`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - ${APP_NAME}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🏥 ${APP_NAME}</h1>
    </div>
    
    <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      Hi ${user.fullName || 'there'},
    </p>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      We received a request to reset your password. Click the button below to create a new password:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #dc2626; font-size: 14px; word-break: break-all; background-color: #fef2f2; padding: 12px; border-radius: 4px;">
      ${link}
    </p>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        ⚠️ <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email and your password will remain unchanged.
      </p>
    </div>
    
    <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        ⏰ This link will expire in 1 hour for security reasons.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #9ca3af; font-size: 12px;">
      © ${new Date().getFullYear()} ${APP_NAME} Healthcare. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim()

    const text = `
Password Reset Request

Hi ${user.fullName || 'there'},

We received a request to reset your password. Click the link below to create a new password:

${link}

This link will expire in 1 hour for security reasons.

SECURITY NOTICE: If you didn't request a password reset, please ignore this email and your password will remain unchanged.

© ${new Date().getFullYear()} ${APP_NAME} Healthcare
    `.trim()

    if (!isEmailEnabled()) {
      console.log(`[EmailService] DEV MODE - Password reset email for ${user.email}:`)
      console.log(`  Link: ${link}`)
      return true
    }

    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Reset your password - ${APP_NAME}`,
        html,
        text,
      })

      if (error) {
        console.error('[EmailService] Failed to send password reset email:', error)
        return false
      }

      console.log(`[EmailService] Password reset email sent to ${user.email}, id: ${data?.id}`)
      return true
    } catch (err) {
      console.error('[EmailService] Error sending password reset email:', err)
      return false
    }
  }

  /**
   * Send security alert when password is changed
   */
  static async sendPasswordChangedNotification(user: User): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed - ${APP_NAME}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🏥 ${APP_NAME}</h1>
    </div>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        🔐 <strong>Security Alert</strong>
      </p>
    </div>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      Hi ${user.fullName || 'there'},
    </p>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      Your ${APP_NAME} account password was recently changed. This email is a confirmation of that action.
    </p>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      <strong>When:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
    </p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 6px; margin-top: 20px;">
      <p style="color: #991b1b; font-size: 14px; margin: 0;">
        <strong>Didn't make this change?</strong><br>
        If you didn't change your password, your account may be compromised. Please contact our support team immediately at <a href="mailto:support@smartmed.com" style="color: #dc2626;">support@smartmed.com</a>
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #9ca3af; font-size: 12px;">
      © ${new Date().getFullYear()} ${APP_NAME} Healthcare. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim()

    const text = `
Security Alert - Password Changed

Hi ${user.fullName || 'there'},

Your ${APP_NAME} account password was recently changed.

When: ${new Date().toLocaleString()}

Didn't make this change?
If you didn't change your password, your account may be compromised. Please contact our support team immediately at support@smartmed.com

© ${new Date().getFullYear()} ${APP_NAME} Healthcare
    `.trim()

    if (!isEmailEnabled()) {
      console.log(`[EmailService] DEV MODE - Password changed notification for ${user.email}`)
      return true
    }

    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Security Alert: Password Changed - ${APP_NAME}`,
        html,
        text,
      })

      if (error) {
        console.error('[EmailService] Failed to send password changed notification:', error)
        return false
      }

      console.log(`[EmailService] Password changed notification sent to ${user.email}, id: ${data?.id}`)
      return true
    } catch (err) {
      console.error('[EmailService] Error sending password changed notification:', err)
      return false
    }
  }

  /**
   * Send MFA enabled notification
   */
  static async sendMfaEnabledNotification(user: User): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MFA Enabled - ${APP_NAME}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🏥 ${APP_NAME}</h1>
    </div>
    
    <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
      <p style="color: #065f46; font-size: 14px; margin: 0;">
        ✅ <strong>Two-Factor Authentication Enabled</strong>
      </p>
    </div>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      Hi ${user.fullName || 'there'},
    </p>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      Great news! Two-factor authentication (2FA) has been successfully enabled on your ${APP_NAME} account. Your account is now more secure.
    </p>
    
    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      <strong>What this means:</strong>
    </p>
    <ul style="color: #4b5563; line-height: 1.8;">
      <li>You'll need to enter a verification code from your authenticator app when signing in</li>
      <li>Your backup codes can be used if you lose access to your authenticator</li>
      <li>Keep your backup codes in a safe place</li>
    </ul>
    
    <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; border-radius: 6px; margin-top: 20px;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        <strong>Didn't enable 2FA?</strong><br>
        If you didn't make this change, please contact our support team immediately.
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px;">
    <p style="color: #9ca3af; font-size: 12px;">
      © ${new Date().getFullYear()} ${APP_NAME} Healthcare. All rights reserved.
    </p>
  </div>
</body>
</html>
    `.trim()

    if (!isEmailEnabled()) {
      console.log(`[EmailService] DEV MODE - MFA enabled notification for ${user.email}`)
      return true
    }

    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: `Two-Factor Authentication Enabled - ${APP_NAME}`,
        html,
      })

      if (error) {
        console.error('[EmailService] Failed to send MFA enabled notification:', error)
        return false
      }

      console.log(`[EmailService] MFA enabled notification sent to ${user.email}, id: ${data?.id}`)
      return true
    } catch (err) {
      console.error('[EmailService] Error sending MFA enabled notification:', err)
      return false
    }
  }
}

