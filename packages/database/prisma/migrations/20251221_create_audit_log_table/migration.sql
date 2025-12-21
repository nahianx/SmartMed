-- Create enum type for audit actions
DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM (
    'LOGIN',
    'LOGOUT',
    'TOKEN_REFRESH',
    'FAILED_LOGIN',
    'PATIENT_HISTORY_ACCESS',
    'DOCTOR_HISTORY_ACCESS',
    'APPOINTMENT_VIEW',
    'MEDICAL_RECORD_VIEW',
    'PRESCRIPTION_VIEW',
    'PATIENT_CREATED',
    'PATIENT_UPDATED',
    'PATIENT_DELETED',
    'APPOINTMENT_CREATED',
    'APPOINTMENT_UPDATED',
    'APPOINTMENT_CANCELLED',
    'PRESCRIPTION_CREATED',
    'PRESCRIPTION_UPDATED',
    'DOCTOR_SEARCH',
    'APPOINTMENT_SEARCH',
    'PATIENT_SEARCH',
    'USER_ROLE_CHANGED',
    'PERMISSION_GRANTED',
    'PERMISSION_REVOKED',
    'UNAUTHORIZED_ACCESS_ATTEMPT',
    'SUSPICIOUS_ACTIVITY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NULL,
  "userRole" TEXT NULL,
  "action" "AuditAction" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT TRUE,
  "errorMessage" TEXT,
  "retentionDate" TIMESTAMP(3),
  CONSTRAINT "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_audit_userId" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_timestamp" ON "audit_logs"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_resource" ON "audit_logs"("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_user_timeline" ON "audit_logs"("userId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_resource_history" ON "audit_logs"("resourceType", "resourceId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_failed_events" ON "audit_logs"("timestamp" DESC) WHERE "success" = FALSE;
CREATE INDEX IF NOT EXISTS "idx_audit_suspicious" ON "audit_logs"("timestamp" DESC) WHERE "action" IN ('UNAUTHORIZED_ACCESS_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'FAILED_LOGIN');

-- Function to set retention date (timestamp + 6 years)
CREATE OR REPLACE FUNCTION set_audit_retention_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW."retentionDate" := NEW."timestamp" + INTERVAL '6 years';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trigger_set_retention_date
BEFORE INSERT ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION set_audit_retention_date();

-- Security view for monitoring suspicious activity
CREATE OR REPLACE VIEW "security_alerts" AS
SELECT
  al."id",
  al."timestamp",
  al."action",
  al."userId",
  u."email" AS "userEmail",
  al."userRole",
  al."ipAddress",
  al."resourceType",
  al."resourceId",
  al."errorMessage"
FROM "audit_logs" al
LEFT JOIN "users" u ON al."userId" = u."id"
WHERE
  al."success" = FALSE
  OR al."action" IN ('UNAUTHORIZED_ACCESS_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'FAILED_LOGIN')
ORDER BY al."timestamp" DESC
LIMIT 100;
