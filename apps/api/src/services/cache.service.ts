/**
 * Cache Service
 * 
 * Provides a unified caching interface with support for Redis and in-memory fallback.
 * Used primarily for caching RxNav API responses to improve performance and reduce API calls.
 */

import { env } from '../config/env'

// ==========================================
// Types
// ==========================================

interface CacheOptions {
  ttl?: number // Time to live in seconds
}

interface CacheStats {
  hits: number
  misses: number
  size: number
}

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

// ==========================================
// In-Memory Cache Implementation
// ==========================================

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 }
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      this.stats.misses++
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      this.stats.size = this.cache.size
      return null
    }

    this.stats.hits++
    return entry.value
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl ?? env.DRUG_CACHE_TTL
    const expiresAt = Date.now() + (ttl * 1000)

    this.cache.set(key, { value, expiresAt })
    this.stats.size = this.cache.size
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key)
    this.stats.size = this.cache.size
    return deleted
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.stats.size = 0
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  private cleanup(): void {
    const now = Date.now()
    let deletedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    this.stats.size = this.cache.size

    if (deletedCount > 0 && env.NODE_ENV === 'development') {
      console.log(`[Cache] Cleanup: removed ${deletedCount} expired entries`)
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

// ==========================================
// Redis Cache Implementation (Optional)
// ==========================================

class RedisCache {
  private client: any // Will be Redis client when connected
  private connected: boolean = false
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 }

  async connect(): Promise<boolean> {
    if (!env.REDIS_URL) {
      console.log('[Cache] Redis URL not configured, using in-memory cache')
      return false
    }

    try {
      // Dynamic import to avoid requiring redis if not used
      const { createClient } = await import('redis')
      
      this.client = createClient({ url: env.REDIS_URL })
      
      this.client.on('error', (err: Error) => {
        console.error('[Cache] Redis error:', err.message)
        this.connected = false
      })

      this.client.on('connect', () => {
        console.log('[Cache] Redis connected')
        this.connected = true
      })

      await this.client.connect()
      return true
    } catch (error) {
      console.warn('[Cache] Failed to connect to Redis:', error)
      return false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected) return null

    try {
      const data = await this.client.get(key)
      if (!data) {
        this.stats.misses++
        return null
      }
      this.stats.hits++
      return JSON.parse(data) as T
    } catch (error) {
      console.error('[Cache] Redis get error:', error)
      this.stats.misses++
      return null
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.connected) return

    const ttl = options?.ttl ?? env.DRUG_CACHE_TTL

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error('[Cache] Redis set error:', error)
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.connected) return false

    try {
      const result = await this.client.del(key)
      return result > 0
    } catch (error) {
      console.error('[Cache] Redis delete error:', error)
      return false
    }
  }

  async clear(): Promise<void> {
    if (!this.connected) return

    try {
      await this.client.flushDb()
    } catch (error) {
      console.error('[Cache] Redis clear error:', error)
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.connected) return false

    try {
      const exists = await this.client.exists(key)
      return exists > 0
    } catch (error) {
      return false
    }
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  isConnected(): boolean {
    return this.connected
  }

  async disconnect(): Promise<void> {
    if (this.connected && this.client) {
      await this.client.quit()
      this.connected = false
    }
  }
}

// ==========================================
// Cache Service (Unified Interface)
// ==========================================

class CacheService {
  private inMemoryCache: InMemoryCache
  private redisCache: RedisCache
  private useRedis: boolean = false

  constructor() {
    this.inMemoryCache = new InMemoryCache()
    this.redisCache = new RedisCache()
  }

  async initialize(): Promise<void> {
    if (env.REDIS_URL) {
      this.useRedis = await this.redisCache.connect()
    }

    if (!this.useRedis) {
      console.log('[Cache] Using in-memory cache')
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.useRedis) {
      const result = await this.redisCache.get<T>(key)
      if (result !== null) return result
    }
    return this.inMemoryCache.get<T>(key)
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Always set in memory cache for fast access
    await this.inMemoryCache.set(key, value, options)

    // Also set in Redis if available
    if (this.useRedis) {
      await this.redisCache.set(key, value, options)
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    const memoryDeleted = await this.inMemoryCache.delete(key)
    
    if (this.useRedis) {
      await this.redisCache.delete(key)
    }

    return memoryDeleted
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    await this.inMemoryCache.clear()
    
    if (this.useRedis) {
      await this.redisCache.clear()
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (this.useRedis && await this.redisCache.has(key)) {
      return true
    }
    return this.inMemoryCache.has(key)
  }

  /**
   * Get cache statistics
   */
  getStats(): { inMemory: CacheStats; redis?: CacheStats; hitRate: number } {
    const inMemoryStats = this.inMemoryCache.getStats()
    const totalHits = inMemoryStats.hits
    const totalMisses = inMemoryStats.misses
    const hitRate = totalHits + totalMisses > 0 
      ? (totalHits / (totalHits + totalMisses)) * 100 
      : 0

    const stats: { inMemory: CacheStats; redis?: CacheStats; hitRate: number } = {
      inMemory: inMemoryStats,
      hitRate: Math.round(hitRate * 100) / 100
    }

    if (this.useRedis) {
      stats.redis = this.redisCache.getStats()
    }

    return stats
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    await this.set(key, value, options)
    return value
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    this.inMemoryCache.destroy()
    await this.redisCache.disconnect()
  }
}

// ==========================================
// Cache Key Generators
// ==========================================

export const CacheKeys = {
  drugSearch: (term: string) => `drug:search:${term.toLowerCase().trim()}`,
  drugDetail: (rxcui: string) => `drug:detail:${rxcui}`,
  drugSynonyms: (rxcui: string) => `drug:synonyms:${rxcui}`,
  drugInteractions: (rxcuis: string[]) => `drug:interactions:${[...rxcuis].sort().join(',')}`,
  drugClasses: (rxcui: string) => `drug:classes:${rxcui}`,
  allergyCheck: (patientId: string, rxcui: string) => `allergy:check:${patientId}:${rxcui}`,
}

// ==========================================
// Singleton Export
// ==========================================

export const cacheService = new CacheService()

export default cacheService
