/**
 * Patient Allergy Service
 *
 * Manages patient allergies and provides allergy conflict detection
 * when prescribing medications.
 */

import { prisma, AllergenType, AllergySeverity, AuditAction } from '@smartmed/database'
import { drugService, DrugDetail } from './drug.service'
import { CacheService, CacheKeys } from './cache.service'
import env from '../config/env'
import { logAuditEvent } from '../utils/audit'

// =============================================================================
// TYPES
// =============================================================================

export interface PatientAllergyInput {
  patientId: string
  allergenName: string
  allergenType: AllergenType
  allergenRxcui?: string | null
  severity: AllergySeverity
  reaction?: string | null
  onsetDate?: Date | null
  verifiedBy?: string | null
  notes?: string | null
}

export interface PatientAllergyUpdate {
  allergenName?: string
  allergenType?: AllergenType
  allergenRxcui?: string | null
  severity?: AllergySeverity
  reaction?: string | null
  onsetDate?: Date | null
  verifiedBy?: string | null
  verifiedAt?: Date | null
  notes?: string | null
  isActive?: boolean
}

export interface AllergyConflict {
  allergyId: string
  allergen: string
  allergenType: AllergenType
  severity: AllergySeverity
  matchedDrugRxcui: string
  matchedDrugName: string
  matchType: 'exact' | 'ingredient' | 'class' | 'cross_reactive'
  reaction?: string | null
  confidence: 'high' | 'medium' | 'low'
}

export interface AllergyCheckResult {
  hasConflicts: boolean
  conflicts: AllergyConflict[]
  checkedAt: Date
  patientId: string
  checkedDrugs: string[]
}

export interface PatientAllergyRecord {
  id: string
  patientId: string
  allergenName: string
  allergenType: AllergenType
  allergenRxcui: string | null
  severity: AllergySeverity
  reaction: string | null
  onsetDate: Date | null
  verifiedBy: string | null
  verifiedAt: Date | null
  notes: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Known cross-reactive drug classes (simplified for demo)
const CROSS_REACTIVE_CLASSES: Record<string, string[]> = {
  // Penicillins can cross-react with cephalosporins
  penicillin: ['cephalosporin', 'carbapenem'],
  cephalosporin: ['penicillin'],
  // NSAIDs cross-reactivity
  aspirin: ['nsaid', 'ibuprofen', 'naproxen'],
  nsaid: ['aspirin'],
  // Sulfonamides
  sulfonamide: ['sulfonylurea', 'thiazide'],
}

const mapMatchTypeForDb = (matchType: AllergyConflict['matchType']): string => {
  switch (matchType) {
    case 'exact':
      return 'EXACT'
    case 'ingredient':
      return 'INGREDIENT'
    case 'class':
      return 'DRUG_CLASS'
    case 'cross_reactive':
      return 'CROSS_REACTIVE'
    default:
      return matchType.toUpperCase()
  }
}

// =============================================================================
// ALLERGY SERVICE CLASS
// =============================================================================

export class AllergyService {
  private cacheService: CacheService

