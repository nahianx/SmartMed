/**
 * Token Cleanup Scheduler
 * 
 * Periodically cleans up expired prescription access tokens
 * to maintain database hygiene and security.
 */

import { prescriptionTokenService } from '../services/prescriptionToken.service'

// Cleanup interval: every 6 hours
const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000

let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Run token cleanup
 */
async function runCleanup(): Promise<void> {
  try {
    const deletedCount = await prescriptionTokenService.cleanupExpiredTokens()
    if (deletedCount > 0) {
      console.log(`🧹 Token cleanup: removed ${deletedCount} expired prescription access tokens`)
    }
  } catch (error) {
    console.error('❌ Token cleanup failed:', error)
  }
}

/**
 * Start the token cleanup scheduler
 */
export function startTokenCleanupScheduler(): void {
  // Run once at startup (after a short delay)
  setTimeout(runCleanup, 5000)

  // Then run periodically
  cleanupInterval = setInterval(runCleanup, CLEANUP_INTERVAL)

  console.log('🔄 Token cleanup scheduler started (runs every 6 hours)')
}

/**
 * Stop the token cleanup scheduler
 */
export function stopTokenCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.log('⏹️ Token cleanup scheduler stopped')
  }
}
