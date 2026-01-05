import { Router } from 'express'
import { PatientContextController } from '../controllers/patientContext.controller'
import { authenticate } from '../middleware/authenticate'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Get current patient being served (for doctors)
router.get('/current-patient', (req, res, next) =>
  PatientContextController.getCurrentPatientContext(req, res).catch(next)
)

// Get full patient context
router.get('/patient/:patientId/context', (req, res, next) =>
  PatientContextController.getPatientContext(req, res).catch(next)
)

// Get quick patient summary
router.get('/patient/:patientId/summary', (req, res, next) =>
  PatientContextController.getPatientSummary(req, res).catch(next)
)

// Get patient allergies
router.get('/patient/:patientId/allergies', (req, res, next) =>
  PatientContextController.getPatientAllergies(req, res).catch(next)
)

// Get patient's active medications
router.get('/patient/:patientId/medications', (req, res, next) =>
  PatientContextController.getActiveMedications(req, res).catch(next)
)

export default router
