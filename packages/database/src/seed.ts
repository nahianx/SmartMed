import { prisma, UserRole, AppointmentStatus } from '.'

async function main() {
  // Upsert a sample patient user
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@example.com' },
    update: {},
    create: {
      email: 'patient@example.com',
      passwordHash: 'hashed-password', // replace with real hash in production
      role: UserRole.PATIENT,
    },
  })

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@example.com' },
    update: {},
    create: {
      email: 'doctor@example.com',
      passwordHash: 'hashed-password',
      role: UserRole.DOCTOR,
    },
  })

  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: {
      userId: patientUser.id,
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'FEMALE',
      phoneNumber: '+10000000000',
      address: '123 Main St',
      allergies: JSON.stringify([]),
    },
  })

  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      firstName: 'Sarah',
      lastName: 'Chen',
      specialization: 'Cardiology',
      qualification: 'MD',
      experience: 10,
      phoneNumber: '+19999999999',
      licenseNumber: 'LIC-12345',
      consultationFee: 150,
      availableDays: JSON.stringify(['MONDAY', 'WEDNESDAY']),
      availableTimeSlots: JSON.stringify({ slots: ['10:00', '11:00'] }),
    },
  })

  // Past completed appointment for timeline
  const pastAppointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      dateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      duration: 30,
      status: AppointmentStatus.COMPLETED,
      reason: 'Follow-up consultation',
      notes: 'Patient reported improvement in symptoms.',
    },
  })

  // Future scheduled appointment for reminder tests
  const futureAppointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // ~25h in future
      duration: 30,
      status: AppointmentStatus.SCHEDULED,
      reason: 'Routine check-up',
      notes: 'Annual physical exam.',
    },
  })

  // Prescription linked to past appointment
  const prescription = await prisma.prescription.create({
    data: {
      appointmentId: pastAppointment.id,
      patientId: patient.id,
      doctorId: doctor.id,
      diagnosis: 'Hypertension',
      medications: JSON.stringify([
        {
          name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Once daily',
          duration: '90 days',
        },
      ]),
      notes: 'Monitor blood pressure daily.',
    },
  })

  // Report metadata (file upload will replace fileKey later in real flow)
  const report = await prisma.report.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentId: pastAppointment.id,
      fileKey: 'reports/sample/Blood_Panel_Results_Oct2025.pdf',
      fileName: 'Blood_Panel_Results_Oct2025.pdf',
      fileSize: 1024 * 1024,
      mimeType: 'application/pdf',
      notes: 'All values within normal range.',
    },
  })

  // Activities to populate initial timeline
  await prisma.activity.createMany({
    data: [
      {
        type: 'APPOINTMENT',
        occurredAt: pastAppointment.dateTime,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: pastAppointment.id,
        title: 'Visit with Dr. Sarah Chen, Cardiology',
        subtitle: 'Follow-up consultation',
        tags: JSON.stringify(['Follow-up']),
        status: AppointmentStatus.COMPLETED,
        notes: pastAppointment.notes,
        vitals: JSON.stringify({
          bloodPressure: '120/80',
          heartRate: '72 bpm',
          temperature: '98.6°F',
          weight: '165 lbs',
        }),
      },
      {
        type: 'PRESCRIPTION',
        occurredAt: prescription.createdAt,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: pastAppointment.id,
        prescriptionId: prescription.id,
        title: 'Rx by Dr. Sarah Chen',
        subtitle: 'Cardiology prescription',
        tags: JSON.stringify([]),
        notes: prescription.notes,
      },
      {
        type: 'REPORT',
        occurredAt: report.uploadedAt,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: pastAppointment.id,
        reportId: report.id,
        title: 'Blood Panel Results.pdf uploaded',
        subtitle: 'Lab Report',
        tags: JSON.stringify([]),
        notes: report.notes,
      },
    ],
  })

  console.log('✅ Database seeded with sample SmartMed activity data')
}

main()
  .catch((err) => {
    console.error('❌ Error while seeding database', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })