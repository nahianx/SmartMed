import { Router } from 'express'
import { z } from 'zod'
import { AuthController } from '../controllers/auth.controller'
import { UserController } from '../controllers/user.controller'
import { OAuthController } from '../controllers/oauth.controller'
import { authenticate } from '../middleware/authenticate'
import { rateLimiter } from '../middleware/rateLimiter'
import { validateBody } from '../middleware/validation'

const router = Router()

const registerSchema = z.object({
  fullName: z.string(),
  email: z.string().email(),
  password: z.string(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const googleSchema = z.object({
  idToken: z.string(),
  role: z.string().optional(),
})

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
})

const passwordResetCompleteSchema = z.object({
  token: z.string(),
  newPassword: z.string(),
})

const resendVerificationSchema = z.object({
  email: z.string().email(),
})

// Registration
router.post(
  '/register/doctor',
  rateLimiter(5, 15 * 60 * 1000),
  validateBody(registerSchema),
  (req, res, next) => AuthController.registerDoctor(req, res).catch(next),
)

router.post(
  '/register/patient',
  rateLimiter(5, 15 * 60 * 1000),
  validateBody(registerSchema),
  (req, res, next) => AuthController.registerPatient(req, res).catch(next),
)

// Login
router.post(
  '/login',
  rateLimiter(5, 15 * 60 * 1000),
  validateBody(loginSchema),
  (req, res, next) => AuthController.login(req, res).catch(next),
)

// Google OAuth login/registration
router.post(
  '/google',
  rateLimiter(10, 15 * 60 * 1000),
  validateBody(googleSchema),
  (req, res, next) => OAuthController.googleAuth(req, res).catch(next),
)

// Token refresh
router.post('/refresh', (req, res, next) => AuthController.refresh(req, res).catch(next))

// Logout
router.post('/logout', (req, res, next) => AuthController.logout(req, res).catch(next))

// Password reset
router.post(
  '/password-reset/request',
  rateLimiter(5, 15 * 60 * 1000),
  validateBody(passwordResetRequestSchema),
  (req, res, next) => AuthController.requestPasswordReset(req, res).catch(next),
)

router.post(
  '/password-reset/verify/:token',
  (req, res, next) => AuthController.verifyPasswordResetToken(req, res).catch(next),
)

router.post(
  '/password-reset/complete',
  validateBody(passwordResetCompleteSchema),
  (req, res, next) => AuthController.completePasswordReset(req, res).catch(next),
)

// Email verification
router.post(
  '/verify-email/:token',
  (req, res, next) => AuthController.verifyEmail(req, res).catch(next),
)

// Resend verification email
router.post(
  '/resend-verification',
  rateLimiter(3, 15 * 60 * 1000), // Only 3 attempts per 15 minutes
  validateBody(resendVerificationSchema),
  (req, res, next) => AuthController.resendVerificationEmail(req, res).catch(next),
)

// Current user
router.get('/me', authenticate, (req, res, next) => UserController.me(req, res).catch(next))

// Check email
router.get('/check-email', (req, res, next) => UserController.checkEmail(req, res).catch(next))

// Change password
router.post('/change-password', authenticate, (req, res, next) => UserController.changePassword(req, res).catch(next))

export default router
