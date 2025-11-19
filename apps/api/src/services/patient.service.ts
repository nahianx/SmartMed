import { prisma } from '@smartmed/database'

export async function getPatientProfileByUserId(userId: string) {
  return prisma.patient.findUnique({
    where: { userId },
  })
}

export async function getPreferredDoctors(userId: string) {
  const patient = await prisma.patient.findUnique({ where: { userId } })
  if (!patient) {
    throw Object.assign(new Error('Patient not found'), { status: 404 })
  }

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
  const patient = await prisma.patient.findUnique({ where: { userId } })
  if (!patient) {
    throw Object.assign(new Error('Patient not found'), { status: 404 })
  }

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
  const patient = await prisma.patient.findUnique({ where: { userId } })
  if (!patient) {
    throw Object.assign(new Error('Patient not found'), { status: 404 })
  }

  await prisma.preferredDoctor.deleteMany({
    where: {
      patientId: patient.id,
      doctorId,
    },
  })
}
