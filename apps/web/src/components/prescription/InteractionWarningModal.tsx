'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Info,
  X,
  ShieldAlert,
  Pill,
  CheckCircle2,
} from 'lucide-react'
import { DrugInteraction, AllergyConflict } from '@/services/drugService'

interface InteractionWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: (overrideReason: string) => void
  onCancel: () => void
  interactions: DrugInteraction[]
  allergyConflicts: AllergyConflict[]
  warnings: string[]
}

type SeverityLevel = 'HIGH' | 'MODERATE' | 'LOW'

export default function InteractionWarningModal({
  isOpen,
  onClose,
  onProceed,
  onCancel,
  interactions,
  allergyConflicts,
  warnings,
}: InteractionWarningModalProps) {
  const [overrideReason, setOverrideReason] = useState('')
  const [acknowledgedInteractions, setAcknowledgedInteractions] = useState<Set<string>>(new Set())
  const [acknowledgedAllergies, setAcknowledgedAllergies] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // Group interactions by severity
  const groupedInteractions: Record<SeverityLevel, DrugInteraction[]> = {
    HIGH: [],
    MODERATE: [],
    LOW: [],
  }

  interactions.forEach((interaction) => {
    groupedInteractions[interaction.severity].push(interaction)
  })

  // Check if all severe items are acknowledged
  const severeInteractions = [
    ...groupedInteractions.HIGH,
  ]
  const severeAllergyConflicts = allergyConflicts.filter(
    (c) => c.severity === 'SEVERE' || c.severity === 'LIFE_THREATENING'
  )
  
  const allSevereAcknowledged =
    severeInteractions.every((i) =>
      acknowledgedInteractions.has(`${i.drug1Rxcui}-${i.drug2Rxcui}`)
    ) &&
    severeAllergyConflicts.every((c) => acknowledgedAllergies.has(c.allergyId))

  const hasAnySevere = severeInteractions.length > 0 || severeAllergyConflicts.length > 0

  const handleProceed = () => {
    setError(null)

    if (hasAnySevere && !allSevereAcknowledged) {
      setError('Please acknowledge all severe warnings before proceeding')
      return
    }

    if (hasAnySevere && !overrideReason.trim()) {
      setError('Please provide a clinical justification for proceeding')
      return
    }

    if (overrideReason.trim().length < 10) {
      setError('Please provide a more detailed justification (at least 10 characters)')
      return
    }

    onProceed(overrideReason.trim())
  }

  const toggleInteractionAcknowledged = (interaction: DrugInteraction) => {
    const key = `${interaction.drug1Rxcui}-${interaction.drug2Rxcui}`
    const newSet = new Set(acknowledgedInteractions)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setAcknowledgedInteractions(newSet)
  }

  const toggleAllergyAcknowledged = (allergyId: string) => {
    const newSet = new Set(acknowledgedAllergies)
    if (newSet.has(allergyId)) {
      newSet.delete(allergyId)
    } else {
      newSet.add(allergyId)
    }
    setAcknowledgedAllergies(newSet)
  }

  const getSeverityConfig = (severity: SeverityLevel) => {
    switch (severity) {
      case 'HIGH':
        return {
          icon: AlertOctagon,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          iconColor: 'text-red-600',
          badgeColor: 'bg-red-100 text-red-800',
          label: 'High',
        }
      case 'MODERATE':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-600',
          badgeColor: 'bg-yellow-100 text-yellow-800',
          label: 'Moderate',
        }
      case 'LOW':
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-600',
          badgeColor: 'bg-blue-100 text-blue-800',
          label: 'Minor',
        }
    }
  }

  const getAllergyConfig = (severity: string) => {
    switch (severity) {
      case 'LIFE_THREATENING':
        return {
          icon: AlertOctagon,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          iconColor: 'text-red-600',
          badgeColor: 'bg-red-100 text-red-800',
        }
      case 'SEVERE':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-700',
          iconColor: 'text-orange-600',
          badgeColor: 'bg-orange-100 text-orange-800',
        }
      case 'MODERATE':
        return {
          icon: AlertCircle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-600',
          badgeColor: 'bg-yellow-100 text-yellow-800',
        }
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-600',
          badgeColor: 'bg-blue-100 text-blue-800',
        }
    }
  }

  const renderInteractionCard = (interaction: DrugInteraction) => {
    const config = getSeverityConfig(interaction.severity)
    const Icon = config.icon
    const key = `${interaction.drug1Rxcui}-${interaction.drug2Rxcui}`
    const isAcknowledged = acknowledgedInteractions.has(key)
    const isSevere = interaction.severity === 'HIGH'

    return (
      <div
        key={key}
        className={`
          p-4 rounded-lg border ${config.bgColor} ${config.borderColor}
          ${isAcknowledged ? 'opacity-60' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.badgeColor}`}>
                {config.label}
              </span>
            </div>
            <p className={`mt-2 font-medium ${config.textColor}`}>
              {interaction.drug1Name} + {interaction.drug2Name}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {interaction.description}
            </p>
            {interaction.source && (
              <p className="mt-1 text-xs text-slate-500">
                Source: {interaction.source}
              </p>
            )}
            
            {isSevere && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAcknowledged}
                  onChange={() => toggleInteractionAcknowledged(interaction)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  I acknowledge this interaction
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderAllergyCard = (conflict: AllergyConflict) => {
    const config = getAllergyConfig(conflict.severity)
    const Icon = config.icon
    const isAcknowledged = acknowledgedAllergies.has(conflict.allergyId)
    const isSevere = conflict.severity === 'SEVERE' || conflict.severity === 'LIFE_THREATENING'

    return (
      <div
        key={conflict.allergyId}
        className={`
          p-4 rounded-lg border ${config.bgColor} ${config.borderColor}
          ${isAcknowledged ? 'opacity-60' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.badgeColor}`}>
                {conflict.severity} Allergy
              </span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                {conflict.matchType === 'exact' ? 'Exact Match' :
                 conflict.matchType === 'ingredient' ? 'Ingredient Match' :
                 conflict.matchType === 'class' ? 'Drug Class Match' : 'Cross-Reactive'}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                conflict.confidence === 'high' ? 'bg-red-100 text-red-700' :
                conflict.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {conflict.confidence} confidence
              </span>
            </div>
            <p className={`mt-2 font-medium ${config.textColor}`}>
              Patient is allergic to: {conflict.allergen}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Medication: <span className="font-medium">{conflict.matchedDrugName}</span>
            </p>
            {conflict.reaction && (
              <p className="mt-1 text-sm text-slate-500">
                Known reaction: {conflict.reaction}
              </p>
            )}
            
            {isSevere && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAcknowledged}
                  onChange={() => toggleAllergyAcknowledged(conflict.allergyId)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  I acknowledge this allergy conflict
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3 rounded-t-xl">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-amber-800">
              Drug Safety Warning
            </h2>
            <p className="text-sm text-amber-700">
              Review the following warnings before proceeding
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-amber-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <Info className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Allergy conflicts */}
          {allergyConflicts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Allergy Conflicts ({allergyConflicts.length})
              </h3>
              <div className="space-y-3">
                {allergyConflicts.map(renderAllergyCard)}
              </div>
            </div>
          )}

          {/* Drug interactions by severity */}
          {Object.entries(groupedInteractions).map(([severity, items]) => {
            if (items.length === 0) return null
            const config = getSeverityConfig(severity as SeverityLevel)
            
            return (
              <div key={severity} className="space-y-3">
                <h3 className={`font-medium flex items-center gap-2 ${config.textColor}`}>
                  <Pill className="h-5 w-5" />
                  {config.label} Interactions ({items.length})
                </h3>
                <div className="space-y-3">
                  {items.map(renderInteractionCard)}
                </div>
              </div>
            )
          })}

          {/* Override reason input */}
          {hasAnySevere && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Clinical Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Please provide clinical justification for proceeding despite the warnings..."
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">
                This will be recorded in the patient's medical record
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Go Back & Modify
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={hasAnySevere && (!allSevereAcknowledged || !overrideReason.trim())}
            className={`
              flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2
              ${hasAnySevere 
                ? 'bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            <CheckCircle2 className="h-4 w-4" />
            {hasAnySevere ? 'Proceed with Override' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  )
}
