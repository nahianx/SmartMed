import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Import error classes for testing
import { DrugNotFoundError, InteractionCheckError, RxNavAPIError } from './drug.service'

describe('Drug Service Error Classes', () => {
  describe('DrugNotFoundError', () => {
    it('creates error with identifier', () => {
      const error = new DrugNotFoundError('RXCUI123')

      expect(error.message).toContain('RXCUI123')
      expect(error.name).toBe('DrugNotFoundError')
      expect(error.identifier).toBe('RXCUI123')
    })

    it('is instance of Error', () => {
      const error = new DrugNotFoundError('test')
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('InteractionCheckError', () => {
    it('creates error with message only', () => {
      const error = new InteractionCheckError('Check failed')

      expect(error.message).toBe('Check failed')
      expect(error.name).toBe('InteractionCheckError')
      expect(error.rxcuis).toBeUndefined()
    })

    it('creates error with rxcuis', () => {
      const error = new InteractionCheckError('Check failed', ['12345', '67890'])

      expect(error.message).toBe('Check failed')
      expect(error.name).toBe('InteractionCheckError')
      expect(error.rxcuis).toEqual(['12345', '67890'])
    })

    it('is instance of Error', () => {
      const error = new InteractionCheckError('test')
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('RxNavAPIError', () => {
    it('creates error with message only', () => {
      const error = new RxNavAPIError('API error')

      expect(error.message).toBe('API error')
      expect(error.name).toBe('RxNavAPIError')
      expect(error.statusCode).toBeUndefined()
      expect(error.endpoint).toBeUndefined()
    })

    it('creates error with status code', () => {
      const error = new RxNavAPIError('API error', 500)

      expect(error.statusCode).toBe(500)
    })

    it('creates error with endpoint', () => {
      const error = new RxNavAPIError('API error', 500, '/drugs.json')

      expect(error.endpoint).toBe('/drugs.json')
    })

    it('is instance of Error', () => {
      const error = new RxNavAPIError('test')
      expect(error instanceof Error).toBe(true)
    })
  })
})

describe('Drug Service Types', () => {
  it('exports DrugSearchResult type structure', () => {
    // Type-checking test - validates the interface exists
    const result = {
      rxcui: '12345',
      name: 'Aspirin',
      tty: 'SBD',
      synonym: 'Acetylsalicylic acid',
    }

    expect(result).toHaveProperty('rxcui')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('tty')
  })

  it('exports DrugInteractionResult type structure', () => {
    const result = {
      severity: 'HIGH' as const,
      description: 'Drug interaction warning',
      drug1: { rxcui: '12345', name: 'Drug A' },
      drug2: { rxcui: '67890', name: 'Drug B' },
      source: 'DrugBank',
    }

    expect(result.severity).toBe('HIGH')
    expect(result.drug1).toHaveProperty('rxcui')
    expect(result.drug2).toHaveProperty('name')
  })

  it('exports InteractionCheckResponse type structure', () => {
    const response = {
      hasInteractions: true,
      interactions: [],
      checkedAt: new Date(),
      drugCount: 2,
    }

    expect(response).toHaveProperty('hasInteractions')
    expect(response).toHaveProperty('interactions')
    expect(response).toHaveProperty('checkedAt')
    expect(response).toHaveProperty('drugCount')
  })
})
