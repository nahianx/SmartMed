import { Router, Request, Response } from 'express'
import { prisma } from '@smartmed/database'
import bcrypt from 'bcryptjs'
import { registerSchema } from '../schemas/auth.schemas'
import { ZodError } from 'zod'

const router = Router()

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    // TODO: Implement authentication logic
    res.json({
      message: 'Login endpoint',
      user: { email },
    })
  } catch (error) {
    res.status(500).json({ error: 'Login failed' })
  }
})

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body)
    const { email, password, role } = validatedData

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists' 
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    res.status(201).json({
      message: 'User registered successfully',
      user
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      })
    }
    
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

export default router
