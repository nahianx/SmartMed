import { Router } from 'express'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/roleCheck'
import { UserRole } from '@smartmed/database'
import { DashboardController } from '../controllers/dashboard.controller'

const router = Router()

router.get(
  '/doctor',
  authenticate,
  requireRole(UserRole.DOCTOR),
  (req, res, next) => DashboardController.doctorDashboard(req, res).catch(next),
)

router.get(
  '/patient',
  authenticate,
  requireRole(UserRole.PATIENT),
  (req, res, next) => DashboardController.patientDashboard(req, res).catch(next),
)

export default router
