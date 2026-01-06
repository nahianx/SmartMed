'use client'

import { useState } from 'react'
import {
  Settings,
  Save,
  RefreshCw,
  Bell,
  Mail,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Button, Switch, Label } from '@smartmed/ui'
import {
  useHealthTipPreferences,
  type HealthTipCategory,
  type HealthTipPreferences,
} from './useHealthTips'
import { CategoryBadge, categoryConfig } from './HealthTipCard'

const ALL_CATEGORIES: HealthTipCategory[] = [
  'GENERAL_WELLNESS',
  'NUTRITION',
  'EXERCISE',
  'MENTAL_HEALTH',
  'SLEEP',
  'MEDICATION',
  'PREVENTIVE_CARE',
  'CHRONIC_CONDITION',
  'LIFESTYLE',
]

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BI_WEEKLY', label: 'Every 2 Weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
] as const

const DELIVERY_OPTIONS = [
  { value: 'IN_APP', label: 'In-App Only', icon: Bell },
  { value: 'EMAIL', label: 'Email Only', icon: Mail },
  { value: 'BOTH', label: 'Both', icon: Bell },
] as const

interface HealthTipsPreferencesProps {
  onSaved?: () => void
  className?: string
}

export function HealthTipsPreferences({
  onSaved,
  className = '',
}: HealthTipsPreferencesProps) {
  const { preferences, loading, saving, error, save, reload } =
    useHealthTipPreferences()

  const [localPrefs, setLocalPrefs] = useState<Partial<HealthTipPreferences>>(
    {}
  )
  const [hasChanges, setHasChanges] = useState(false)

  // Merge local changes with loaded preferences
  const currentPrefs = { ...preferences, ...localPrefs }

  const updateLocal = (updates: Partial<HealthTipPreferences>) => {
    setLocalPrefs((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const handleToggleEnabled = () => {
    updateLocal({ enabled: !currentPrefs.enabled })
  }

  const handleToggleCategory = (category: HealthTipCategory) => {
    const current = currentPrefs.categories || []
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category]
    updateLocal({ categories: updated })
  }

  const handleFrequencyChange = (
    frequency: HealthTipPreferences['frequency']
  ) => {
    updateLocal({ frequency })
  }

  const handleDeliveryChange = (
    deliveryMethod: HealthTipPreferences['deliveryMethod']
  ) => {
    updateLocal({ deliveryMethod })
  }

  const handleSave = async () => {
    if (!hasChanges) return
    const success = await save(localPrefs)
    if (success) {
      setLocalPrefs({})
      setHasChanges(false)
      onSaved?.()
    }
  }

  const handleReset = () => {
    setLocalPrefs({})
    setHasChanges(false)
  }

  if (loading) {
    return (
      <div className={`space-y-6 animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-24 bg-gray-100 rounded" />
        <div className="h-24 bg-gray-100 rounded" />
        <div className="h-24 bg-gray-100 rounded" />
      </div>
    )
  }

  if (error && !preferences) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={reload} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Health Tips Preferences
          </h2>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleReset}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3">
          {currentPrefs.enabled ? (
            <ToggleRight className="h-6 w-6 text-green-600" />
          ) : (
            <ToggleLeft className="h-6 w-6 text-muted-foreground" />
          )}
          <div>
            <Label className="text-base font-medium">
              Enable Health Tips
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive personalized health tips based on your medical profile
            </p>
          </div>
        </div>
        <Switch
          checked={currentPrefs.enabled ?? true}
          onCheckedChange={handleToggleEnabled}
        />
      </div>

      {/* Categories Selection */}
      <div
        className={`p-4 rounded-lg border border-border bg-card ${
          !currentPrefs.enabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <Label className="text-base font-medium block mb-2">
          Tip Categories
        </Label>
        <p className="text-sm text-muted-foreground mb-4">
          Select the types of health tips you want to receive. Leave empty to receive
          tips from all categories.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((category) => (
            <CategoryBadge
              key={category}
              category={category}
              selected={(currentPrefs.categories || []).includes(category)}
              onClick={() => handleToggleCategory(category)}
            />
          ))}
        </div>
      </div>

      {/* Frequency Selection */}
      <div
        className={`p-4 rounded-lg border border-border bg-card ${
          !currentPrefs.enabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <Label className="text-base font-medium block mb-2">
          Tip Frequency
        </Label>
        <p className="text-sm text-muted-foreground mb-4">
          How often would you like to receive new health tips?
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FREQUENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFrequencyChange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPrefs.frequency === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Method */}
      <div
        className={`p-4 rounded-lg border border-border bg-card ${
          !currentPrefs.enabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <Label className="text-base font-medium block mb-2">
          Delivery Method
        </Label>
        <p className="text-sm text-muted-foreground mb-4">
          How would you like to receive your health tips?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DELIVERY_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = currentPrefs.deliveryMethod === option.value
            return (
              <button
                key={option.value}
                onClick={() => handleDeliveryChange(option.value)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Last Generated Info */}
      {currentPrefs.lastGeneratedAt && (
        <div className="text-sm text-muted-foreground text-center">
          Last tips generated:{' '}}
          {new Date(currentPrefs.lastGeneratedAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
