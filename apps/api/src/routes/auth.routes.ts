import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma, UserRole } from '@smartmed/database'
import { User } from '@smartmed/types'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function signToken(user: User) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  })
}

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string
      password?: string
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken(user as unknown as User)
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Login failed' })
  }
})

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body as {
      email?: string
      password?: string
      role?: UserRole
    }

    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ error: 'Email, password, and role are required' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    const hashed = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role,
      },
    })

    // Seed role-specific record
    if (role === UserRole.PATIENT) {
      await prisma.patient.create({
        data: {
          userId: user.id,
          firstName: '',
          lastName: '',
          dateOfBirth: new Date('1970-01-01'),
          gender: 'OTHER',
          phoneNumber: '',
          address: '',
          allergies: [],
        },
      })
    } else if (role === UserRole.DOCTOR) {
      await prisma.doctor.create({
        data: {
          userId: user.id,
          firstName: '',
          lastName: '',
          specialization: '',
          qualification: '',
          experience: 0,
          phoneNumber: '',
          licenseNumber: `${user.id}-LICENSE`,
          consultationFee: 0,
          availableDays: [],
          availableTimeSlots: [],
        },
      })
    }

    const token = signToken(user as unknown as User)

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' })
  }
})

export default router
