/**
 * Drug Service
 * 
 * Provides integration with RxNav API for drug search, lookup, and interaction checking.
 * Implements caching, error handling, and fallback mechanisms.
 */

import { env } from '../config/env'
import { cacheService, CacheKeys } from './cache.service'
import { prisma, AuditAction } from '@smartmed/database'
import { logAuditEvent } from '../utils/audit'
import { Request } from 'express'

// ==========================================
// Types and Interfaces
// ==========================================

export interface DrugSearchResult {
  rxcui: string
  name: string
  synonym?: string
  tty: string // Term Type
  language?: string
  suppress?: string
}

export interface DrugDetail {
  rxcui: string
  name: string
  genericName?: string
  brandNames: string[]
  tty: string
  synonyms: string[]
  strength?: string
  dosageForm?: string
  route?: string
  drugClass: string[]
  activeIngredients: string[]
}

export interface DrugInteractionResult {
  severity: 'HIGH' | 'MODERATE' | 'LOW'
  description: string
  clinicalEffect?: string
  drug1: {
    rxcui: string
    name: string
  }
  drug2: {
    rxcui: string
    name: string
  }
  source: string
  evidenceLevel?: string
}

export interface InteractionCheckResponse {
  hasInteractions: boolean
  interactions: DrugInteractionResult[]
  checkedAt: Date
  drugCount: number
}

export interface AllergyConflict {
  drugRxcui: string
  drugName: string
  allergenName: string
  allergenRxcui?: string
  matchType: 'EXACT' | 'DRUG_CLASS' | 'INGREDIENT'
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING'
}

// ==========================================
// Custom Error Classes
// ==========================================

export class RxNavAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message)
    this.name = 'RxNavAPIError'
  }
}

export class DrugNotFoundError extends Error {
  constructor(public identifier: string) {
    super(`Drug not found: ${identifier}`)
    this.name = 'DrugNotFoundError'
  }
}

export class InteractionCheckError extends Error {
  constructor(message: string, public rxcuis?: string[]) {
    super(message)
    this.name = 'InteractionCheckError'
  }
}

// ==========================================
// RxNav API Client
// ==========================================

class RxNavClient {
  private baseUrl: string
  private timeout: number

  constructor() {
    this.baseUrl = env.RXNAV_API_BASE_URL
    this.timeout = env.RXNAV_API_TIMEOUT
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new RxNavAPIError(
          `RxNav API error: ${response.status} ${response.statusText}`,
          response.status,
          endpoint
        )
      }

