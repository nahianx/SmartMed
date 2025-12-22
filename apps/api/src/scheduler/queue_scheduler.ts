import {
  handleNoShows,
  refreshWaitTimes,
  resetDailyDoctorStats,
} from '../services/queue.service'

const NO_SHOW_INTERVAL_MS = 5 * 60 * 1000
const WAIT_TIME_INTERVAL_MS = 2 * 60 * 1000
const DAILY_RESET_INTERVAL_MS = 60 * 60 * 1000

export function startQueueScheduler() {
  handleNoShows().catch((err) => console.error('No-show scan error', err))
  refreshWaitTimes().catch((err) => console.error('Wait time refresh error', err))
  resetDailyDoctorStats().catch((err) =>
    console.error('Daily stats reset error', err)
  )

  setInterval(() => {
    handleNoShows().catch((err) => console.error('No-show scan error', err))
  }, NO_SHOW_INTERVAL_MS)

  setInterval(() => {
    refreshWaitTimes().catch((err) =>
      console.error('Wait time refresh error', err)
    )
  }, WAIT_TIME_INTERVAL_MS)

  setInterval(() => {
    resetDailyDoctorStats().catch((err) =>
      console.error('Daily stats reset error', err)
    )
  }, DAILY_RESET_INTERVAL_MS)
}
