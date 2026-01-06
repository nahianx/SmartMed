import { Request, Response } from 'express'
import { prisma } from '@smartmed/database'
import bcrypt from 'bcryptjs'
import { ValidationService } from '../services/validation.service'
import { TokenService } from '../services/token.service'

export class UserController {
  static async me(req: Request, res: Response) {
    const userId = (req as any).user.id as string
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
      profilePhotoUrl: user.profilePhotoUrl,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      city: user.city,
      region: user.region,
      postalCode: user.postalCode,
      country: user.country,
    })
  }

  static async checkEmail(req: Request, res: Response) {
    const { email } = req.query
    if (typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' })
    }
    ValidationService.validateEmail(email)

    const existing = await prisma.user.findUnique({ where: { email } })
    res.json({ exists: !!existing })
  }

  static async changePassword(req: Request, res: Response) {
    const userId = (req as any).user.id as string
    const { currentPassword, newPassword } = req.body

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'Cannot change password' })
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }

    ValidationService.validatePassword(newPassword)

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    await TokenService.revokeAllUserTokens(userId)

    res.json({ success: true })
  }
}
