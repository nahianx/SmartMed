-- Queue system tables, enums, and doctor status fields

-- CreateEnum
CREATE TYPE "QueueType" AS ENUM ('WALK_IN', 'ONLINE_BOOKING');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "DoctorAvailabilityStatus" AS ENUM ('AVAILABLE', 'BUSY', 'BREAK', 'OFF_DUTY');

-- Extend AuditAction enum with queue-related actions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUEUE_ENTRY_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUEUE_ENTRY_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUEUE_ENTRY_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUEUE_ENTRY_REORDERED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUEUE_CALLED_NEXT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUEUE_CHECK_IN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCTOR_STATUS_CHANGED';

-- Alter doctors table with queue status fields
ALTER TABLE "doctors"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "availabilityStatus" "DoctorAvailabilityStatus" NOT NULL DEFAULT 'OFF_DUTY',
  ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "currentPatientId" TEXT,
  ADD COLUMN "currentQueueEntryId" TEXT,
  ADD COLUMN "lastStatusChange" TIMESTAMP(3),
  ADD COLUMN "averageConsultationTime" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "todayServed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "todayNoShows" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalServed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "allowWalkIns" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowOnlineBooking" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "autoCallNext" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "noShowTimeout" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "statsDate" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "queue_entries" (
  "id" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "queueType" "QueueType" NOT NULL,
  "status" "QueueStatus" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 2,
  "position" INTEGER NOT NULL,
  "estimatedWaitTime" INTEGER,
  "checkInTime" TIMESTAMP(3) NOT NULL,
  "scheduledTime" TIMESTAMP(3),
  "calledTime" TIMESTAMP(3),
  "startTime" TIMESTAMP(3),
  "completedTime" TIMESTAMP(3),
  "notes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_counters" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "queueDate" TEXT NOT NULL,
  "nextSerial" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "queue_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "queue_entries_serialNumber_key" ON "queue_entries"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "queue_entries_appointmentId_key" ON "queue_entries"("appointmentId");

-- CreateIndex
CREATE INDEX "queue_entries_doctorId_status_position_idx" ON "queue_entries"("doctorId", "status", "position");

-- CreateIndex
CREATE INDEX "queue_entries_patientId_status_idx" ON "queue_entries"("patientId", "status");

-- CreateIndex
CREATE INDEX "queue_entries_createdAt_idx" ON "queue_entries"("createdAt");

-- CreateIndex
CREATE INDEX "queue_entries_doctorId_createdAt_idx" ON "queue_entries"("doctorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "unique_queue_counter" ON "queue_counters"("doctorId", "queueDate");

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_counters" ADD CONSTRAINT "queue_counters_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
