import { prisma } from '@smartmed/database'
import { DoctorAvailability } from '@smartmed/types'

export async function getDoctorProfileByUserId(userId: string) {
  return prisma.doctor.findUnique({
    where: { userId },
    include: {
      clinic: true,
      specializations: {
        include: { specialization: true },
      },
    },
  })
}

export async function updateDoctorSpecializations(
  userId: string,
  names: string[],
) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) {
    throw Object.assign(new Error('Doctor not found'), { status: 404 })
  }

  const specs = await Promise.all(
    names.map((name) =>
      prisma.specialization.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  )

  // Remove existing links and recreate
  await prisma.doctorSpecialization.deleteMany({
    where: { doctorId: doctor.id },
  })

  await prisma.doctorSpecialization.createMany({
    data: specs.map((s) => ({ doctorId: doctor.id, specializationId: s.id })),
    skipDuplicates: true,
  })

  return getDoctorProfileByUserId(userId)
}

interface ClinicInput {
  name: string
  address: string
  phone: string
  consultationFee: number
}

export async function upsertClinicForDoctor(userId: string, data: ClinicInput) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) {
    throw Object.assign(new Error('Doctor not found'), { status: 404 })
  }

  const clinic = await prisma.clinic.upsert({
    where: { id: doctor.clinicId ?? '' },
    update: {
      name: data.name,
      address: data.address,
      phone: data.phone,
      consultationFee: data.consultationFee,
    },
    create: {
      name: data.name,
      address: data.address,
      phone: data.phone,
      consultationFee: data.consultationFee,
    },
  })

  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { clinicId: clinic.id },
  })

  return clinic
}

export async function getAvailability(userId: string) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) {
    throw Object.assign(new Error('Doctor not found'), { status: 404 })
  }

  const slots = await prisma.doctorAvailability.findMany({
    where: { doctorId: doctor.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })

  return slots
}

export async function setAvailability(
  userId: string,
  slots: Omit<DoctorAvailability, 'id' | 'doctorId' | 'createdAt' | 'updatedAt'>[],
) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) {
    throw Object.assign(new Error('Doctor not found'), { status: 404 })
  }

  // Basic conflict detection: ensure no overlapping slots per day
  const byDay: Record<number, { start: string; end: string }[]> = {}
  for (const slot of slots) {
    const list = (byDay[slot.dayOfWeek] ||= [])
    for (const existing of list) {
      if (!(slot.endTime <= existing.start || slot.startTime >= existing.end)) {
        const error: any = new Error('Overlapping availability slots detected')
        error.status = 400
        throw error
      }
    }
    list.push({ start: slot.startTime, end: slot.endTime })

    if (slot.hasBreak && slot.breakStart && slot.breakEnd) {
      if (!(slot.startTime <= slot.breakStart && slot.breakEnd <= slot.endTime)) {
        const error: any = new Error('Break must be within slot time range')
        error.status = 400
        throw error
      }
    }
  }

  await prisma.doctorAvailability.deleteMany({ where: { doctorId: doctor.id } })

  await prisma.doctorAvailability.createMany({
    data: slots.map((slot) => ({
      doctorId: doctor.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      hasBreak: slot.hasBreak ?? false,
      breakStart: slot.breakStart,
      breakEnd: slot.breakEnd,
      isAvailable: slot.isAvailable,
    })),
  })

  return getAvailability(userId)
}

export async function removeAvailabilitySlot(userId: string, slotId: string) {
  const doctor = await prisma.doctor.findUnique({ where: { userId } })
  if (!doctor) {
    throw Object.assign(new Error('Doctor not found'), { status: 404 })
  }

  const slot = await prisma.doctorAvailability.findUnique({
    where: { id: slotId },
  })

  if (!slot || slot.doctorId !== doctor.id) {
    throw Object.assign(new Error('Slot not found'), { status: 404 })
  }

  await prisma.doctorAvailability.delete({ where: { id: slotId } })
}

export async function searchDoctors(query: string) {
  if (!query.trim()) {
    return []
  }

  const doctors = await prisma.doctor.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { specialization: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      clinic: true,
    },
    take: 20,
  })

  return doctors
}
