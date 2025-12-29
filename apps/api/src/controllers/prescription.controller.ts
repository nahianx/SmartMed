import { Response } from 'express'
import nodemailer from 'nodemailer'
import { prisma } from '@smartmed/database'
import { AuthenticatedRequest } from '../types/auth'
import * as prescriptionService from '../services/prescription.service'
import { getOrCreateDoctor } from '../services/doctor.service'

export class PrescriptionController {
  private static async sendPrescriptionEmail(
    patientEmail: string,
    prescriptionId: string
  ) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.USER_EMAIL || 'woam naki jzkj bvsh',
          pass: process.env.APP_PASSWORD || 'haquesptfy@gmail.com',
        },
      })

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const link = `${frontendUrl}/dashboard/patient/prescriptions/${prescriptionId}`

      await transporter.sendMail({
        from: `"SmartMed" <${process.env.USER_EMAIL}>`,
        to: patientEmail,
        subject: 'New Prescription Issued - SmartMed',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #2c3e50;">New Prescription Available</h2>
            <p style="color: #555;">Hello,</p>
            <p style="color: #555;">Your doctor has issued a new prescription for you.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${link}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Prescription</a>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${link}" style="color: #007bff;">${link}</a>
            </p>
          </div>
        `,
      })

      // eslint-disable-next-line no-console
      console.log(`Prescription email sent successfully to ${patientEmail}`)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending prescription email:', error)
    }
  }

  static async createPrescription(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'DOCTOR') {
        return res
          .status(403)
          .json({ error: 'Only doctors can create prescriptions' })
      }

      const doctor = await getOrCreateDoctor(req.user.id)
      const prescription = await prescriptionService.createPrescription(
        req.body,
        doctor.id,
        req
      )

      try {
        const patient = await prisma.patient.findUnique({
          where: { id: prescription.patientId },
          include: { user: true },
        })

        if (patient && patient.user && patient.user.email) {
          await PrescriptionController.sendPrescriptionEmail(
            patient.user.email,
            prescription.id
          )
        }
      } catch (emailError) {
        res
          .status(500)
          .json({ error: 'Failed to fetch patient information for email' })
        return
      }

      res.status(201).json(prescription)
    } catch (error) {
      const err = error as Error & { status?: number }
      res
        .status(err.status || 500)
        .json({ error: err.message || 'Failed to create prescription' })
    }
  }

  static async updatePrescription(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'DOCTOR') {
        return res
          .status(403)
          .json({ error: 'Only doctors can update prescriptions' })
      }

      const doctor = await getOrCreateDoctor(req.user.id)
      const prescription = await prescriptionService.updatePrescription(
        req.params.id,
        req.body,
        doctor.id,
        req
      )

      res.json(prescription)
    } catch (error) {
      const err = error as Error & { status?: number }
      res
        .status(err.status || 500)
        .json({ error: err.message || 'Failed to update prescription' })
    }
  }

  static async getPrescriptionById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const prescription = await prescriptionService.getPrescriptionById(
        req.params.id,
        req.user.id,
        req.user.role
      )

      res.json(prescription)
    } catch (error) {
      const err = error as Error & { status?: number }
      res
        .status(err.status || 500)
        .json({ error: err.message || 'Failed to fetch prescription' })
    }
  }

  static async getPrescriptionsByPatient(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const patientId = req.params.patientId
      const offset = parseInt(req.query.offset as string) || 0
      const limit = parseInt(req.query.limit as string) || 20

      const result = await prescriptionService.getPrescriptionsByPatient(
        patientId,
        req.user.id,
        req.user.role,
        offset,
        limit
      )

      res.json(result)
    } catch (error) {
      const err = error as Error & { status?: number }
      res
        .status(err.status || 500)
        .json({ error: err.message || 'Failed to fetch prescriptions' })
    }
  }

  static async getPrescriptionsByDoctor(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const doctorId = req.params.doctorId
      const offset = parseInt(req.query.offset as string) || 0
      const limit = parseInt(req.query.limit as string) || 20

      const result = await prescriptionService.getPrescriptionsByDoctor(
        doctorId,
        req.user.id,
        req.user.role,
        offset,
        limit
      )

      res.json(result)
    } catch (error) {
      const err = error as Error & { status?: number }
      res
        .status(err.status || 500)
        .json({ error: err.message || 'Failed to fetch prescriptions' })
    }
  }
}
