'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Pill, Loader2, AlertCircle, X, Info } from 'lucide-react'
import { drugService, DrugSearchResult, DrugDetail } from '@/services/drugService'

interface DrugAutocompleteProps {
  value: string
  onChange: (value: string, rxcui?: string | null, drugInfo?: DrugDetail | null) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  showDrugInfo?: boolean
  onDrugSelect?: (drug: DrugSearchResult) => void
  error?: string
}

export default function DrugAutocomplete({
  value,
  onChange,
  placeholder = 'Search for medication...',
  required = false,
  disabled = false,
  className = '',
  showDrugInfo = true,
  onDrugSelect,
  error: externalError,
}: DrugAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<DrugSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDrug, setSelectedDrug] = useState<DrugSearchResult | null>(null)
  const [drugInfo, setDrugInfo] = useState<DrugDetail | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync external value with input
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value)
    }
  }, [value])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search function
  const searchDrugs = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const results = await drugService.searchDrugs(term)
      setSuggestions(results)
      setIsOpen(results.length > 0)
      setHighlightedIndex(-1)
    } catch (err: any) {
      console.error('Drug search error:', err)
      setError('Failed to search medications')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setSelectedDrug(null)
    setDrugInfo(null)
    onChange(newValue, null, null)

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      searchDrugs(newValue)
    }, 300)
  }

  // Handle drug selection
  const handleSelectDrug = async (drug: DrugSearchResult) => {
    setInputValue(drug.name)
    setSelectedDrug(drug)
    setSuggestions([])
    setIsOpen(false)
    onChange(drug.name, drug.rxcui, null)
    onDrugSelect?.(drug)

    // Fetch detailed drug info
    if (showDrugInfo && drug.rxcui) {
      setLoadingInfo(true)
      try {
        const info = await drugService.getDrugDetails(drug.rxcui)
        setDrugInfo(info)
        onChange(drug.name, drug.rxcui, info)
      } catch (err) {
        console.error('Failed to fetch drug info:', err)
      } finally {
        setLoadingInfo(false)
      }
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectDrug(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // Clear selection
  const handleClear = () => {
    setInputValue('')
    setSelectedDrug(null)
    setDrugInfo(null)
    setSuggestions([])
    setIsOpen(false)
    onChange('', null, null)
    inputRef.current?.focus()
  }

  // Get severity color for drug class
  const getDrugTypeColor = (tty?: string) => {
    switch (tty) {
      case 'SBD':
        return 'bg-blue-100 text-blue-700'
      case 'SCD':
        return 'bg-green-100 text-green-700'
      case 'GPCK':
      case 'BPCK':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  // Format drug type label
  const formatDrugType = (tty?: string) => {
    switch (tty) {
      case 'SBD':
        return 'Brand'
      case 'SCD':
        return 'Generic'
      case 'GPCK':
        return 'Generic Pack'
      case 'BPCK':
        return 'Brand Pack'
      case 'IN':
        return 'Ingredient'
      case 'MIN':
        return 'Multi-Ingredient'
      default:
        return tty || 'Drug'
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${(error || externalError) ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'}
            text-sm
          `}
          aria-autocomplete="list"
          aria-controls="drug-suggestions"
          aria-expanded={isOpen}
        />
        
        {(inputValue || selectedDrug) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error message */}
      {(error || externalError) && (
        <div className="mt-1 flex items-center gap-1 text-red-600 text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>{error || externalError}</span>
        </div>
      )}

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div
          id="drug-suggestions"
          className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((drug, index) => (
            <button
              key={drug.rxcui}
              type="button"
              onClick={() => handleSelectDrug(drug)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                w-full px-4 py-3 text-left flex items-start gap-3
                hover:bg-primary/10 transition-colors
                ${highlightedIndex === index ? 'bg-primary/10' : ''}
                ${index !== suggestions.length - 1 ? 'border-b border-border' : ''}
              `}
              role="option"
              aria-selected={highlightedIndex === index}
            >
              <Pill className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {drug.name}
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getDrugTypeColor(drug.tty)}`}>
                    {formatDrugType(drug.tty)}
                  </span>
                </div>
                {drug.synonym && drug.synonym !== drug.name && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Also known as: {drug.synonym}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && suggestions.length === 0 && inputValue.length >= 2 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-4">
          <p className="text-muted-foreground text-sm text-center">
            No medications found for "{inputValue}"
          </p>
          <p className="text-muted-foreground/70 text-xs text-center mt-1">
            You can still enter the name manually
          </p>
        </div>
      )}

      {/* Selected drug info panel */}
      {showDrugInfo && selectedDrug && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-lg">
          {loadingInfo ? (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading drug information...</span>
            </div>
          ) : drugInfo ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">{drugInfo.name}</p>
                  {drugInfo.genericName && (
                    <p className="text-muted-foreground">
                      Generic: {drugInfo.genericName}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                {drugInfo.strength && (
                  <div>
                    <span className="text-muted-foreground">Strength:</span>{' '}
                    <span className="text-foreground">{drugInfo.strength}</span>
                  </div>
                )}
                {drugInfo.dosageForm && (
                  <div>
                    <span className="text-muted-foreground">Form:</span>{' '}
                    <span className="text-foreground">{drugInfo.dosageForm}</span>
                  </div>
                )}
                {drugInfo.route && (
                  <div>
                    <span className="text-muted-foreground">Route:</span>{' '}
                    <span className="text-foreground">{drugInfo.route}</span>
                  </div>
                )}
                {drugInfo.drugClass && (
                  <div>
                    <span className="text-muted-foreground">Class:</span>{' '}
                    <span className="text-foreground">{drugInfo.drugClass}</span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                RxCUI: {drugInfo.rxcui}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Pill className="h-4 w-4" />
              <span className="text-sm font-medium">{selectedDrug.name}</span>
              <span className="text-xs text-muted-foreground">
                (RxCUI: {selectedDrug.rxcui})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
