import { prisma, NotificationType } from '@smartmed/database'
import { healthTipsService, GeneratedTip } from '../services/healthTips.service'

// Configuration
const ONE_HOUR_MS = 60 * 60 * 1000
const SIX_HOURS_MS = 6 * ONE_HOUR_MS
const ONE_DAY_MS = 24 * ONE_HOUR_MS
const ONE_WEEK_MS = 7 * ONE_DAY_MS
const TWO_WEEKS_MS = 14 * ONE_DAY_MS
const ONE_MONTH_MS = 30 * ONE_DAY_MS

// Run the scheduler every hour
const SCHEDULER_INTERVAL = ONE_HOUR_MS

// Batch size to avoid overwhelming the ML service
const BATCH_SIZE = 10

// Delay between batches (in ms)
const BATCH_DELAY_MS = 5000

interface UserWithPreferences {
  id: string
  healthTipPreference: {
    enabled: boolean
    frequency: string
    categories: string[]
    deliveryMethod: string
    lastGeneratedAt: Date | null
  } | null
}

/**
 * Check if it's time to generate tips for a user based on their frequency preference
 */
function shouldGenerateTips(
  lastGenerated: Date | null,
  frequency: string
): boolean {
  if (!lastGenerated) {
    return true // Never generated, so generate now
  }

  const now = new Date()
  const timeSinceLastGeneration = now.getTime() - lastGenerated.getTime()

  switch (frequency) {
    case 'DAILY':
      return timeSinceLastGeneration >= ONE_DAY_MS
    case 'WEEKLY':
      return timeSinceLastGeneration >= ONE_WEEK_MS
    case 'BI_WEEKLY':
      return timeSinceLastGeneration >= TWO_WEEKS_MS
    case 'MONTHLY':
      return timeSinceLastGeneration >= ONE_MONTH_MS
    default:
      return timeSinceLastGeneration >= ONE_DAY_MS
  }
}

/**
 * Store generated tips in the database
 */
async function storeTips(userId: string, tips: GeneratedTip[]): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * ONE_DAY_MS) // Tips expire in 7 days

  for (const tip of tips) {
    try {
      await prisma.healthTip.upsert({
        where: {
          userId_tipText: {
            userId,
            tipText: tip.text,
          },
        },
        update: {
          expiresAt,
          updatedAt: new Date(),
        },
        create: {
          userId,
          tipText: tip.text,
          category: tip.category,
          source: tip.source,
          expiresAt,
          metadata: {
            generatedAt: tip.generatedAt.toISOString(),
            schedulerGenerated: true,
          },
        },
      })
    } catch (error) {
      console.error(`Error storing tip for user ${userId}:`, error)
    }
  }
}

/**
 * Create a notification for newly generated health tips
 */
async function createHealthTipNotification(
  userId: string,
  tipCount: number
): Promise<void> {
  try {
    // Check if user wants in-app notifications
    const preferences = await prisma.healthTipPreference.findUnique({
      where: { userId },
    })

    if (preferences && preferences.deliveryMethod === 'EMAIL') {
      // Only email, no in-app notification
      return
    }

    await prisma.notification.create({
      data: {
        userId,
        type: NotificationType.HEALTH_TIP_GENERATED,
        title: `${tipCount} new health tip${tipCount > 1 ? 's' : ''} available`,
        message: 'Personalized health tips have been generated based on your health profile.',
      },
    })
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error)
  }
}

/**
 * Process a batch of users to generate health tips
 */
async function processBatch(users: UserWithPreferences[]): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  let succeeded = 0
  let failed = 0

  for (const user of users) {
    try {
      // Generate tips for this user
      const tips = await healthTipsService.getHealthTips({
        userId: user.id,
      })

      if (tips.length > 0) {
        // Store tips
        await storeTips(user.id, tips)

        // Create notification
        await createHealthTipNotification(user.id, tips.length)

        // Update last generated timestamp
        await prisma.healthTipPreference.update({
          where: { userId: user.id },
          data: { lastGeneratedAt: new Date() },
        })

        succeeded++
      }
    } catch (error) {
      console.error(`Error generating tips for user ${user.id}:`, error)
      failed++
    }
  }

  return {
    processed: users.length,
    succeeded,
    failed,
  }
}

/**
 * Delay execution for a specified time
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Main scheduler function that runs periodically
 */
