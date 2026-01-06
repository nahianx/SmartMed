/**
 * Allergy Service Unit Tests
 *
 * Tests for patient allergy management and conflict detection.
 * Critical for patient safety (HIPAA-related).
 */

import { AllergenType, AllergySeverity, AuditAction } from '@smartmed/database'

// Mock the database
jest.mock('@smartmed/database', () => ({
  prisma: {
    patientAllergy: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    allergyCheckHistory: {
      create: jest.fn(),
    },
  },
  AllergenType: {
    DRUG: 'DRUG',
    FOOD: 'FOOD',
    ENVIRONMENTAL: 'ENVIRONMENTAL',
    OTHER: 'OTHER',
  },
  AllergySeverity: {
    MILD: 'MILD',
    MODERATE: 'MODERATE',
    SEVERE: 'SEVERE',
    LIFE_THREATENING: 'LIFE_THREATENING',
  },
  AuditAction: {
    ALLERGY_ADDED: 'ALLERGY_ADDED',
    ALLERGY_UPDATED: 'ALLERGY_UPDATED',
    ALLERGY_DELETED: 'ALLERGY_DELETED',
    ALLERGY_CHECK: 'ALLERGY_CHECK',
  },
}))

// Mock drug service
jest.mock('./drug.service', () => ({
  drugService: {
    resolveDrugName: jest.fn(),
    getDrugByRxCUI: jest.fn(),
  },
}))

// Mock cache service
jest.mock('./cache.service', () => ({
  CacheService: {
    getInstance: jest.fn(() => ({
      getOrSet: jest.fn((key, fn) => fn()),
      delete: jest.fn(),
    })),
  },
  CacheKeys: {
    patientAllergies: jest.fn((patientId) => `patient-allergies:${patientId}`),
  },
}))

// Mock config
jest.mock('../config/env', () => ({
  __esModule: true,
  default: {
    DRUG_CACHE_TTL: 3600,
    ALLERGY_CHECK_ENABLED: true,
    USE_ALLERGY_API: false,
  },
}))

// Mock audit logger
jest.mock('../utils/audit', () => ({
  logAuditEvent: jest.fn(),
}))

import { prisma } from '@smartmed/database'
import { drugService } from './drug.service'
import { logAuditEvent } from '../utils/audit'
import AllergyService, {
  AllergyNotFoundError,
  AllergyDuplicateError,
  getAllergyService,
} from './allergy.service'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockDrugService = drugService as jest.Mocked<typeof drugService>

