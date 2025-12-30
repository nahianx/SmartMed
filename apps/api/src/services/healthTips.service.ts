import { HfInference } from '@huggingface/inference'
import { prisma } from '@smartmed/database'
import crypto from 'crypto'

// Types for health tips
export interface HealthTipInput {
  userId: string
  patientId?: string
}

export interface GeneratedTip {
  id: string
  text: string
  category: HealthTipCategory
  source: 'ML_GENERATED' | 'STATIC_FALLBACK'
  generatedAt: Date
}

export interface PatientContext {
  recentAppointments: Array<{
    reason: string
    diagnosis?: string
    dateTime: Date
  }>
  activePrescriptions: Array<{
    medicineName: string
    condition?: string
  }>
  allergies: Array<{
    allergenName: string
    severity: string
  }>
  conditions: string[]
  age?: number
  gender?: string
}

type HealthTipCategory =
  | 'GENERAL_WELLNESS'
  | 'NUTRITION'
  | 'EXERCISE'
  | 'MENTAL_HEALTH'
  | 'SLEEP'
  | 'MEDICATION'
  | 'PREVENTIVE_CARE'
  | 'CHRONIC_CONDITION'
  | 'LIFESTYLE'

// Static fallback tips by category
const STATIC_TIPS: Record<HealthTipCategory, string[]> = {
  GENERAL_WELLNESS: [
    'Stay hydrated by drinking at least 8 glasses of water daily.',
    'Wash your hands frequently to prevent the spread of germs.',
    'Schedule regular check-ups with your healthcare provider.',
    'Take breaks from screens every 20 minutes to rest your eyes.',
    'Practice good posture to prevent back and neck pain.',
  ],
  NUTRITION: [
    'Include a variety of colorful vegetables in your meals.',
    'Choose whole grains over refined grains for better nutrition.',
    'Limit processed foods and opt for fresh ingredients.',
    'Read nutrition labels to make informed food choices.',
    'Practice mindful eating by savoring each bite.',
  ],
  EXERCISE: [
    'Aim for at least 30 minutes of moderate exercise daily.',
    'Start with short walks and gradually increase duration.',
    'Include both cardio and strength training in your routine.',
    'Stretch before and after exercise to prevent injuries.',
    'Find physical activities you enjoy to stay motivated.',
  ],
  MENTAL_HEALTH: [
    'Practice deep breathing exercises to manage stress.',
    'Connect with friends and family regularly for emotional support.',
    'Set aside time for hobbies and activities you enjoy.',
    'Limit news consumption if it increases anxiety.',
    'Consider journaling to process your thoughts and feelings.',
  ],
  SLEEP: [
    'Maintain a consistent sleep schedule, even on weekends.',
    'Create a relaxing bedtime routine to improve sleep quality.',
    'Keep your bedroom cool, dark, and quiet for better sleep.',
    'Avoid caffeine and screens at least 2 hours before bedtime.',
    'Aim for 7-9 hours of sleep each night.',
  ],
  MEDICATION: [
    'Take your medications at the same time each day.',
    'Keep a list of all your medications and share with your doctor.',
    'Never stop or change medication without consulting your provider.',
    'Store medications properly according to their instructions.',
    'Set reminders to help you remember to take your medications.',
  ],
  PREVENTIVE_CARE: [
    'Stay up to date with recommended vaccinations.',
    'Schedule regular dental check-ups every six months.',
    'Perform monthly self-examinations as recommended.',
    'Know your family health history and share it with your doctor.',
    'Get recommended health screenings based on your age and risk factors.',
  ],
  CHRONIC_CONDITION: [
    'Monitor your symptoms and track any changes over time.',
    'Follow your treatment plan consistently for best results.',
    'Learn about your condition from reliable medical sources.',
    'Join support groups to connect with others managing similar conditions.',
    'Communicate openly with your healthcare team about your concerns.',
  ],
  LIFESTYLE: [
    'Limit alcohol consumption to moderate levels.',
    'If you smoke, seek support to quit for better health.',
    'Manage stress through relaxation techniques.',
    'Maintain a healthy work-life balance.',
    'Build healthy habits gradually for lasting change.',
  ],
}

