-- Appointment lifecycle enum updates
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Prevent double-booking on exact start time
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_doctor_datetime_key" ON "appointments"("doctorId", "dateTime");
