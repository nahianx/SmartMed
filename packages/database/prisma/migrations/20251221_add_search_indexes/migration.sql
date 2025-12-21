-- Enable trigram extension for case-insensitive search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Doctor search indexes
CREATE INDEX IF NOT EXISTS idx_doctors_first_name ON "doctors"("firstName");
CREATE INDEX IF NOT EXISTS idx_doctors_last_name ON "doctors"("lastName");
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON "doctors"(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic ON "doctors"("clinicId");
CREATE INDEX IF NOT EXISTS idx_doctors_fullname_trgm ON "doctors" USING gin (lower("firstName" || ' ' || "lastName") gin_trgm_ops);

-- Appointment search indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON "appointments"("patientId");
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON "appointments"("doctorId");
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON "appointments"("dateTime");
CREATE INDEX IF NOT EXISTS idx_appointments_status ON "appointments"(status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_datetime_status ON "appointments"("doctorId", "dateTime", status);
