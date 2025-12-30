import { apiClient } from './apiClient'

// =============================================================================
// TYPES
// =============================================================================

export interface DrugSearchResult {
  rxcui: string
  name: string
  synonym?: string
  tty?: string // Term type: SBD (Branded), SCD (Clinical), etc.
}

export interface DrugDetail {
  rxcui: string
  name: string
  genericName?: string | null
  brandNames?: string[]
  tty?: string
  synonyms?: string[]
  strength?: string | null
  dosageForm?: string | null
  route?: string | null
  drugClass?: string | null
  activeIngredients?: string[]
}

export interface DrugInteraction {
  drug1Rxcui: string
  drug1Name: string
  drug2Rxcui: string
  drug2Name: string
  severity: 'HIGH' | 'MODERATE' | 'LOW'
  description: string
  source?: string
}

export interface InteractionCheckResult {
  hasInteractions: boolean
  interactions: DrugInteraction[]
  checkedAt: string
  checkedDrugs: string[]
}

export interface AllergyConflict {
  allergyId: string
  allergen: string
  allergenType: string
  severity: string
  matchedDrugRxcui: string
  matchedDrugName: string
  matchType: 'exact' | 'ingredient' | 'class' | 'cross_reactive'
  reaction?: string | null
  confidence: 'high' | 'medium' | 'low'
}

export interface AllergyCheckResult {
  hasConflicts: boolean
  conflicts: AllergyConflict[]
  checkedAt: string
  patientId: string
  checkedDrugs: string[]
}

export interface PatientAllergy {
  id: string
  patientId: string
  allergenName: string
  allergenType: 'DRUG' | 'DRUG_CLASS' | 'INGREDIENT' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER'
  allergenRxcui?: string | null
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING'
  reaction?: string | null
  onsetDate?: string | null
  verifiedBy?: string | null
  verifiedAt?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// =============================================================================
// DRUG SERVICE
// =============================================================================

class DrugService {
  private retryCount = 3
  private retryDelay = 1000

  /**
   * Retry wrapper for API calls
   */
  private async withRetry<T>(fn: () => Promise<T>, retries = this.retryCount): Promise<T> {
    try {
      return await fn()
    } catch (error: any) {
      if (retries > 0 && error?.response?.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
        return this.withRetry(fn, retries - 1)
      }
      throw error
    }
  }

  /**
   * Search for drugs by name
   */
  async searchDrugs(term: string, limit: number = 10): Promise<DrugSearchResult[]> {
    if (term.length < 2) return []

    return this.withRetry(async () => {
      const response = await apiClient.get('/drugs/search', {
        params: { term, limit },
      })
      return response.data.results || []
    })
  }

  /**
   * Get detailed information about a drug by RxCUI
   */
  async getDrugDetails(rxcui: string): Promise<DrugDetail> {
    return this.withRetry(async () => {
      const response = await apiClient.get(`/drugs/${rxcui}`)
      return response.data.drug
    })
  }

  /**
   * Get drug synonyms
   */
  async getDrugSynonyms(rxcui: string): Promise<string[]> {
    return this.withRetry(async () => {
      const response = await apiClient.get(`/drugs/${rxcui}/synonyms`)
      return response.data.synonyms || []
    })
  }

  /**
   * Get drug classes
   */
  async getDrugClasses(rxcui: string): Promise<string[]> {
    return this.withRetry(async () => {
      const response = await apiClient.get(`/drugs/${rxcui}/classes`)
      return response.data.classes || []
    })
  }

  /**
   * Check drug-drug interactions
   */
  async checkInteractions(rxcuis: string[]): Promise<InteractionCheckResult> {
    if (rxcuis.length < 2) {
      return {
        hasInteractions: false,
        interactions: [],
        checkedAt: new Date().toISOString(),
        checkedDrugs: rxcuis,
      }
    }

    return this.withRetry(async () => {
      const response = await apiClient.post('/drugs/interactions/check', {
        rxcuis,
      })
      return response.data
    })
  }

  /**
   * Check interactions for an existing prescription
   */
  async checkPrescriptionInteractions(prescriptionId: string): Promise<InteractionCheckResult> {
    return this.withRetry(async () => {
      const response = await apiClient.get(
        `/drugs/prescriptions/${prescriptionId}/interactions`
      )
      return response.data
    })
  }

  /**
   * Override interaction warnings
   */
  async overrideInteractions(
    prescriptionId: string,
    reason: string,
    acknowledgedInteractions: DrugInteraction[]
  ): Promise<void> {
    await apiClient.post('/drugs/interactions/override', {
      prescriptionId,
      overrideReason: reason,
      acknowledgedInteractions,
    })
  }