// LRU Cache implementation
interface CacheEntry {
  tips: GeneratedTip[]
  cachedAt: number
  contextHash: string
}

class LRUCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize: number
  private ttlMs: number

  constructor(maxSize = 1000, ttlMs = 24 * 60 * 60 * 1000) {
    this.maxSize = maxSize
    this.ttlMs = ttlMs
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check TTL
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry
  }

  set(key: string, entry: CacheEntry): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, entry)
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return { size: this.cache.size, maxSize: this.maxSize }
  }
}

// Configuration
const CONFIG = {
  modelId: process.env.HF_MODEL_ID || 'microsoft/DialoGPT-medium',
  maxTokens: parseInt(process.env.HF_MAX_TOKENS || '150', 10),
  temperature: parseFloat(process.env.HF_TEMPERATURE || '0.7'),
  timeout: parseInt(process.env.HF_TIMEOUT_MS || '10000', 10),
  maxRetries: parseInt(process.env.HF_MAX_RETRIES || '2', 10),
  tipsPerGeneration: parseInt(process.env.TIPS_PER_GENERATION || '3', 10),
  cacheTtlMs: parseInt(process.env.TIPS_CACHE_TTL_MS || String(24 * 60 * 60 * 1000), 10),
  inferenceEndpointUrl: process.env.HF_INFERENCE_ENDPOINT_URL,
}

