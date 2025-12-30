# 📧 SmartMed Email Notification System

## Overview

This document describes the email notification system implementation for SmartMed's appointment booking management.

## Features

- ✅ **Booking Confirmation Emails** - Sent to patients when appointments are created
- ✅ **Booking Update Emails** - Sent when appointments are rescheduled or modified
- ✅ **Cancellation Emails** - Sent when appointments are cancelled
- ✅ **Reminder Emails** - Automated 24-hour and 1-hour reminders
- ✅ **Doctor Notifications** - Notify doctors of new bookings
- ✅ **Calendar Integration** - .ics file attachments
- ✅ **Google Calendar Links** - "Add to Google Calendar" buttons
- ✅ **Outlook Calendar Links** - "Add to Outlook" buttons

## Technology Stack

| Component | Technology | Cost |
|-----------|------------|------|
| Email Provider | [Resend](https://resend.com) | Free (3,000/month) |
| Calendar Files | [ical-generator](https://www.npmjs.com/package/ical-generator) | Free |
| Scheduling | Node.js setInterval | Free |

## Quick Start

### 1. Install Dependencies

```bash
cd apps/api
npm install resend ical-generator
```

### 2. Configure Environment Variables

Copy the example configuration:
```bash
cp .env.email.example .env
```

Edit `.env` and add your Resend API key:
```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=SmartMed <onboarding@resend.dev>
FRONTEND_URL=http://localhost:3000
```

### 3. Get Your Resend API Key

1. Go to [resend.com](https://resend.com) and create a free account
2. Navigate to **API Keys** in the dashboard
3. Create a new API key
4. Copy the key to your `.env` file

### 4. Test Email Sending

```bash
# Using the test endpoint
curl -X POST http://localhost:4000/api/admin/email/test \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

## API Endpoints

### Calendar Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/appointments/:id/calendar` | GET | Get calendar links (Google, Outlook, ICS) |
| `/api/appointments/:id/calendar.ics` | GET | Download .ics calendar file |

### Email Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/email/stats` | GET | Get email sending statistics |
| `/api/admin/email/logs` | GET | Get recent email logs |
| `/api/admin/email/test` | POST | Send a test email |

## Integration Guide

### Sending Booking Confirmation

```typescript
import { sendBookingConfirmationEmails } from './services/appointment-email.service'

// After creating an appointment
const appointment = await prisma.appointment.create({ ... })

// Send confirmation emails
const result = await sendBookingConfirmationEmails(appointment.id)
console.log('Patient email:', result.patientEmail)
console.log('Doctor email:', result.doctorEmail)
```

### Sending Booking Update

```typescript
import { sendBookingUpdateEmails } from './services/appointment-email.service'

// After updating an appointment
const result = await sendBookingUpdateEmails(
  appointmentId,
  'rescheduled',  // or 'status_changed', 'modified'
  previousDateTime // optional
)
```

### Sending Cancellation

```typescript
import { sendBookingCancellationEmails } from './services/appointment-email.service'

// After cancelling an appointment
const result = await sendBookingCancellationEmails(
  appointmentId,
  'patient',  // or 'doctor', 'system'
  'Personal reasons' // optional cancellation reason
)
```

### Getting Calendar Links

```typescript
import { getAppointmentCalendarLinks } from './services/appointment-email.service'

const links = await getAppointmentCalendarLinks(appointmentId)
// Returns:
// {
//   googleCalendar: 'https://calendar.google.com/...',
//   outlookCalendar: 'https://outlook.live.com/...',
//   icsDownload: '/api/appointments/:id/calendar.ics'
// }
```

## Email Templates

All email templates include:

1. **Responsive HTML design** - Works on desktop and mobile
2. **Appointment details card** - Date, time, doctor, reason
3. **Calendar buttons** - Google Calendar and Outlook
4. **.ics attachment** - For other calendar apps
5. **Action links** - View details, reschedule, etc.

### Template Customization

Edit the templates in `apps/api/src/services/email-notification.service.ts`:

- `getBaseEmailStyles()` - CSS styles
- `getAppointmentDetailsHTML()` - Appointment info card
- Individual `send*Email()` functions - Full templates

## Reminder Scheduler

The reminder scheduler runs automatically and sends emails at:
- **24 hours** before the appointment
- **1 hour** before the appointment

### Starting the Scheduler

The scheduler starts automatically with the API server. To start manually:

```typescript
import { startReminderScheduler } from './scheduler/email_reminder_scheduler'

startReminderScheduler()
```

### Scheduler Configuration

- **Scan interval**: Every 5 minutes
- **Reminder windows**: 24h and 1h before appointment
- **Duplicate prevention**: Uses database upsert

## Free Tier Limits

### Resend Free Tier

| Limit | Value | Notes |
|-------|-------|-------|
| Daily | 100 emails | Resets at midnight UTC |
| Monthly | 3,000 emails | Sufficient for most university projects |

### Rate Limiting

The system includes built-in rate limiting:
- 1 email per second maximum
- Automatic tracking of daily/monthly usage
- Warning logs when approaching limits

### Monitoring Usage

```typescript
import { getEmailQueueStats } from './services/email-queue.service'

const stats = getEmailQueueStats()
console.log(`Today: ${stats.todaySent}/${stats.dailyLimit}`)
console.log(`Month: ${stats.monthSent}/${stats.monthlyLimit}`)
```

## Development Mode

When `RESEND_API_KEY` is not set or `NODE_ENV=test`:
- Emails are **logged to console** instead of sent
- All functions return success
- No API calls are made
- Useful for testing without consuming quota

Example log output:
```
[EMAIL-DEV] Booking confirmation would be sent to: patient@example.com
[EMAIL-DEV] Subject: Appointment Confirmed - Dr. Smith
```

## Testing

### Testing Without API Key

All email functions work without an API key configured. They will log the email details instead of sending.

### Testing With API Key

1. Use the test endpoint: `POST /api/admin/email/test`
2. Check the Resend dashboard for delivery status
3. Monitor logs for any errors

### Unit Testing

```typescript
// Mock the email service for tests
jest.mock('./services/email-notification.service', () => ({
  sendBookingConfirmationEmail: jest.fn().mockResolvedValue({ 
    success: true, 
    messageId: 'test-123' 
  }),
  // ... other mocks
}))
```

## Troubleshooting

### Common Issues

1. **"Rate limit reached"** - Wait until the next day/month
2. **"Invalid API key"** - Check your RESEND_API_KEY
3. **"Domain not verified"** - Use `onboarding@resend.dev` for testing
4. **Emails not arriving** - Check spam folder, verify recipient email

### Debug Logging

Enable verbose logging:
```env
EMAIL_DEBUG=true
```

### Checking Email Status

```bash
curl http://localhost:4000/api/admin/email/stats
```

## Production Considerations

### Domain Verification

For production, verify your domain with Resend:
1. Add DNS records (SPF, DKIM)
2. Update `EMAIL_FROM` to use your domain
3. Test delivery to various providers

### Scaling Beyond Free Tier

If you exceed 3,000 emails/month:
- Resend paid plans start at $20/month
- Consider batching non-urgent emails
- Implement email preference opt-out

### Security

- Never commit API keys to git
- Use environment variables
- Implement proper authentication on admin endpoints
- Log email sends for audit purposes

## File Structure

```
apps/api/src/
├── services/
│   ├── email-notification.service.ts  # Main email sending logic
│   ├── email-queue.service.ts         # Rate limiting & tracking
│   └── appointment-email.service.ts   # Integration helpers
├── scheduler/
│   └── email_reminder_scheduler.ts    # Automated reminders
└── routes/
    └── calendar.routes.ts             # Calendar & admin endpoints
```

## Resources

- [Resend Documentation](https://resend.com/docs)
- [ical-generator Documentation](https://sebbo2002.github.io/ical-generator/)
- [Google Calendar URL Parameters](https://github.com/nicoschmitt/gcalurl)
- [iCalendar Specification (RFC 5545)](https://tools.ietf.org/html/rfc5545)