  /**
   * Check for allergy conflicts
   */
  async checkAllergyConflicts(
    patientId: string,
    rxcuis: string[]
  ): Promise<AllergyCheckResult> {
    return this.withRetry(async () => {
      const response = await apiClient.post('/drugs/allergies/check', {
        patientId,
        rxcuis,
      })
      return response.data
    })
  }

  /**
   * Get patient allergies
   */
  async getPatientAllergies(patientId: string): Promise<PatientAllergy[]> {
    const response = await apiClient.get(`/drugs/patients/${patientId}/allergies`)
    return response.data.allergies || []
  }

  /**
   * Add patient allergy
   */
  async addPatientAllergy(
    patientId: string,
    data: {
      allergenName: string
      allergenType: 'DRUG' | 'DRUG_CLASS' | 'INGREDIENT' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER'
      allergenRxcui?: string
      severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING'
      reaction?: string
      onsetDate?: string
      notes?: string
    }
  ): Promise<PatientAllergy> {
    const response = await apiClient.post(
      `/drugs/patients/${patientId}/allergies`,
      data
    )
    return response.data.allergy
  }

  /**
   * Update patient allergy
   */
  async updatePatientAllergy(
    allergyId: string,
    data: Partial<{
      allergenName: string
      allergenType: 'DRUG' | 'DRUG_CLASS' | 'INGREDIENT' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER'
      allergenRxcui?: string | null
      severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING'
      reaction?: string | null
      onsetDate?: string | null
      notes?: string | null
      isActive: boolean
    }>
  ): Promise<PatientAllergy> {
    const response = await apiClient.patch(`/drugs/allergies/${allergyId}`, data)
    return response.data.allergy
  }

  /**
   * Delete patient allergy
   */
  async deletePatientAllergy(allergyId: string): Promise<void> {
    await apiClient.delete(`/drugs/allergies/${allergyId}`)
  }

  /**
   * Check RxNav API health
   */
  async checkHealth(): Promise<{ status: string; rxnavAvailable: boolean }> {
    const response = await apiClient.get('/drugs/health')
    return response.data
  }

  /**
   * Validate a prescription's medications for interactions and allergies
   * This is a preview check before creating the prescription
   */
  async validatePrescriptionMedications(
    patientId: string,
    medications: Array<{ medicineName: string; rxcui?: string }>
  ): Promise<{
    isValid: boolean
    interactions: DrugInteraction[]
    allergyConflicts: AllergyConflict[]
    warnings: string[]
    requiresOverride: boolean
  }> {
    // Extract RxCUIs
    const rxcuis = medications
      .filter((m) => m.rxcui)
      .map((m) => m.rxcui as string)

    const result = {
      isValid: true,
      interactions: [] as DrugInteraction[],
      allergyConflicts: [] as AllergyConflict[],
      warnings: [] as string[],
      requiresOverride: false,
    }

    // Check interactions if we have enough drugs
    if (rxcuis.length >= 2) {
      try {
        const interactionResult = await this.checkInteractions(rxcuis)
        result.interactions = interactionResult.interactions

        const severeInteractions = interactionResult.interactions.filter(
          (i) => i.severity === 'HIGH'
        )

        if (severeInteractions.length > 0) {
          result.isValid = false
          result.requiresOverride = true
          result.warnings.push(
            `Found ${severeInteractions.length} severe drug interaction(s)`
          )
        }
      } catch (error) {
        result.warnings.push('Unable to check drug interactions')
      }
    }

    // Check allergies
    if (rxcuis.length > 0) {
      try {
        const allergyResult = await this.checkAllergyConflicts(patientId, rxcuis)
        result.allergyConflicts = allergyResult.conflicts

        if (allergyResult.hasConflicts) {
          result.isValid = false
          result.requiresOverride = true
          result.warnings.push(
            `Found ${allergyResult.conflicts.length} potential allergy conflict(s)`
          )
        }
      } catch (error) {
        result.warnings.push('Unable to check allergy conflicts')
      }
    }

    // Warn about medications without RxCUI
    const unverifiedMeds = medications.filter((m) => !m.rxcui)
    if (unverifiedMeds.length > 0) {
      result.warnings.push(
        `${unverifiedMeds.length} medication(s) could not be verified against drug database`
      )
    }

    return result
  }
}

// Export singleton instance
export const drugService = new DrugService()
export default drugService
