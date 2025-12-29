import { Router } from 'express'
import { PrescriptionController } from '../controllers/prescription.controller'
import { validateSchema } from '../middleware/validation'
import {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  prescriptionIdSchema,
  prescriptionQuerySchema,
} from '../schemas/prescription.schemas'
import { authenticate } from '../middleware/authenticate'
import { requireRole } from '../middleware/roleCheck'
import { UserRole } from '@smartmed/database'

const router = Router()

router.use(authenticate)

router.post(
  '/',
  requireRole(UserRole.DOCTOR),
  validateSchema({ body: createPrescriptionSchema }),
  PrescriptionController.createPrescription
)

router.patch(
  '/:id',
  requireRole(UserRole.DOCTOR),
  validateSchema({
    params: prescriptionIdSchema,
    body: updatePrescriptionSchema,
  }),
  PrescriptionController.updatePrescription
)

router.get(
  '/:id',
  validateSchema({ params: prescriptionIdSchema }),
  PrescriptionController.getPrescriptionById
)

router.get(
  '/patient/:patientId',
  validateSchema({ query: prescriptionQuerySchema }),
  PrescriptionController.getPrescriptionsByPatient
)

router.get(
  '/doctor/:doctorId',
  validateSchema({ query: prescriptionQuerySchema }),
  PrescriptionController.getPrescriptionsByDoctor
)

export default router