describe('Allergy Service', () => {
  let allergyService: AllergyService

  beforeEach(() => {
    jest.clearAllMocks()
    allergyService = new AllergyService()
  })

  describe('AllergyNotFoundError', () => {
    it('creates error with message', () => {
      const error = new AllergyNotFoundError('Allergy not found')
      expect(error.message).toBe('Allergy not found')
      expect(error.name).toBe('AllergyNotFoundError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('AllergyDuplicateError', () => {
    it('creates error with message', () => {
      const error = new AllergyDuplicateError('Duplicate allergy')
      expect(error.message).toBe('Duplicate allergy')
      expect(error.name).toBe('AllergyDuplicateError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('getAllergyService', () => {
    it('returns singleton instance', () => {
      const instance1 = getAllergyService()
      const instance2 = getAllergyService()
      expect(instance1).toBe(instance2)
    })
  })

  describe('getPatientAllergies', () => {
    const mockAllergies = [
      {
        id: 'allergy-1',
        patientId: 'patient-1',
        allergenName: 'Penicillin',
        allergenType: AllergenType.DRUG,
        allergenRxcui: '733',
        severity: AllergySeverity.SEVERE,
        reaction: 'Anaphylaxis',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'allergy-2',
        patientId: 'patient-1',
        allergenName: 'Peanuts',
        allergenType: AllergenType.FOOD,
        allergenRxcui: null,
        severity: AllergySeverity.LIFE_THREATENING,
        reaction: 'Swelling',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    it('should retrieve patient allergies', async () => {
      ;(mockPrisma.patientAllergy.findMany as jest.Mock).mockResolvedValue(mockAllergies)

      const result = await allergyService.getPatientAllergies('patient-1')

      expect(result).toHaveLength(2)
      expect(result[0].allergenName).toBe('Penicillin')
    })
  })

  describe('getAllergyById', () => {
    it('should retrieve allergy by ID', async () => {
      const mockAllergy = {
        id: 'allergy-1',
        patientId: 'patient-1',
        allergenName: 'Penicillin',
        allergenType: AllergenType.DRUG,
        severity: AllergySeverity.SEVERE,
      }

      ;(mockPrisma.patientAllergy.findUnique as jest.Mock).mockResolvedValue(mockAllergy)

      const result = await allergyService.getAllergyById('allergy-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('allergy-1')
      expect(mockPrisma.patientAllergy.findUnique).toHaveBeenCalledWith({
        where: { id: 'allergy-1' },
      })
    })

    it('should return null for non-existent allergy', async () => {
      ;(mockPrisma.patientAllergy.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await allergyService.getAllergyById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('addPatientAllergy', () => {
    const validAllergyInput = {
      patientId: 'patient-1',
      allergenName: 'Aspirin',
      allergenType: AllergenType.DRUG,
      severity: AllergySeverity.MODERATE,
      reaction: 'Hives',
    }

    it('should add a new allergy', async () => {
      const createdAllergy = {
        id: 'new-allergy',
        ...validAllergyInput,
        allergenRxcui: '1191',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(mockPrisma.patientAllergy.findFirst as jest.Mock).mockResolvedValue(null) // No duplicate
      ;(mockDrugService.resolveDrugName as jest.Mock).mockResolvedValue({ rxcui: '1191' })
      ;(mockPrisma.patientAllergy.create as jest.Mock).mockResolvedValue(createdAllergy)

      const result = await allergyService.addPatientAllergy(validAllergyInput, 'doctor-1')

      expect(result.id).toBe('new-allergy')
      expect(mockPrisma.patientAllergy.create).toHaveBeenCalled()
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'doctor-1',
          action: AuditAction.ALLERGY_ADDED,
        })
      )
    })

    it('should throw AllergyDuplicateError for existing allergy', async () => {
      const existingAllergy = {
        id: 'existing',
        patientId: 'patient-1',
        allergenName: 'Aspirin',
        isActive: true,
      }

      ;(mockPrisma.patientAllergy.findFirst as jest.Mock).mockResolvedValue(existingAllergy)

      await expect(
        allergyService.addPatientAllergy(validAllergyInput, 'doctor-1')
      ).rejects.toThrow(AllergyDuplicateError)
    })

    it('should resolve drug RxCUI for drug allergies', async () => {
      ;(mockPrisma.patientAllergy.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockDrugService.resolveDrugName as jest.Mock).mockResolvedValue({ rxcui: '1191' })
      ;(mockPrisma.patientAllergy.create as jest.Mock).mockResolvedValue({
        id: 'new',
        ...validAllergyInput,
        allergenRxcui: '1191',
      })

      await allergyService.addPatientAllergy(validAllergyInput, 'doctor-1')

      expect(mockDrugService.resolveDrugName).toHaveBeenCalledWith('Aspirin')
    })

    it('should continue without RxCUI if resolution fails', async () => {
      ;(mockPrisma.patientAllergy.findFirst as jest.Mock).mockResolvedValue(null)
      ;(mockDrugService.resolveDrugName as jest.Mock).mockRejectedValue(new Error('API error'))
      ;(mockPrisma.patientAllergy.create as jest.Mock).mockResolvedValue({
        id: 'new',
        ...validAllergyInput,
        allergenRxcui: null,
      })

      const result = await allergyService.addPatientAllergy(validAllergyInput, 'doctor-1')

      expect(result).toBeDefined()
      expect(mockPrisma.patientAllergy.create).toHaveBeenCalled()
    })
  })

  describe('updatePatientAllergy', () => {
    it('should update an existing allergy', async () => {
      const existingAllergy = {
        id: 'allergy-1',
        patientId: 'patient-1',
        allergenName: 'Penicillin',
        severity: AllergySeverity.MODERATE,
      }

      const updatedAllergy = {
        ...existingAllergy,
        severity: AllergySeverity.SEVERE,
        notes: 'Updated by doctor',
      }

      ;(mockPrisma.patientAllergy.findUnique as jest.Mock).mockResolvedValue(existingAllergy)
      ;(mockPrisma.patientAllergy.update as jest.Mock).mockResolvedValue(updatedAllergy)

      const result = await allergyService.updatePatientAllergy(
        'allergy-1',
        { severity: AllergySeverity.SEVERE, notes: 'Updated by doctor' },
        'doctor-1'
      )

      expect(result.severity).toBe(AllergySeverity.SEVERE)
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ALLERGY_UPDATED,
        })
      )
    })

    it('should throw AllergyNotFoundError for non-existent allergy', async () => {
      ;(mockPrisma.patientAllergy.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        allergyService.updatePatientAllergy('non-existent', { notes: 'test' }, 'doctor-1')
      ).rejects.toThrow(AllergyNotFoundError)
    })
  })

  describe('deletePatientAllergy', () => {
    it('should soft delete an allergy', async () => {
      const existingAllergy = {
        id: 'allergy-1',
        patientId: 'patient-1',
        allergenName: 'Penicillin',
        isActive: true,
      }

      const deletedAllergy = {
        ...existingAllergy,
        isActive: false,
      }

      ;(mockPrisma.patientAllergy.findUnique as jest.Mock).mockResolvedValue(existingAllergy)
      ;(mockPrisma.patientAllergy.update as jest.Mock).mockResolvedValue(deletedAllergy)

      const result = await allergyService.deletePatientAllergy('allergy-1', 'doctor-1')

      expect(result.isActive).toBe(false)
      expect(mockPrisma.patientAllergy.update).toHaveBeenCalledWith({
        where: { id: 'allergy-1' },
        data: expect.objectContaining({ isActive: false }),
      })
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ALLERGY_DELETED,
        })
      )
    })

    it('should throw AllergyNotFoundError for non-existent allergy', async () => {
      ;(mockPrisma.patientAllergy.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        allergyService.deletePatientAllergy('non-existent', 'doctor-1')
      ).rejects.toThrow(AllergyNotFoundError)
    })
  })

  describe('verifyAllergy', () => {
    it('should mark allergy as verified', async () => {
      const existingAllergy = {
        id: 'allergy-1',
        patientId: 'patient-1',
        allergenName: 'Penicillin',
        verifiedBy: null,
        verifiedAt: null,
      }

      const verifiedAllergy = {
        ...existingAllergy,
        verifiedBy: 'doctor-1',
        verifiedAt: new Date(),
      }

      ;(mockPrisma.patientAllergy.findUnique as jest.Mock).mockResolvedValue(existingAllergy)
      ;(mockPrisma.patientAllergy.update as jest.Mock).mockResolvedValue(verifiedAllergy)

      const result = await allergyService.verifyAllergy('allergy-1', 'doctor-1')

      expect(result.verifiedBy).toBe('doctor-1')
      expect(result.verifiedAt).toBeDefined()
    })
  })

  describe('checkAllergyConflicts', () => {
    const mockAllergies = [
      {
        id: 'allergy-1',
        patientId: 'patient-1',
        allergenName: 'Penicillin',
        allergenType: AllergenType.DRUG,
        allergenRxcui: '733',
        severity: AllergySeverity.SEVERE,
        reaction: 'Anaphylaxis',
        isActive: true,
      },
    ]

    it('should detect exact RxCUI match conflict', async () => {
      ;(mockPrisma.patientAllergy.findMany as jest.Mock).mockResolvedValue(mockAllergies)
      ;(mockDrugService.getDrugByRxCUI as jest.Mock).mockResolvedValue({
        name: 'Penicillin V',
        rxcui: '733',
        genericName: 'penicillin v potassium',
        activeIngredients: ['penicillin'],
      })
      ;(mockPrisma.allergyCheckHistory.create as jest.Mock).mockResolvedValue({})

      const result = await allergyService.checkAllergyConflicts(
        'patient-1',
        ['733'],
        'doctor-1'
      )

      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].matchType).toBe('exact')
      expect(result.conflicts[0].confidence).toBe('high')
    })

    it('should return no conflicts for patient without allergies', async () => {
      ;(mockPrisma.patientAllergy.findMany as jest.Mock).mockResolvedValue([])

      const result = await allergyService.checkAllergyConflicts(
        'patient-1',
        ['1191'],
        'doctor-1'
      )

      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should return no conflicts for non-matching drugs', async () => {
      ;(mockPrisma.patientAllergy.findMany as jest.Mock).mockResolvedValue(mockAllergies)
      ;(mockDrugService.getDrugByRxCUI as jest.Mock).mockResolvedValue({
        name: 'Metformin',
        rxcui: '6809',
        genericName: 'metformin',
        activeIngredients: ['metformin hydrochloride'],
      })
      ;(mockPrisma.allergyCheckHistory.create as jest.Mock).mockResolvedValue({})

      const result = await allergyService.checkAllergyConflicts(
        'patient-1',
        ['6809'],
        'doctor-1'
      )

      expect(result.hasConflicts).toBe(false)
    })

    it('should handle drug service errors gracefully', async () => {
      ;(mockPrisma.patientAllergy.findMany as jest.Mock).mockResolvedValue(mockAllergies)
      ;(mockDrugService.getDrugByRxCUI as jest.Mock).mockRejectedValue(new Error('API error'))
      ;(mockPrisma.allergyCheckHistory.create as jest.Mock).mockResolvedValue({})

      const result = await allergyService.checkAllergyConflicts(
        'patient-1',
        ['unknown'],
        'doctor-1'
      )

      // Should not throw, just return no conflicts for that drug
      expect(result).toBeDefined()
      expect(result.checkedDrugs).toContain('unknown')
    })
  })

  describe('searchCommonAllergens', () => {
    it('should return matching common allergens', async () => {
      const result = await allergyService.searchCommonAllergens('peni')

      expect(result).toContain('Penicillin')
    })

    it('should be case-insensitive', async () => {
      const result = await allergyService.searchCommonAllergens('ASPIRIN')

      expect(result).toContain('Aspirin')
    })

    it('should return empty array for no matches', async () => {
      const result = await allergyService.searchCommonAllergens('xyznonexistent')

      expect(result).toHaveLength(0)
    })
  })
})