  constructor() {
    this.cacheService = CacheService.getInstance()
  }

  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Get all active allergies for a patient
   */
  async getPatientAllergies(patientId: string): Promise<PatientAllergyRecord[]> {
    const cacheKey = CacheKeys.patientAllergies(patientId)
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const allergies = await prisma.patientAllergy.findMany({
          where: {
            patientId,
            isActive: true,
          },
          orderBy: [
            { severity: 'desc' },
            { allergenName: 'asc' },
          ],
        })
        return allergies as PatientAllergyRecord[]
      },
      env.DRUG_CACHE_TTL
    )
  }

  /**
   * Get a specific allergy by ID
   */
  async getAllergyById(allergyId: string): Promise<PatientAllergyRecord | null> {
    const allergy = await prisma.patientAllergy.findUnique({
      where: { id: allergyId },
    })
    return allergy as PatientAllergyRecord | null
  }

  /**
   * Add a new allergy for a patient
   */
  async addPatientAllergy(
    data: PatientAllergyInput,
    createdById: string
  ): Promise<PatientAllergyRecord> {
    // Check for duplicates
    const existing = await prisma.patientAllergy.findFirst({
      where: {
        patientId: data.patientId,
        allergenName: {
          equals: data.allergenName,
          mode: 'insensitive',
        },
        isActive: true,
      },
    })

    if (existing) {
      throw new AllergyDuplicateError(
        `Patient already has an active allergy to "${data.allergenName}"`
      )
    }

    // If RxCUI not provided but allergenType is DRUG, try to resolve it
    let allergenRxcui = data.allergenRxcui
    if (!allergenRxcui && data.allergenType === AllergenType.DRUG) {
      try {
        const resolved = await drugService.resolveDrugName(data.allergenName)
        if (resolved) {
          allergenRxcui = resolved.rxcui
        }
      } catch {
        // Continue without RxCUI if resolution fails
      }
    }

    const allergy = await prisma.patientAllergy.create({
      data: {
        patientId: data.patientId,
        allergenName: data.allergenName,
        allergenType: data.allergenType,
        allergenRxcui,
        severity: data.severity,
        reaction: data.reaction,
        onsetDate: data.onsetDate,
        verifiedBy: data.verifiedBy,
        verifiedAt: data.verifiedBy ? new Date() : null,
        notes: data.notes,
        isActive: true,
      },
    })

    // Log audit event
    await logAuditEvent({
      userId: createdById,
      action: AuditAction.ALLERGY_ADDED,
      resourceType: 'PatientAllergy',
      resourceId: allergy.id,
      metadata: {
        patientId: data.patientId,
        allergenName: data.allergenName,
      },
    })

    // Invalidate cache
    await this.cacheService.delete(CacheKeys.patientAllergies(data.patientId))

    return allergy as PatientAllergyRecord
  }

  /**
   * Update an existing allergy
   */
  async updatePatientAllergy(
    allergyId: string,
    data: PatientAllergyUpdate,
    updatedById: string
  ): Promise<PatientAllergyRecord> {
    const existing = await this.getAllergyById(allergyId)
    if (!existing) {
      throw new AllergyNotFoundError(`Allergy with ID "${allergyId}" not found`)
    }

    const allergy = await prisma.patientAllergy.update({
      where: { id: allergyId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })

    // Log audit event
    await logAuditEvent({
      userId: updatedById,
      action: AuditAction.ALLERGY_UPDATED,
      resourceType: 'PatientAllergy',
      resourceId: allergyId,
      metadata: { patientId: existing.patientId, changes: data },
    })

    // Invalidate cache
    await this.cacheService.delete(CacheKeys.patientAllergies(existing.patientId))

    return allergy as PatientAllergyRecord
  }

  /**
   * Soft delete an allergy (mark as inactive)
   */
  async deletePatientAllergy(
    allergyId: string,
    deletedById: string
  ): Promise<PatientAllergyRecord> {
    const existing = await this.getAllergyById(allergyId)
    if (!existing) {
      throw new AllergyNotFoundError(`Allergy with ID "${allergyId}" not found`)
    }

    const allergy = await prisma.patientAllergy.update({
      where: { id: allergyId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    // Log audit event
    await logAuditEvent({
      userId: deletedById,
      action: AuditAction.ALLERGY_DELETED,
      resourceType: 'PatientAllergy',
      resourceId: allergyId,
      metadata: { patientId: existing.patientId, allergenName: existing.allergenName },
    })

    // Invalidate cache
    await this.cacheService.delete(CacheKeys.patientAllergies(existing.patientId))

    return allergy as PatientAllergyRecord
  }

  /**
   * Verify an allergy (mark as clinically verified)
   */
  async verifyAllergy(
    allergyId: string,
    verifiedById: string
  ): Promise<PatientAllergyRecord> {
    return this.updatePatientAllergy(
      allergyId,
      {
        verifiedBy: verifiedById,
        verifiedAt: new Date(),
      },
      verifiedById
    )
  }

  // ---------------------------------------------------------------------------
  // Conflict Detection
  // ---------------------------------------------------------------------------

  /**
   * Check for allergy conflicts with a list of drugs
   */
  async checkAllergyConflicts(
    patientId: string,
    rxcuis: string[],
    checkedById: string
  ): Promise<AllergyCheckResult> {
    if (!env.ALLERGY_CHECK_ENABLED) {
      return {
        hasConflicts: false,
        conflicts: [],
        checkedAt: new Date(),
        patientId,
        checkedDrugs: rxcuis,
      }
    }

    const allergies = await this.getPatientAllergies(patientId)
    
    if (allergies.length === 0) {
      return {
        hasConflicts: false,
        conflicts: [],
        checkedAt: new Date(),
        patientId,
        checkedDrugs: rxcuis,
      }
    }

    const conflicts: AllergyConflict[] = []

    // Get drug details for all rxcuis
    const drugDetails = await Promise.all(
      rxcuis.map(async (rxcui) => {
        try {
          return await drugService.getDrugByRxCUI(rxcui)
        } catch {
          return null
        }
      })
    )

    for (const allergy of allergies) {
      for (let i = 0; i < rxcuis.length; i++) {
        const rxcui = rxcuis[i]
        const drug = drugDetails[i]

        if (!drug) continue

        const conflict = this.detectConflict(allergy, rxcui, drug)
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    }

    // Sort conflicts by severity (highest first)
    conflicts.sort((a, b) => {
      const severityOrder = {
        LIFE_THREATENING: 0,
        SEVERE: 1,
        MODERATE: 2,
        MILD: 3,
      }
      return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
    })

    const result: AllergyCheckResult = {
      hasConflicts: conflicts.length > 0,
      conflicts,
      checkedAt: new Date(),
      patientId,
      checkedDrugs: rxcuis,
    }

    // Log audit event
    await this.logAllergyCheck(patientId, checkedById, result)

    return result
  }

  /**
   * Detect if a specific allergy conflicts with a drug
   */
  private detectConflict(
    allergy: PatientAllergyRecord,
    rxcui: string,
    drug: DrugDetail
  ): AllergyConflict | null {
    const allergenLower = allergy.allergenName.toLowerCase()
    const drugNameLower = drug.name.toLowerCase()

    // 1. Exact RxCUI match (highest confidence)
    if (allergy.allergenRxcui && allergy.allergenRxcui === rxcui) {
      return {
        allergyId: allergy.id,
        allergen: allergy.allergenName,
        allergenType: allergy.allergenType,
        severity: allergy.severity,
        matchedDrugRxcui: rxcui,
        matchedDrugName: drug.name,
        matchType: 'exact',
        reaction: allergy.reaction,
        confidence: 'high',
      }
    }

    // 2. Exact name match
    if (drugNameLower.includes(allergenLower) || allergenLower.includes(drugNameLower)) {
      return {
        allergyId: allergy.id,
        allergen: allergy.allergenName,
        allergenType: allergy.allergenType,
        severity: allergy.severity,
        matchedDrugRxcui: rxcui,
        matchedDrugName: drug.name,
        matchType: 'exact',
        reaction: allergy.reaction,
        confidence: 'high',
      }
    }

    // 3. Generic name match
    if (drug.genericName) {
      const genericLower = drug.genericName.toLowerCase()
      if (genericLower.includes(allergenLower) || allergenLower.includes(genericLower)) {
        return {
          allergyId: allergy.id,
          allergen: allergy.allergenName,
          allergenType: allergy.allergenType,
          severity: allergy.severity,
          matchedDrugRxcui: rxcui,
          matchedDrugName: drug.name,
          matchType: 'exact',
          reaction: allergy.reaction,
          confidence: 'high',
        }
      }
    }

    // 4. Active ingredient match
    if (drug.activeIngredients && drug.activeIngredients.length > 0) {
      for (const ingredient of drug.activeIngredients) {
        const ingredientLower = ingredient.toLowerCase()
        if (ingredientLower.includes(allergenLower) || allergenLower.includes(ingredientLower)) {
          return {
            allergyId: allergy.id,
            allergen: allergy.allergenName,
            allergenType: allergy.allergenType,
            severity: allergy.severity,
            matchedDrugRxcui: rxcui,
            matchedDrugName: drug.name,
            matchType: 'ingredient',
            reaction: allergy.reaction,
            confidence: 'high',
          }
        }
      }
    }

    // 5. Drug class match
    if (drug.drugClass) {
      const drugClassLower = drug.drugClass.toLowerCase()
      if (drugClassLower.includes(allergenLower) || allergenLower.includes(drugClassLower)) {
        return {
          allergyId: allergy.id,
          allergen: allergy.allergenName,
          allergenType: allergy.allergenType,
          severity: allergy.severity,
          matchedDrugRxcui: rxcui,
          matchedDrugName: drug.name,
          matchType: 'class',
          reaction: allergy.reaction,
          confidence: 'medium',
        }
      }
    }

    // 6. Cross-reactivity check
    const crossReactiveMatch = this.checkCrossReactivity(allergy, drug)
    if (crossReactiveMatch) {
      return {
        allergyId: allergy.id,
        allergen: allergy.allergenName,
        allergenType: allergy.allergenType,
        severity: allergy.severity,
        matchedDrugRxcui: rxcui,
        matchedDrugName: drug.name,
        matchType: 'cross_reactive',
        reaction: allergy.reaction,
        confidence: 'low',
      }
    }

    return null
  }

  /**
   * Check for cross-reactive drug classes
   */
  private checkCrossReactivity(
    allergy: PatientAllergyRecord,
    drug: DrugDetail
  ): boolean {
    const allergenLower = allergy.allergenName.toLowerCase()

    // Find which class the allergen belongs to
    for (const [allergenClass, relatedClasses] of Object.entries(CROSS_REACTIVE_CLASSES)) {
      if (allergenLower.includes(allergenClass)) {
        // Check if the drug belongs to any related class
        const drugNameLower = drug.name.toLowerCase()
        const drugClassLower = drug.drugClass?.toLowerCase() || ''

        for (const relatedClass of relatedClasses) {
          if (drugNameLower.includes(relatedClass) || drugClassLower.includes(relatedClass)) {
            return true
          }
        }

        // Also check active ingredients
        if (drug.activeIngredients) {
          for (const ingredient of drug.activeIngredients) {
            const ingredientLower = ingredient.toLowerCase()
            for (const relatedClass of relatedClasses) {
              if (ingredientLower.includes(relatedClass)) {
                return true
              }
            }
          }
        }
      }
    }

    return false
  }

  // ---------------------------------------------------------------------------
  // Audit Logging
  // ---------------------------------------------------------------------------

  /**
   * Log allergy check audit record
   */
  private async logAllergyCheck(
    patientId: string,
    checkedById: string,
    result: AllergyCheckResult
  ): Promise<void> {
    try {
      if (result.conflicts.length > 0) {
        await prisma.allergyCheck.createMany({
          data: result.conflicts.map((conflict) => ({
            patientId,
            drugRxcui: conflict.matchedDrugRxcui,
            drugName: conflict.matchedDrugName,
            allergyId: conflict.allergyId,
            allergenName: conflict.allergen,
            matchType: mapMatchTypeForDb(conflict.matchType),
            severity: conflict.severity,
          })),
        })
      }

      await logAuditEvent({
        userId: checkedById,
        action: AuditAction.ALLERGY_CHECK,
        resourceType: 'Patient',
        resourceId: patientId,
        metadata: {
          checkedDrugs: result.checkedDrugs,
          conflictsFound: result.conflicts.length,
          hasConflicts: result.hasConflicts,
        },
      })
    } catch (error) {
      console.error('Failed to log allergy check:', error)
    }
  }

  /**
   * Record an allergy conflict override
   */
  async recordAllergyOverride(
    patientId: string,
    checkedById: string,
    conflicts: AllergyConflict[],
    overrideReason: string
  ): Promise<void> {
    try {
      const overriddenAt = new Date()

      for (const conflict of conflicts) {
        const updateResult = await prisma.allergyCheck.updateMany({
          where: {
            patientId,
            allergyId: conflict.allergyId,
            drugRxcui: conflict.matchedDrugRxcui,
            wasOverridden: false,
          },
          data: {
            wasOverridden: true,
            overrideReason,
            overriddenBy: checkedById,
            overriddenAt,
          },
        })

        if (updateResult.count === 0) {
          await prisma.allergyCheck.create({
            data: {
              patientId,
              drugRxcui: conflict.matchedDrugRxcui,
              drugName: conflict.matchedDrugName,
              allergyId: conflict.allergyId,
              allergenName: conflict.allergen,
              matchType: mapMatchTypeForDb(conflict.matchType),
              severity: conflict.severity,
              wasOverridden: true,
              overrideReason,
              overriddenBy: checkedById,
              overriddenAt,
            },
          })
        }
      }

      await logAuditEvent({
        userId: checkedById,
        action: AuditAction.ALLERGY_CONFLICT_OVERRIDE,
        resourceType: 'Patient',
        resourceId: patientId,
        metadata: {
          conflictsOverridden: conflicts.length,
          overrideReason,
          conflicts: conflicts.map((c) => ({
            allergen: c.allergen,
            drug: c.matchedDrugName,
            severity: c.severity,
          })),
        },
      })
    } catch (error) {
      console.error('Failed to record allergy override:', error)
    }
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Get allergy history for a patient (including inactive)
   */
  async getPatientAllergyHistory(patientId: string): Promise<PatientAllergyRecord[]> {
    const allergies = await prisma.patientAllergy.findMany({
      where: { patientId },
      orderBy: [
        { isActive: 'desc' },
        { updatedAt: 'desc' },
      ],
    })
    return allergies as PatientAllergyRecord[]
  }

  /**
   * Get allergy check history for a patient
   */
  async getPatientAllergyCheckHistory(
    patientId: string,
    limit: number = 20
  ): Promise<unknown[]> {
    const checks = await prisma.allergyCheck.findMany({
      where: { patientId },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    })
    return checks
  }

  /**
   * Search for common allergens
   */
  async searchCommonAllergens(query: string): Promise<string[]> {
    // Common drug allergens for autocomplete
    const commonAllergens = [
      'Penicillin',
      'Amoxicillin',
      'Ampicillin',
      'Sulfa drugs',
      'Sulfamethoxazole',
      'Aspirin',
      'Ibuprofen',
      'Naproxen',
      'Celecoxib',
      'Codeine',
      'Morphine',
      'Tramadol',
      'Hydrocodone',
      'Oxycodone',
      'Cephalosporins',
      'Erythromycin',
      'Azithromycin',
      'Ciprofloxacin',
      'Levofloxacin',
      'Metronidazole',
      'Tetracycline',
      'Doxycycline',
      'Vancomycin',
      'ACE inhibitors',
      'Lisinopril',
      'Enalapril',
      'Beta blockers',
      'Metoprolol',
      'Atenolol',
      'Statins',
      'Atorvastatin',
      'Simvastatin',
      'Contrast dye',
      'Latex',
      'Lidocaine',
      'Novocaine',
      'Heparin',
      'Insulin',
      'Metformin',
    ]

    const queryLower = query.toLowerCase()
    return commonAllergens.filter((a) => a.toLowerCase().includes(queryLower))
  }
}

// =============================================================================
// CUSTOM ERRORS
// =============================================================================

export class AllergyNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AllergyNotFoundError'
  }
}

export class AllergyDuplicateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AllergyDuplicateError'
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let allergyServiceInstance: AllergyService | null = null

export function getAllergyService(): AllergyService {
  if (!allergyServiceInstance) {
    allergyServiceInstance = new AllergyService()
  }
  return allergyServiceInstance
}

export default AllergyService
