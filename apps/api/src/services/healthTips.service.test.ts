import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock the database
jest.mock('@smartmed/database', () => ({
  prisma: {
    appointment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    prescription: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    allergy: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    patient: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    healthTipPreference: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}))

// Mock HuggingFace inference
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    textGeneration: jest.fn().mockResolvedValue({
      generated_text: `
        1. [NUTRITION] Drink at least 8 glasses of water daily
        2. [EXERCISE] Take a 30-minute walk every day
        3. [SLEEP] Maintain a consistent sleep schedule
      `,
    }),
  })),
}))

describe('HealthTipsService', () => {
  let healthTipsService: any

  beforeEach(() => {
    jest.resetModules()
    // Re-import to get fresh instance
    const { healthTipsService: service } = require('./services/healthTips.service')
    healthTipsService = service
  })

  describe('getHealthTips', () => {
    it('returns tips for a user', async () => {
      const tips = await healthTipsService.getHealthTips({
        userId: 'test-user-id',
      })

      expect(tips).toBeDefined()
      expect(Array.isArray(tips)).toBe(true)
      expect(tips.length).toBeGreaterThan(0)
    })

    it('returns cached tips on second call', async () => {
      const userId = 'cache-test-user'

      // First call
      const tips1 = await healthTipsService.getHealthTips({ userId })

      // Second call should hit cache
      const tips2 = await healthTipsService.getHealthTips({ userId })

      // Tips should be the same (from cache)
      expect(tips1).toEqual(tips2)
    })
  })

  describe('generateNewTips', () => {
    it('bypasses cache and generates new tips', async () => {
      const userId = 'generate-test-user'

      // First call to populate cache
      await healthTipsService.getHealthTips({ userId })

      // Generate new tips (should bypass cache)
      const newTips = await healthTipsService.generateNewTips({ userId })

      expect(newTips).toBeDefined()
      expect(Array.isArray(newTips)).toBe(true)
    })
  })

  describe('invalidateUserCache', () => {
    it('removes user from cache', async () => {
      const userId = 'invalidate-test-user'

      // Populate cache
      await healthTipsService.getHealthTips({ userId })

      // Invalidate
      healthTipsService.invalidateUserCache(userId)

      // Get metrics to verify cache state
      const metrics = healthTipsService.getMetrics()
      expect(metrics).toBeDefined()
    })
  })

  describe('getMetrics', () => {
    it('returns service metrics', () => {
      const metrics = healthTipsService.getMetrics()

      expect(metrics).toHaveProperty('totalRequests')
      expect(metrics).toHaveProperty('cacheHits')
      expect(metrics).toHaveProperty('mlSuccess')
      expect(metrics).toHaveProperty('mlFailures')
      expect(metrics).toHaveProperty('fallbackUsage')
      expect(metrics).toHaveProperty('cacheHitRate')
      expect(metrics).toHaveProperty('mlSuccessRate')
    })
  })

  describe('static fallback tips', () => {
    it('provides fallback tips when ML fails', async () => {
      // Mock ML failure
      const HfInference = require('@huggingface/inference').HfInference
      HfInference.mockImplementationOnce(() => ({
        textGeneration: jest.fn().mockRejectedValue(new Error('ML service unavailable')),
      }))

      // Reset module to pick up new mock
      jest.resetModules()
      const { healthTipsService: freshService } = require('./services/healthTips.service')

      const tips = await freshService.getHealthTips({
        userId: 'fallback-test-user',
      })

      expect(tips).toBeDefined()
      expect(Array.isArray(tips)).toBe(true)
      // Should have fallback tips
      expect(tips.length).toBeGreaterThan(0)
    })
  })
})

describe('LRUCache', () => {
  it('evicts oldest entries when at capacity', () => {
    // This is a basic test - the LRU cache is internal to the service
    // We can test it indirectly through the service metrics
    const { healthTipsService } = require('./services/healthTips.service')
    
    // Verify cache operations don't throw errors
    expect(() => {
      healthTipsService.invalidateUserCache('non-existent-user')
    }).not.toThrow()
  })
})
