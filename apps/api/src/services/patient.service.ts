import { prisma, UserRole, Prisma } from '@smartmed/database'

export async function getOrCreatePatient(userId: string) {
  const existing = await prisma.patient.findUnique({ where: { userId } })
  if (existing) return existing

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    const error: any = new Error('User not found')
    error.status = 404
    throw error
  }

  // Only auto-provision for patient users
  if (user.role !== UserRole.PATIENT) {
    const error: any = new Error('Patient not found')
    error.status = 404
    throw error
  }

  const [firstName, ...rest] = (user.fullName || 'Patient Unknown').split(' ')
  const lastName = rest.join(' ') || 'Unknown'

  return prisma.patient.create({
    data: {
      userId,
      firstName,
      lastName,
      dateOfBirth: new Date('1990-01-01'),
      gender: 'OTHER',
      phoneNumber: user.phoneNumber || 'N/A',
      address: user.addressLine1 || 'Not provided',
      emergencyContact: null,
      bloodGroup: null,
      allergies: Prisma.DbNull,
      medicalHistory: null,
    },
  })
}

export async function getPatientProfileByUserId(userId: string) {
  return getOrCreatePatient(userId)
}

export async function getPreferredDoctors(userId: string) {
  const patient = await getOrCreatePatient(userId)

  const preferred = await prisma.preferredDoctor.findMany({
    where: { patientId: patient.id },
    include: {
      doctor: {
        include: {
          clinic: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return preferred
}

const MAX_PREFERRED_DOCTORS = 20

export async function addPreferredDoctor(userId: string, doctorId: string) {
  const patient = await getOrCreatePatient(userId)

  const currentCount = await prisma.preferredDoctor.count({
    where: { patientId: patient.id },
  })

  if (currentCount >= MAX_PREFERRED_DOCTORS) {
    const error: any = new Error('Preferred doctors limit reached')
    error.status = 400
    throw error
  }

  await prisma.preferredDoctor.upsert({
    where: {
      patientId_doctorId: {
        patientId: patient.id,
        doctorId,
      },
    },
    update: {},
    create: {
      patientId: patient.id,
      doctorId,
    },
  })
}

export async function removePreferredDoctor(userId: string, doctorId: string) {
  const patient = await getOrCreatePatient(userId)

  await prisma.preferredDoctor.deleteMany({
    where: {
      patientId: patient.id,
      doctorId,
    },
  })
}