class HealthTipsService {
  private static instance: HealthTipsService
  private hf: HfInference | null = null
  private cache: LRUCache
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    mlSuccess: 0,
    mlFailures: 0,
    fallbackUsage: 0,
  }

  private constructor() {
    this.cache = new LRUCache(1000, CONFIG.cacheTtlMs)
    this.initializeModel()
  }

  static getInstance(): HealthTipsService {
    if (!HealthTipsService.instance) {
      HealthTipsService.instance = new HealthTipsService()
    }
    return HealthTipsService.instance
  }

  private initializeModel(): void {
    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (apiKey) {
      this.hf = new HfInference(apiKey)
      console.log('✅ HuggingFace inference client initialized')
    } else {
      console.warn('⚠️ HUGGINGFACE_API_KEY not set, will use fallback tips only')
    }
  }

  /**
   * Main method to get health tips for a user
   */
  async getHealthTips(input: HealthTipInput): Promise<GeneratedTip[]> {
    this.metrics.totalRequests++

    // Check cache first
    const cacheKey = `tips:${input.userId}`
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      // Verify context hasn't changed significantly
      const currentHash = await this.getContextHash(input.userId)
      if (cached.contextHash === currentHash) {
        this.metrics.cacheHits++
        return cached.tips
      }
    }

    this.metrics.cacheMisses++

    // Generate new tips
    const tips = await this.generateTips(input)

    // Cache the results
    const contextHash = await this.getContextHash(input.userId)
    this.cache.set(cacheKey, {
      tips,
      cachedAt: Date.now(),
      contextHash,
    })

    return tips
  }

  /**
   * Force generation of new tips (bypasses cache)
   */
  async generateNewTips(input: HealthTipInput): Promise<GeneratedTip[]> {
    this.metrics.totalRequests++
    this.metrics.cacheMisses++

    const tips = await this.generateTips(input)

    // Update cache
    const cacheKey = `tips:${input.userId}`
    const contextHash = await this.getContextHash(input.userId)
    this.cache.set(cacheKey, {
      tips,
      cachedAt: Date.now(),
      contextHash,
    })

    return tips
  }

  /**
   * Core tip generation logic
   */
  private async generateTips(input: HealthTipInput): Promise<GeneratedTip[]> {
    try {
      // Aggregate patient context
      const context = await this.aggregatePatientContext(input.userId)

      // Try ML generation
      if (this.hf) {
        const mlTips = await this.generateWithML(context)
        if (mlTips.length > 0) {
          this.metrics.mlSuccess++
          return mlTips
        }
      }

      // Fallback to static tips
      this.metrics.fallbackUsage++
      return this.getStaticFallbackTips(context)
    } catch (error) {
      console.error('Error generating health tips:', error)
      this.metrics.mlFailures++
      this.metrics.fallbackUsage++
      return this.getStaticFallbackTips()
    }
  }

  /**
   * Aggregate patient context from database
   */
  private async aggregatePatientContext(userId: string): Promise<PatientContext> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patient: {
          include: {
            appointments: {
              where: {
                status: { in: ['COMPLETED', 'CONFIRMED'] },
              },
              orderBy: { dateTime: 'desc' },
              take: 5,
              select: {
                reason: true,
                notes: true,
                dateTime: true,
              },
            },
            prescriptions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
              include: {
                prescriptionMedications: {
                  select: {
                    medicineName: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // Get allergies if patient exists
    let allergies: PatientContext['allergies'] = []
    if (user?.patient) {
      const patientAllergies = await prisma.patientAllergy.findMany({
        where: { patientId: user.patient.id, isActive: true },
        select: {
          allergenName: true,
          severity: true,
        },
      })
      allergies = patientAllergies.map((a) => ({
        allergenName: a.allergenName,
        severity: a.severity,
      }))
    }

    // Calculate age if date of birth is available
    let age: number | undefined
    if (user?.dateOfBirth) {
      const today = new Date()
      const birthDate = new Date(user.dateOfBirth)
      age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
    }

    // Extract conditions from appointment notes (simplified)
    const conditions: string[] = []
    const appointmentNotes = user?.patient?.appointments
      .map((a) => a.notes)
      .filter(Boolean)
      .join(' ') || ''
    
    // Common condition keywords (simplified extraction)
    const conditionKeywords = ['diabetes', 'hypertension', 'asthma', 'anxiety', 'depression']
    for (const keyword of conditionKeywords) {
      if (appointmentNotes.toLowerCase().includes(keyword)) {
        conditions.push(keyword)
      }
    }

    return {
      recentAppointments: user?.patient?.appointments.map((a) => ({
        reason: a.reason,
        dateTime: a.dateTime,
      })) || [],
      activePrescriptions: user?.patient?.prescriptions.flatMap((p) =>
        p.prescriptionMedications.map((m) => ({
          medicineName: m.medicineName,
        }))
      ) || [],
      allergies,
      conditions,
      age,
      gender: user?.gender || undefined,
    }
  }

  /**
   * Generate tips using HuggingFace model
   */
  private async generateWithML(context: PatientContext): Promise<GeneratedTip[]> {
    if (!this.hf) {
      return []
    }

    const prompt = this.buildPrompt(context)
    const endpointUrl = this.getInferenceEndpointUrl()
    
    let lastError: Error | null = null
    for (let attempt = 0; attempt < CONFIG.maxRetries; attempt++) {
      try {
        const startTime = Date.now()
        
        const response = await Promise.race([
          this.hf.textGeneration({
            model: CONFIG.modelId,
            endpointUrl,
            inputs: prompt,
            parameters: {
              max_new_tokens: CONFIG.maxTokens,
              temperature: CONFIG.temperature,
              return_full_text: false,
              do_sample: true,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Inference timeout')), CONFIG.timeout)
          ),
        ])

        const latency = Date.now() - startTime
        console.log(`ML inference completed in ${latency}ms`)

        return this.parseMLResponse(response.generated_text)
      } catch (error) {
        lastError = error as Error
        console.warn(`ML inference attempt ${attempt + 1} failed:`, error)
        
        // Exponential backoff
        if (attempt < CONFIG.maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    if (lastError) {
      throw lastError
    }

    return []
  }

  private getInferenceEndpointUrl(): string {
    if (CONFIG.inferenceEndpointUrl) {
      if (CONFIG.inferenceEndpointUrl.includes('{model}')) {
        return CONFIG.inferenceEndpointUrl.replace('{model}', CONFIG.modelId)
      }
      return CONFIG.inferenceEndpointUrl
    }

    return `https://router.huggingface.co/hf-inference/models/${CONFIG.modelId}`
  }

  /**
   * Build prompt for ML model
   */
  private buildPrompt(context: PatientContext): string {
    const parts: string[] = []

    parts.push('Generate 3 personalized, actionable health tips. Keep each tip brief (1-2 sentences). Do not provide medical diagnoses or treatment recommendations.')
    
    if (context.age) {
      parts.push(`Age group: ${this.getAgeGroup(context.age)}`)
    }

    if (context.conditions.length > 0) {
      parts.push(`Focus areas: ${context.conditions.join(', ')}`)
    }

    if (context.activePrescriptions.length > 0) {
      parts.push(`Currently managing: medications for daily health`)
    }

    if (context.recentAppointments.length > 0) {
      const reasons = context.recentAppointments
        .map((a) => a.reason)
        .filter(Boolean)
        .slice(0, 3)
      if (reasons.length > 0) {
        parts.push(`Recent health focus: ${reasons.join(', ')}`)
      }
    }

    parts.push('\nHealth tips:')

    return parts.join('\n')
  }

  /**
   * Parse ML model response into structured tips
   */
  private parseMLResponse(responseText: string): GeneratedTip[] {
    const tips: GeneratedTip[] = []
    
    // Split by newlines and numbered patterns
    const lines = responseText
      .split(/\n/)
      .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((line) => line.length > 20 && line.length < 500)

    const categories = this.inferCategories(responseText)

    for (let i = 0; i < Math.min(lines.length, CONFIG.tipsPerGeneration); i++) {
      const line = lines[i]
      
      // Basic content validation
      if (this.isValidTip(line)) {
        tips.push({
          id: crypto.randomUUID(),
          text: line,
          category: categories[i] || 'GENERAL_WELLNESS',
          source: 'ML_GENERATED',
          generatedAt: new Date(),
        })
      }
    }

    return tips
  }

  /**
   * Validate a tip meets quality standards
   */
  private isValidTip(text: string): boolean {
    // Check minimum length
    if (text.length < 20) return false

    // Check for inappropriate content
    const blockedPhrases = [
      'diagnose',
      'prescription',
      'medication dose',
      'stop taking',
      'start taking',
      'consult immediately',
    ]
    const lowerText = text.toLowerCase()
    for (const phrase of blockedPhrases) {
      if (lowerText.includes(phrase)) return false
    }

    return true
  }

  /**
   * Infer categories from response text
   */
  private inferCategories(text: string): HealthTipCategory[] {
    const categories: HealthTipCategory[] = []
    const lowerText = text.toLowerCase()

    const categoryKeywords: Record<HealthTipCategory, string[]> = {
      NUTRITION: ['eat', 'food', 'diet', 'nutrition', 'meal', 'vegetable', 'fruit'],
      EXERCISE: ['exercise', 'walk', 'physical', 'activity', 'workout', 'stretch'],
      SLEEP: ['sleep', 'rest', 'bedtime', 'night', 'tired'],
      MENTAL_HEALTH: ['stress', 'anxiety', 'mental', 'relax', 'calm', 'mindful'],
      MEDICATION: ['medication', 'medicine', 'pill', 'dose'],
      PREVENTIVE_CARE: ['check-up', 'screening', 'vaccine', 'prevention'],
      CHRONIC_CONDITION: ['manage', 'monitor', 'condition', 'chronic'],
      LIFESTYLE: ['habit', 'lifestyle', 'routine', 'daily'],
      GENERAL_WELLNESS: ['health', 'wellness', 'well-being'],
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          categories.push(category as HealthTipCategory)
          break
        }
      }
    }

    // Fill with general wellness if not enough categories
    while (categories.length < CONFIG.tipsPerGeneration) {
      categories.push('GENERAL_WELLNESS')
    }

    return categories
  }

  /**
   * Get static fallback tips based on context
   */
  private getStaticFallbackTips(context?: PatientContext): GeneratedTip[] {
    const tips: GeneratedTip[] = []
    const usedTips = new Set<string>()

    // Determine relevant categories based on context
    let relevantCategories: HealthTipCategory[] = ['GENERAL_WELLNESS', 'NUTRITION', 'EXERCISE']

    if (context) {
      if (context.conditions.includes('diabetes')) {
        relevantCategories = ['NUTRITION', 'EXERCISE', 'MEDICATION']
      } else if (context.conditions.includes('hypertension')) {
        relevantCategories = ['NUTRITION', 'EXERCISE', 'LIFESTYLE']
      } else if (context.conditions.includes('anxiety') || context.conditions.includes('depression')) {
        relevantCategories = ['MENTAL_HEALTH', 'SLEEP', 'EXERCISE']
      } else if (context.activePrescriptions.length > 0) {
        relevantCategories.push('MEDICATION')
      }

      if (context.age && context.age > 50) {
        relevantCategories.push('PREVENTIVE_CARE')
      }
    }

    // Get unique categories
    const uniqueCategories = [...new Set(relevantCategories)].slice(0, CONFIG.tipsPerGeneration)

    for (const category of uniqueCategories) {
      const categoryTips = STATIC_TIPS[category]
      const availableTips = categoryTips.filter((t) => !usedTips.has(t))
      
      if (availableTips.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableTips.length)
        const selectedTip = availableTips[randomIndex]
        usedTips.add(selectedTip)
        
        tips.push({
          id: crypto.randomUUID(),
          text: selectedTip,
          category,
          source: 'STATIC_FALLBACK',
          generatedAt: new Date(),
        })
      }
    }

    // Fill remaining with general wellness if needed
    while (tips.length < CONFIG.tipsPerGeneration) {
      const generalTips = STATIC_TIPS.GENERAL_WELLNESS.filter((t) => !usedTips.has(t))
      if (generalTips.length === 0) break
      
      const randomIndex = Math.floor(Math.random() * generalTips.length)
      const selectedTip = generalTips[randomIndex]
      usedTips.add(selectedTip)
      
      tips.push({
        id: crypto.randomUUID(),
        text: selectedTip,
        category: 'GENERAL_WELLNESS',
        source: 'STATIC_FALLBACK',
        generatedAt: new Date(),
      })
    }

    return tips
  }

  /**
   * Get age group for prompt
   */
  private getAgeGroup(age: number): string {
    if (age < 18) return 'youth'
    if (age < 30) return 'young adult'
    if (age < 50) return 'adult'
    if (age < 65) return 'middle-aged'
    return 'senior'
  }

  /**
   * Generate hash of patient context for cache invalidation
   */
  private async getContextHash(userId: string): Promise<string> {
    const context = await this.aggregatePatientContext(userId)
    const contextString = JSON.stringify({
      appointmentCount: context.recentAppointments.length,
      prescriptionCount: context.activePrescriptions.length,
      allergyCount: context.allergies.length,
      conditions: context.conditions.sort(),
    })
    return crypto.createHash('md5').update(contextString).digest('hex')
  }

  /**
   * Invalidate cache for a user
   */
  invalidateUserCache(userId: string): void {
    this.cache.invalidate(`tips:${userId}`)
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    const cacheStats = this.cache.getStats()
    return {
      ...this.metrics,
      cacheSize: cacheStats.size,
      cacheMaxSize: cacheStats.maxSize,
      cacheHitRate: this.metrics.totalRequests > 0
        ? (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(2) + '%'
        : '0%',
    }
  }
}

// Export singleton instance
export const healthTipsService = HealthTipsService.getInstance()

// Export types
export type { HealthTipCategory, PatientContext }
