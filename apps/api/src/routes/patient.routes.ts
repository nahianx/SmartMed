import { Router, Response } from 'express'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest } from '../types/auth'

const router = Router()

// List patients (simple paginated list, mainly for admin tools)
router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const patients = await prisma.patient.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ patients })
  } catch (error) {
    console.error('Error fetching patients', error)
    res.status(500).json({ error: 'Failed to fetch patients' })
  }
})

// Get current patient for authenticated PATIENT user
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.user.role !== 'PATIENT') {
      return res.status(403).json({ error: 'Only patients have a /me resource' })
    }

    const patient = await prisma.patient.findFirst({ where: { userId: req.user.id } })

    if (!patient) {
      return res.status(404).json({ error: 'Patient profile not found for current user' })
    }

    res.json({ patient })
  } catch (error) {
    console.error('Error fetching current patient', error)
    res.status(500).json({ error: 'Failed to fetch current patient' })
  }
})

// Get patient by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const patient = await prisma.patient.findUnique({ where: { id } })
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    res.json({ patient })
  } catch (error) {
    console.error('Error fetching patient', error)
    res.status(500).json({ error: 'Failed to fetch patient' })
  }
})

export default router