      return await response.json() as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RxNavAPIError(`RxNav API timeout after ${this.timeout}ms`, undefined, endpoint)
      }

      if (error instanceof RxNavAPIError) {
        throw error
      }

      throw new RxNavAPIError(
        `RxNav API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        endpoint
      )
    }
  }

  /**
   * Search for drugs by name
   * Uses /drugs.json endpoint
   */
  async searchDrugs(term: string): Promise<DrugSearchResult[]> {
    interface RxNavDrugResponse {
      drugGroup?: {
        conceptGroup?: Array<{
          tty: string
          conceptProperties?: Array<{
            rxcui: string
            name: string
            synonym?: string
            tty: string
            language?: string
            suppress?: string
          }>
        }>
      }
    }

    const data = await this.fetch<RxNavDrugResponse>('/drugs.json', { name: term })

    const results: DrugSearchResult[] = []

    if (data.drugGroup?.conceptGroup) {
      for (const group of data.drugGroup.conceptGroup) {
        if (group.conceptProperties) {
          for (const prop of group.conceptProperties) {
            results.push({
              rxcui: prop.rxcui,
              name: prop.name,
              synonym: prop.synonym,
              tty: prop.tty,
              language: prop.language,
              suppress: prop.suppress,
            })
          }
        }
      }
    }

    return results
  }

  /**
   * Get detailed drug information by RxCUI
   * Uses /rxcui/{rxcui}/allrelated.json endpoint
   */
  async getDrugByRxCUI(rxcui: string): Promise<DrugDetail | null> {
    interface RxNavAllRelatedResponse {
      allRelatedGroup?: {
        rxcui: string
        conceptGroup?: Array<{
          tty: string
          conceptProperties?: Array<{
            rxcui: string
            name: string
            synonym?: string
            tty: string
          }>
        }>
      }
    }

    try {
      const data = await this.fetch<RxNavAllRelatedResponse>(`/rxcui/${rxcui}/allrelated.json`)

      if (!data.allRelatedGroup?.conceptGroup) {
        return null
      }

      const drugDetail: DrugDetail = {
        rxcui,
        name: '',
        brandNames: [],
        tty: '',
        synonyms: [],
        drugClass: [],
        activeIngredients: [],
      }

      for (const group of data.allRelatedGroup.conceptGroup) {
        if (group.conceptProperties) {
          for (const prop of group.conceptProperties) {
            // Set primary name from the requested RxCUI
            if (prop.rxcui === rxcui) {
              drugDetail.name = prop.name
              drugDetail.tty = prop.tty
            }

            // Collect synonyms
            if (prop.synonym) {
              drugDetail.synonyms.push(prop.synonym)
            }

            // Categorize by term type
            switch (group.tty) {
              case 'BN': // Brand Name
                drugDetail.brandNames.push(prop.name)
                break
              case 'IN': // Ingredient
                drugDetail.activeIngredients.push(prop.name)
                if (!drugDetail.genericName) {
                  drugDetail.genericName = prop.name
                }
                break
              case 'DF': // Dose Form
                drugDetail.dosageForm = prop.name
                break
            }
          }
        }
      }

      // Get additional details like strength and route
      const properties = await this.getDrugProperties(rxcui)
      if (properties) {
        drugDetail.strength = properties.strength
        drugDetail.route = properties.route
      }

      return drugDetail
    } catch (error) {
      if (error instanceof RxNavAPIError) {
        throw error
      }
      return null
    }
  }

  /**
   * Get drug properties (strength, route, etc.)
   */
  private async getDrugProperties(rxcui: string): Promise<{ strength?: string; route?: string } | null> {
    interface RxNavPropertiesResponse {
      propConceptGroup?: {
        propConcept?: Array<{
          propName: string
          propValue: string
        }>
      }
    }

    try {
      const data = await this.fetch<RxNavPropertiesResponse>(`/rxcui/${rxcui}/properties.json`)

      const result: { strength?: string; route?: string } = {}

      if (data.propConceptGroup?.propConcept) {
        for (const prop of data.propConceptGroup.propConcept) {
          if (prop.propName === 'STR') {
            result.strength = prop.propValue
          }
          if (prop.propName === 'DRT') {
            result.route = prop.propValue
          }
        }
      }

      return result
    } catch {
      return null
    }
  }

  /**
   * Get drug synonyms
   */
  async getDrugSynonyms(rxcui: string): Promise<string[]> {
    interface RxNavSynonymsResponse {
      displayTermsList?: {
        term?: string[]
      }
    }

    try {
      const data = await this.fetch<RxNavSynonymsResponse>(`/rxcui/${rxcui}/displaynames.json`)
      return data.displayTermsList?.term || []
    } catch {
      return []
    }
  }

  /**
   * Check drug interactions
   * Uses /interaction/list.json endpoint
   */
  async checkInteractions(rxcuis: string[]): Promise<DrugInteractionResult[]> {
    if (rxcuis.length < 2) {
      return []
    }

    interface RxNavInteractionResponse {
      fullInteractionTypeGroup?: Array<{
        fullInteractionType?: Array<{
          interactionPair?: Array<{
            interactionConcept?: Array<{
              minConceptItem?: {
                rxcui: string
                name: string
              }
              sourceConceptItem?: {
                name: string
              }
            }>
            severity?: string
            description?: string
          }>
        }>
        sourceName?: string
      }>
    }

    const data = await this.fetch<RxNavInteractionResponse>('/interaction/list.json', {
      rxcuis: rxcuis.join(' '),
    })

    const interactions: DrugInteractionResult[] = []

    if (data.fullInteractionTypeGroup) {
      for (const group of data.fullInteractionTypeGroup) {
        const source = group.sourceName || 'Unknown'

        if (group.fullInteractionType) {
          for (const interactionType of group.fullInteractionType) {
            if (interactionType.interactionPair) {
              for (const pair of interactionType.interactionPair) {
                if (pair.interactionConcept && pair.interactionConcept.length >= 2) {
                  const drug1 = pair.interactionConcept[0]
                  const drug2 = pair.interactionConcept[1]

                  interactions.push({
                    severity: this.mapSeverity(pair.severity),
                    description: pair.description || 'Potential drug interaction',
                    drug1: {
                      rxcui: drug1.minConceptItem?.rxcui || '',
                      name: drug1.minConceptItem?.name || drug1.sourceConceptItem?.name || 'Unknown',
                    },
                    drug2: {
                      rxcui: drug2.minConceptItem?.rxcui || '',
                      name: drug2.minConceptItem?.name || drug2.sourceConceptItem?.name || 'Unknown',
                    },
                    source,
                  })
                }
              }
            }
          }
        }
      }
    }

    return interactions
  }

  /**
   * Get drug classes for allergy checking
   */
  async getDrugClasses(rxcui: string): Promise<string[]> {
    interface RxNavClassResponse {
      rxclassMinConceptList?: {
        rxclassMinConcept?: Array<{
          classId: string
          className: string
          classType: string
        }>
      }
    }

    try {
      const data = await this.fetch<RxNavClassResponse>(`/rxcui/${rxcui}/class.json`)

      if (!data.rxclassMinConceptList?.rxclassMinConcept) {
        return []
      }

      return data.rxclassMinConceptList.rxclassMinConcept.map(c => c.className)
    } catch {
      return []
    }
  }

  /**
   * Map RxNav severity to our severity enum
   */
  private mapSeverity(severity?: string): 'HIGH' | 'MODERATE' | 'LOW' {
    if (!severity) return 'MODERATE'

    const lowerSeverity = severity.toLowerCase()
    
    if (lowerSeverity.includes('high') || lowerSeverity.includes('contraindicated') || lowerSeverity.includes('severe')) {
      return 'HIGH'
    }
    if (lowerSeverity.includes('moderate') || lowerSeverity.includes('caution')) {
      return 'MODERATE'
    }
    return 'LOW'
  }
}

// ==========================================
// Drug Service
// ==========================================

class DrugService {
  private rxNavClient: RxNavClient

  constructor() {
    this.rxNavClient = new RxNavClient()
  }

  /**
   * Search for drugs by name with caching
   */
  async searchDrugs(
    term: string,
    options?: { userId?: string; req?: Request }
  ): Promise<DrugSearchResult[]> {
    if (!env.DRUG_SUGGESTIONS_ENABLED) {
      return []
    }

    if (!term || term.length < 2) {
      return []
    }

    const cacheKey = CacheKeys.drugSearch(term)

    try {
      // Try cache first
      const cached = await cacheService.get<DrugSearchResult[]>(cacheKey)
      if (cached) {
        return cached
      }

      // Fetch from RxNav
      const results = await this.rxNavClient.searchDrugs(term)

      // Cache results
      await cacheService.set(cacheKey, results, { ttl: env.DRUG_SEARCH_CACHE_TTL })

      // Log audit event
      if (options?.userId) {
        await logAuditEvent({
          userId: options.userId,
          action: AuditAction.DRUG_SEARCH,
          resourceType: 'Drug',
          resourceId: term,
          metadata: { resultCount: results.length },
          request: options.req,
        })
      }

      return results
    } catch (error) {
      console.error('[DrugService] Search error:', error)
      
      // Return empty array on error (graceful degradation)
      return []
    }
  }

  /**
   * Get detailed drug information by RxCUI with caching
   */
  async getDrugByRxCUI(
    rxcui: string,
    options?: { userId?: string; req?: Request }
  ): Promise<DrugDetail | null> {
    const cacheKey = CacheKeys.drugDetail(rxcui)

    try {
      // Try cache first
      const cached = await cacheService.get<DrugDetail>(cacheKey)
      if (cached) {
        return cached
      }

      // Fetch from RxNav
      const drug = await this.rxNavClient.getDrugByRxCUI(rxcui)

      if (drug) {
        // Cache results
        await cacheService.set(cacheKey, drug, { ttl: env.DRUG_CACHE_TTL })

        // Also save to database for offline access
        await this.saveDrugToDatabase(drug)
      }

      // Log audit event
      if (options?.userId) {
        await logAuditEvent({
          userId: options.userId,
          action: AuditAction.DRUG_LOOKUP,
          resourceType: 'Drug',
          resourceId: rxcui,
          metadata: { found: !!drug },
          request: options.req,
        })
      }

      return drug
    } catch (error) {
      console.error('[DrugService] Get drug error:', error)

      // Try database fallback
      return this.getDrugFromDatabase(rxcui)
    }
  }

  /**
   * Get drug synonyms
   */
  async getDrugSynonyms(rxcui: string): Promise<string[]> {
    const cacheKey = CacheKeys.drugSynonyms(rxcui)

    try {
      const cached = await cacheService.get<string[]>(cacheKey)
      if (cached) {
        return cached
      }

      const synonyms = await this.rxNavClient.getDrugSynonyms(rxcui)
      await cacheService.set(cacheKey, synonyms, { ttl: env.DRUG_CACHE_TTL })

      return synonyms
    } catch (error) {
      console.error('[DrugService] Get synonyms error:', error)
      return []
    }
  }

  /**
   * Check drug-drug interactions
   */
  async checkInteractions(
    rxcuis: string[],
    options?: { userId?: string; prescriptionId?: string; req?: Request }
  ): Promise<InteractionCheckResponse> {
    if (!env.INTERACTION_CHECK_ENABLED) {
      return {
        hasInteractions: false,
        interactions: [],
        checkedAt: new Date(),
        drugCount: rxcuis.length,
      }
    }

    if (rxcuis.length < 2) {
      return {
        hasInteractions: false,
        interactions: [],
        checkedAt: new Date(),
        drugCount: rxcuis.length,
      }
    }

    const cacheKey = CacheKeys.drugInteractions(rxcuis)

    try {
      // Try cache first
      const cached = await cacheService.get<DrugInteractionResult[]>(cacheKey)
      let interactions: DrugInteractionResult[]

      if (cached) {
        interactions = cached
      } else {
        // Fetch from RxNav
        interactions = await this.rxNavClient.checkInteractions(rxcuis)

        // Sort by severity (HIGH first)
        interactions.sort((a, b) => {
          const severityOrder = { HIGH: 0, MODERATE: 1, LOW: 2 }
          return severityOrder[a.severity] - severityOrder[b.severity]
        })

        // Cache results
        await cacheService.set(cacheKey, interactions, { ttl: env.INTERACTION_CACHE_TTL })
      }

      // Log audit event
      if (options?.userId) {
        await logAuditEvent({
          userId: options.userId,
          action: AuditAction.INTERACTION_CHECK,
          resourceType: 'Prescription',
          resourceId: options.prescriptionId || 'unknown',
          metadata: {
            drugCount: rxcuis.length,
            interactionCount: interactions.length,
            hasHighSeverity: interactions.some(i => i.severity === 'HIGH'),
          },
          request: options.req,
        })
      }

      return {
        hasInteractions: interactions.length > 0,
        interactions,
        checkedAt: new Date(),
        drugCount: rxcuis.length,
      }
    } catch (error) {
      console.error('[DrugService] Interaction check error:', error)
      
      throw new InteractionCheckError(
        'Failed to check drug interactions. Please try again.',
        rxcuis
      )
    }
  }

  /**
   * Check for allergy conflicts
   */
  async checkAllergyConflicts(
    patientId: string,
    drugRxcuis: string[],
    options?: { userId?: string; req?: Request }
  ): Promise<AllergyConflict[]> {
    if (!env.ALLERGY_CHECK_ENABLED) {
      return []
    }

    try {
      // Get patient allergies
      const allergies = await prisma.patientAllergy.findMany({
        where: {
          patientId,
          isActive: true,
        },
      })

      if (allergies.length === 0) {
        return []
      }

      const conflicts: AllergyConflict[] = []

      for (const rxcui of drugRxcuis) {
        // Get drug details and classes
        const drug = await this.getDrugByRxCUI(rxcui)
        if (!drug) continue

        const drugClasses = await this.getDrugClasses(rxcui)

        for (const allergy of allergies) {
          // Check exact drug match
          if (allergy.allergenRxcui === rxcui) {
            conflicts.push({
              drugRxcui: rxcui,
              drugName: drug.name,
              allergenName: allergy.allergenName,
              allergenRxcui: allergy.allergenRxcui || undefined,
              matchType: 'EXACT',
              severity: allergy.severity as AllergyConflict['severity'],
            })
            continue
          }

          // Check drug class match
          const allergenLower = allergy.allergenName.toLowerCase()
          for (const drugClass of drugClasses) {
            if (drugClass.toLowerCase().includes(allergenLower) ||
                allergenLower.includes(drugClass.toLowerCase())) {
              conflicts.push({
                drugRxcui: rxcui,
                drugName: drug.name,
                allergenName: allergy.allergenName,
                matchType: 'DRUG_CLASS',
                severity: allergy.severity as AllergyConflict['severity'],
              })
              break
            }
          }

          // Check ingredient match
          for (const ingredient of drug.activeIngredients) {
            if (ingredient.toLowerCase().includes(allergenLower) ||
                allergenLower.includes(ingredient.toLowerCase())) {
              conflicts.push({
                drugRxcui: rxcui,
                drugName: drug.name,
                allergenName: allergy.allergenName,
                matchType: 'INGREDIENT',
                severity: allergy.severity as AllergyConflict['severity'],
              })
              break
            }
          }
        }
      }

      // Log audit event
      if (options?.userId) {
        await logAuditEvent({
          userId: options.userId,
          action: AuditAction.ALLERGY_CHECK,
          resourceType: 'Patient',
          resourceId: patientId,
          metadata: {
            drugCount: drugRxcuis.length,
            conflictCount: conflicts.length,
          },
          request: options.req,
        })
      }

      return conflicts
    } catch (error) {
      console.error('[DrugService] Allergy check error:', error)
      return []
    }
  }

  /**
   * Get drug classes for a drug
   */
  async getDrugClasses(rxcui: string): Promise<string[]> {
    const cacheKey = CacheKeys.drugClasses(rxcui)

    try {
      const cached = await cacheService.get<string[]>(cacheKey)
      if (cached) {
        return cached
      }

      const classes = await this.rxNavClient.getDrugClasses(rxcui)
      await cacheService.set(cacheKey, classes, { ttl: env.DRUG_CACHE_TTL })

      return classes
    } catch (error) {
      console.error('[DrugService] Get drug classes error:', error)
      return []
    }
  }

  /**
   * Resolve drug name to RxCUI
   */
  async resolveDrugName(name: string): Promise<string | null> {
    try {
      const results = await this.searchDrugs(name)
      
      if (results.length === 0) {
        return null
      }

      // Find exact match first
      const exactMatch = results.find(
        r => r.name.toLowerCase() === name.toLowerCase()
      )

      if (exactMatch) {
        return exactMatch.rxcui
      }

      // Return first result if no exact match
      return results[0].rxcui
    } catch (error) {
      console.error('[DrugService] Resolve drug name error:', error)
      return null
    }
  }

  /**
   * Save drug to database for offline access
   */
  private async saveDrugToDatabase(drug: DrugDetail): Promise<void> {
    try {
      await prisma.drug.upsert({
        where: { rxcui: drug.rxcui },
        create: {
          rxcui: drug.rxcui,
          name: drug.name,
          genericName: drug.genericName,
          brandNames: drug.brandNames,
          tty: drug.tty,
          synonyms: drug.synonyms,
          strength: drug.strength,
          dosageForm: drug.dosageForm,
          route: drug.route,
          drugClass: drug.drugClass,
          activeIngredients: drug.activeIngredients,
        },
        update: {
          name: drug.name,
          genericName: drug.genericName,
          brandNames: drug.brandNames,
          synonyms: drug.synonyms,
          strength: drug.strength,
          dosageForm: drug.dosageForm,
          route: drug.route,
          drugClass: drug.drugClass,
          activeIngredients: drug.activeIngredients,
          lastVerified: new Date(),
        },
      })
    } catch (error) {
      console.error('[DrugService] Save to database error:', error)
    }
  }

  /**
   * Get drug from database (fallback when API unavailable)
   */
  private async getDrugFromDatabase(rxcui: string): Promise<DrugDetail | null> {
    try {
      const drug = await prisma.drug.findUnique({
        where: { rxcui },
      })

      if (!drug) {
        return null
      }

      return {
        rxcui: drug.rxcui,
        name: drug.name,
        genericName: drug.genericName || undefined,
        brandNames: drug.brandNames,
        tty: drug.tty,
        synonyms: drug.synonyms,
        strength: drug.strength || undefined,
        dosageForm: drug.dosageForm || undefined,
        route: drug.route || undefined,
        drugClass: drug.drugClass,
        activeIngredients: drug.activeIngredients,
      }
    } catch (error) {
      console.error('[DrugService] Database fallback error:', error)
      return null
    }
  }

  /**
   * Health check for RxNav API
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now()

    try {
      // Simple search to test API connectivity
      await this.rxNavClient.searchDrugs('aspirin')
      
      return {
        healthy: true,
        latency: Date.now() - startTime,
      }
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// ==========================================
// Singleton Export
// ==========================================

export const drugService = new DrugService()

export default drugService
