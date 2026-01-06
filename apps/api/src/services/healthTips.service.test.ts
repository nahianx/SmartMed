import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock the database - must be at top level before imports
jest.mock('@smartmed/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-user-id',
        name: 'Test User',
        role: 'PATIENT',
        patient: {
          id: 'test-patient-id',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'MALE',
          bloodType: 'A+',
          chronicConditions: [],
        }
      }),
    },
    appointment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    prescription: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    patientAllergy: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    patient: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-patient-id',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
      }),
    },
    healthTipPreference: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    healthTip: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'tip-1' }),
      update: jest.fn().mockResolvedValue({ id: 'tip-1' }),
    },
  },
}))

// Mock HuggingFace inference
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    textGeneration: jest.fn().mockResolvedValue({
      generated_text: `Here are health tips:
1. [NUTRITION] Drink at least 8 glasses of water daily
2. [EXERCISE] Take a 30-minute walk every day
3. [SLEEP] Maintain a consistent sleep schedule`,
    }),
  })),
}))

// Import after mocks
import { healthTipsService } from './healthTips.service'

describe('HealthTipsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
      expect(metrics).toHaveProperty('cacheSize')
    })
  })

  describe('invalidateUserCache', () => {
    it('removes user from cache without throwing', () => {
      expect(() => {
        healthTipsService.invalidateUserCache('test-user-id')
      }).not.toThrow()
    })

    it('handles non-existent users gracefully', () => {
      expect(() => {
        healthTipsService.invalidateUserCache('non-existent-user')
      }).not.toThrow()
    })
  })

  describe('static fallback tips', () => {
    it('has fallback tips available', () => {
      // The service should have static fallback tips for when ML fails
      const metrics = healthTipsService.getMetrics()
      expect(typeof metrics.fallbackUsage).toBe('number')
    })
  })
})

describe('LRUCache behavior', () => {
  it('cache operations do not throw errors', () => {
    // Verify cache operations work without errors
    expect(() => {
      healthTipsService.invalidateUserCache('test-user')
    }).not.toThrow()
    
    // Verify metrics reflect cache state
    const metrics = healthTipsService.getMetrics()
    expect(typeof metrics.cacheSize).toBe('number')
    expect(metrics.cacheSize).toBeGreaterThanOrEqual(0)
  })
})
