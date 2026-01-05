import { Router } from 'express'
import { z } from 'zod'
import { MfaController } from '../controllers/mfa.controller'
import { authenticate } from '../middleware/authenticate'
import { validateBody } from '../middleware/validation'
import { rateLimiter } from '../middleware/rateLimiter'

const router = Router()

// Validation schemas
const verifyCodeSchema = z.object({
  code: z.string().min(6).max(8)
})

const verifyLoginCodeSchema = z.object({
  code: z.string().min(6).max(8),
  userId: z.string().uuid()
})

const passwordSchema = z.object({
  password: z.string().min(1)
})

// Rate limiter for MFA verification (prevent brute force)
const mfaRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: 'Too many MFA verification attempts. Please try again later.'
})

// Protected routes (require authentication)
router.post(
  '/setup',
  authenticate,
  (req, res, next) => MfaController.initiateSetup(req, res).catch(next)
)

router.post(
  '/verify-setup',
  authenticate,
  validateBody(verifyCodeSchema),
  mfaRateLimiter,
  (req, res, next) => MfaController.verifySetup(req, res).catch(next)
)

router.post(
  '/disable',
  authenticate,
  validateBody(passwordSchema),
  (req, res, next) => MfaController.disable(req, res).catch(next)
)

router.post(
  '/regenerate-backup-codes',
  authenticate,
  validateBody(passwordSchema),
  (req, res, next) => MfaController.regenerateBackupCodes(req, res).catch(next)
)

router.get(
  '/status',
  authenticate,
  (req, res, next) => MfaController.getStatus(req, res).catch(next)
)

// Public route for MFA verification during login
// (used after primary auth succeeds but before full session is granted)
router.post(
  '/verify',
  validateBody(verifyLoginCodeSchema),
  mfaRateLimiter,
  (req, res, next) => MfaController.verifyCode(req, res).catch(next)
)

export default router
