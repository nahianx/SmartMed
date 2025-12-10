import { prisma } from '@smartmed/database'
import { UserRole } from '@smartmed/types'
import bcrypt from 'bcryptjs'
import { getOrCreatePatient } from './patient.service'

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctor: {
        include: {
          clinic: true,
        },
      },
      patient: true,
    },
  })

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 })
  }

  const base = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    city: user.city,
    region: user.region,
    postalCode: user.postalCode,
    country: user.country,
    profilePhotoUrl: user.profilePhotoUrl,
    isMfaEnabled: user.isMfaEnabled,
  }

  if (user.role === UserRole.DOCTOR && user.doctor) {
    return {
      ...base,
      doctor: {
        id: user.doctor.id,
        firstName: user.doctor.firstName,
        lastName: user.doctor.lastName,
        specialization: user.doctor.specialization,
        qualification: user.doctor.qualification,
        experience: user.doctor.experience,
        phoneNumber: user.doctor.phoneNumber,
        licenseNumber: user.doctor.licenseNumber,
        consultationFee: user.doctor.consultationFee,
        clinic: user.doctor.clinic ?? null,
      },
    }
  }

  if (user.role === UserRole.PATIENT) {
    const patientRecord = user.patient ?? (await getOrCreatePatient(user.id))
    return {
      ...base,
      patient: {
        id: patientRecord.id,
        firstName: patientRecord.firstName,
        lastName: patientRecord.lastName,
        emergencyContact: patientRecord.emergencyContact,
        bloodGroup: patientRecord.bloodGroup,
        allergies: patientRecord.allergies,
        medicalHistory: patientRecord.medicalHistory,
      },
    }
  }

  return base
}

interface ProfileUpdateInput {
  fullName: string
  phoneNumber: string
  dateOfBirth?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  addressLine1?: string
  addressLine2?: string
  city?: string
  region?: string
  postalCode?: string
  country?: string
}

export async function updateProfile(userId: string, data: ProfileUpdateInput) {
  const dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : undefined

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      dateOfBirth,
      gender: data.gender,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      region: data.region,
      postalCode: data.postalCode,
      country: data.country,
    },
  })

  return updated
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 })
  }

  if (!user.passwordHash) {
    const error: any = new Error('Cannot change password for OAuth account')
    error.status = 400
    throw error
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    const error: any = new Error('Current password is incorrect')
    error.status = 400
    throw error
  }

  const hashed = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashed },
  })
}

export async function setMfaEnabled(userId: string, enabled: boolean) {
  await prisma.user.update({
    where: { id: userId },
    data: { isMfaEnabled: enabled },
  })
}