async function runHealthTipsScheduler(): Promise<void> {
  console.log('[HealthTips Scheduler] Starting scheduled run...')
  const startTime = Date.now()

  try {
    // Get all users with health tip preferences enabled
    const usersWithPreferences = await prisma.user.findMany({
      where: {
        healthTipPreference: {
          enabled: true,
        },
      },
      select: {
        id: true,
        healthTipPreference: true,
      },
    })

    // Also get patients without explicit preferences (default enabled)
    const patientsWithoutPreferences = await prisma.user.findMany({
      where: {
        role: 'PATIENT',
        healthTipPreference: null,
      },
      select: {
        id: true,
        healthTipPreference: true,
      },
    })

    // Combine and filter users who need tip generation
    const allEligibleUsers = [
      ...usersWithPreferences,
      ...patientsWithoutPreferences,
    ] as UserWithPreferences[]

    const usersNeedingTips = allEligibleUsers.filter((user) => {
      const frequency = user.healthTipPreference?.frequency || 'DAILY'
      const lastGenerated = user.healthTipPreference?.lastGeneratedAt || null
      return shouldGenerateTips(lastGenerated, frequency)
    })

    console.log(
      `[HealthTips Scheduler] Found ${usersNeedingTips.length} users needing tips`
    )

    if (usersNeedingTips.length === 0) {
      console.log('[HealthTips Scheduler] No users need tips at this time')
      return
    }

    // Process in batches to avoid overwhelming the ML service
    let totalSucceeded = 0
    let totalFailed = 0

    for (let i = 0; i < usersNeedingTips.length; i += BATCH_SIZE) {
      const batch = usersNeedingTips.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(usersNeedingTips.length / BATCH_SIZE)

      console.log(
        `[HealthTips Scheduler] Processing batch ${batchNumber}/${totalBatches}`
      )

      const result = await processBatch(batch)
      totalSucceeded += result.succeeded
      totalFailed += result.failed

      // Add delay between batches (except for the last one)
      if (i + BATCH_SIZE < usersNeedingTips.length) {
        await delay(BATCH_DELAY_MS)
      }
    }

    const duration = Date.now() - startTime
    console.log(
      `[HealthTips Scheduler] Completed. Succeeded: ${totalSucceeded}, Failed: ${totalFailed}, Duration: ${duration}ms`
    )
  } catch (error) {
    console.error('[HealthTips Scheduler] Error during scheduled run:', error)
  }
}

/**
 * Clean up expired health tips from the database
 */
async function cleanupExpiredTips(): Promise<void> {
  console.log('[HealthTips Scheduler] Cleaning up expired tips...')

  try {
    const result = await prisma.healthTip.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    console.log(
      `[HealthTips Scheduler] Deleted ${result.count} expired tips`
    )
  } catch (error) {
    console.error('[HealthTips Scheduler] Error cleaning up expired tips:', error)
  }
}

/**
 * Start the health tips scheduler
 */
export function startHealthTipsScheduler(): void {
  console.log('[HealthTips Scheduler] Initializing...')

  // Run once at startup (with a delay to let the server start)
  setTimeout(() => {
    runHealthTipsScheduler().catch((err) =>
      console.error('[HealthTips Scheduler] Startup run error:', err)
    )
  }, 30000) // 30 second delay after server start

  // Run periodically
  setInterval(() => {
    runHealthTipsScheduler().catch((err) =>
      console.error('[HealthTips Scheduler] Scheduled run error:', err)
    )
  }, SCHEDULER_INTERVAL)

  // Run cleanup once a day
  setInterval(() => {
    cleanupExpiredTips().catch((err) =>
      console.error('[HealthTips Scheduler] Cleanup error:', err)
    )
  }, ONE_DAY_MS)

  console.log(
    `[HealthTips Scheduler] Started. Running every ${SCHEDULER_INTERVAL / 1000 / 60} minutes`
  )
}

/**
 * Stop the scheduler (useful for testing)
 */
let schedulerInterval: NodeJS.Timeout | null = null
let cleanupInterval: NodeJS.Timeout | null = null

export function stopHealthTipsScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
  console.log('[HealthTips Scheduler] Stopped')
}

/**
 * Manually trigger a scheduler run (useful for testing/admin)
 */
export async function triggerHealthTipsGeneration(): Promise<{
  success: boolean
  message: string
}> {
  try {
    await runHealthTipsScheduler()
    return { success: true, message: 'Health tips generation triggered successfully' }
  } catch (error) {
    return { success: false, message: `Error: ${(error as Error).message}` }
  }
}
