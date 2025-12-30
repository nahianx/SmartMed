'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/services/apiClient'

// Types
export interface HealthTip {
  id: string
  text: string
  category: HealthTipCategory
  source: 'ML_GENERATED' | 'STATIC_FALLBACK'
  isRead: boolean
  isArchived: boolean
  expiresAt: string
  createdAt: string
}

export type HealthTipCategory =
  | 'GENERAL_WELLNESS'
  | 'NUTRITION'
  | 'EXERCISE'
  | 'MENTAL_HEALTH'
  | 'SLEEP'
  | 'MEDICATION'
  | 'PREVENTIVE_CARE'
  | 'CHRONIC_CONDITION'
  | 'LIFESTYLE'

export interface HealthTipPreferences {
  enabled: boolean
  categories: HealthTipCategory[]
  frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY'
  deliveryMethod: 'IN_APP' | 'EMAIL' | 'BOTH'
  lastGeneratedAt: string | null
}

interface HealthTipsResponse {
  items: HealthTip[]
  total: number
  source: 'database' | 'generated'
  message?: string
}

interface PreferencesResponse {
  preferences: HealthTipPreferences
  message?: string
}

// API functions
export async function fetchHealthTips(
  limit = 10,
  offset = 0,
  includeArchived = false
): Promise<HealthTipsResponse> {
  const { data } = await apiClient.get<HealthTipsResponse>('/health-tips', {
    params: { limit, offset, includeArchived },
  })
  return data
}

export async function generateHealthTips(): Promise<HealthTipsResponse> {
  const { data } = await apiClient.post<HealthTipsResponse>(
    '/health-tips/generate',
    { forceRefresh: true }
  )
  return data
}

export async function markTipAsRead(tipId: string): Promise<void> {
  await apiClient.post(`/health-tips/${tipId}/read`)
}

export async function archiveTip(tipId: string): Promise<void> {
  await apiClient.post(`/health-tips/${tipId}/archive`)
}

export async function fetchPreferences(): Promise<HealthTipPreferences> {
  const { data } = await apiClient.get<PreferencesResponse>(
    '/health-tips/preferences'
  )
  return data.preferences
}

export async function updatePreferences(
  updates: Partial<HealthTipPreferences>
): Promise<HealthTipPreferences> {
  const { data } = await apiClient.put<PreferencesResponse>(
    '/health-tips/preferences',
    updates
  )
  return data.preferences
}

// Custom hook for health tips
export function useHealthTips(initialLimit = 10) {
  const [tips, setTips] = useState<HealthTip[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [generating, setGenerating] = useState(false)

  const loadTips = useCallback(async (newOffset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchHealthTips(initialLimit, newOffset)
      if (newOffset === 0) {
        setTips(response.items)
      } else {
        setTips((prev) => [...prev, ...response.items])
      }
      setTotal(response.total)
      setOffset(newOffset)
    } catch (err) {
      setError('Failed to load health tips')
      console.error('Error loading health tips:', err)
    } finally {
      setLoading(false)
    }
  }, [initialLimit])

  const refresh = useCallback(async () => {
    await loadTips(0)
  }, [loadTips])

  const loadMore = useCallback(async () => {
    await loadTips(offset + initialLimit)
  }, [loadTips, offset, initialLimit])

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const response = await generateHealthTips()
      setTips(response.items)
      setTotal(response.total)
      setOffset(0)
    } catch (err) {
      setError('Failed to generate new tips')
      console.error('Error generating tips:', err)
    } finally {
      setGenerating(false)
    }
  }, [])

  const markRead = useCallback(async (tipId: string) => {
    try {
      await markTipAsRead(tipId)
      setTips((prev) =>
        prev.map((tip) =>
          tip.id === tipId ? { ...tip, isRead: true } : tip
        )
      )
    } catch (err) {
      console.error('Error marking tip as read:', err)
    }
  }, [])

  const archive = useCallback(async (tipId: string) => {
    try {
      await archiveTip(tipId)
      setTips((prev) => prev.filter((tip) => tip.id !== tipId))
      setTotal((prev) => prev - 1)
    } catch (err) {
      console.error('Error archiving tip:', err)
    }
  }, [])

  useEffect(() => {
    loadTips(0)
  }, [loadTips])

  return {
    tips,
    total,
    loading,
    error,
    generating,
    refresh,
    loadMore,
    generate,
    markRead,
    archive,
    hasMore: tips.length < total,
  }
}

// Custom hook for preferences
export function useHealthTipPreferences() {
  const [preferences, setPreferences] = useState<HealthTipPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const prefs = await fetchPreferences()
      setPreferences(prefs)
    } catch (err) {
      setError('Failed to load preferences')
      console.error('Error loading preferences:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (updates: Partial<HealthTipPreferences>) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await updatePreferences(updates)
      setPreferences(updated)
      return true
    } catch (err) {
      setError('Failed to save preferences')
      console.error('Error saving preferences:', err)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return {
    preferences,
    loading,
    saving,
    error,
    save,
    reload: load,
  }
}
