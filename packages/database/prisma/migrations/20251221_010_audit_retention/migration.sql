-- Add retention trigger, partial indexes, and security view for audit logs

-- Partial indexes for monitoring
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

-- Trigger to apply retention date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_retention_date'
  ) THEN
    CREATE TRIGGER trigger_set_retention_date
    BEFORE INSERT ON "audit_logs"
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_retention_date();
  END IF;
END;
$$;

-- Security view for quick monitoring
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
