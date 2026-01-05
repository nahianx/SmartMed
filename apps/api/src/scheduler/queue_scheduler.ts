import {
  handleNoShows,
  refreshWaitTimes,
  resetDailyDoctorStats,
} from '../services/queue.service'

// Configurable intervals via environment variables
const NO_SHOW_INTERVAL_MS = parseInt(process.env.QUEUE_NO_SHOW_CHECK_INTERVAL || '300000', 10) // Default: 5 minutes
const WAIT_TIME_INTERVAL_MS = parseInt(process.env.QUEUE_WAIT_TIME_REFRESH_INTERVAL || '120000', 10) // Default: 2 minutes
const DAILY_RESET_INTERVAL_MS = parseInt(process.env.QUEUE_DAILY_RESET_INTERVAL || '3600000', 10) // Default: 1 hour

// Default no-show timeout (can be overridden per doctor)
export const DEFAULT_NO_SHOW_TIMEOUT_MINUTES = parseInt(process.env.QUEUE_DEFAULT_NO_SHOW_TIMEOUT || '30', 10)

export function startQueueScheduler() {
  console.log('[Queue Scheduler] Starting queue management schedulers...')
  console.log(`[Queue Scheduler] No-show check interval: ${NO_SHOW_INTERVAL_MS / 1000}s`)
  console.log(`[Queue Scheduler] Wait time refresh interval: ${WAIT_TIME_INTERVAL_MS / 1000}s`)
  console.log(`[Queue Scheduler] Default no-show timeout: ${DEFAULT_NO_SHOW_TIMEOUT_MINUTES} minutes`)

  // Run initial checks
  handleNoShows().catch((err) => console.error('[Queue Scheduler] No-show scan error:', err))
  refreshWaitTimes().catch((err) => console.error('[Queue Scheduler] Wait time refresh error:', err))
  resetDailyDoctorStats().catch((err) =>
    console.error('[Queue Scheduler] Daily stats reset error:', err)
  )

  // Schedule periodic checks
  setInterval(() => {
    handleNoShows().catch((err) => console.error('[Queue Scheduler] No-show scan error:', err))
  }, NO_SHOW_INTERVAL_MS)

  setInterval(() => {
    refreshWaitTimes().catch((err) =>
      console.error('[Queue Scheduler] Wait time refresh error:', err)
    )
  }, WAIT_TIME_INTERVAL_MS)

  setInterval(() => {
    resetDailyDoctorStats().catch((err) =>
      console.error('[Queue Scheduler] Daily stats reset error:', err)
    )
  }, DAILY_RESET_INTERVAL_MS)

  console.log('[Queue Scheduler] All schedulers started successfully')
}
