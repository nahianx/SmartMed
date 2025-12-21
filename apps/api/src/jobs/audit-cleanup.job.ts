/**
 * Scheduled job to clean up expired audit logs.
 * Hook into your scheduler/cron runner to invoke runAuditCleanup.
 */
import { cleanupExpiredAuditLogs } from '../utils/audit'

export async function runAuditCleanup() {
  // eslint-disable-next-line no-console
  console.log('[CRON] Starting audit log cleanup...')
  const deletedCount = await cleanupExpiredAuditLogs()
  // eslint-disable-next-line no-console
  console.log(`[CRON] Audit cleanup complete. Deleted ${deletedCount} records.`)
}

// Example: wire up with node-cron or external scheduler
// import cron from 'node-cron'
// cron.schedule('0 2 * * *', () => {
//   runAuditCleanup().catch((error) =>
//     console.error('[CRON ERROR] Audit cleanup failed:', error),
//   )
// })
