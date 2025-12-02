import { User } from '@smartmed/database'

const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@smartmed.local'

export class EmailService {
  static async sendVerificationEmail(user: User, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const link = `${frontendUrl}/auth/verify-email/${token}`
    // TODO: Integrate real email provider here
    // eslint-disable-next-line no-console
    console.log(`Send verification email to ${user.email} from ${EMAIL_FROM}: ${link}`)
  }

  static async sendPasswordResetEmail(user: User, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const link = `${frontendUrl}/auth/reset-password/${token}`
    // TODO: Integrate real email provider here
    // eslint-disable-next-line no-console
    console.log(`Send password reset email to ${user.email} from ${EMAIL_FROM}: ${link}`)
  }
}
