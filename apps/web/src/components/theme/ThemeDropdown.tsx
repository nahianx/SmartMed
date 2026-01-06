/**
 * Theme Dropdown Component
 * 
 * Dropdown menu for selecting between light, dark, and system themes.
 */

'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useRef } from 'react'
import { Sun, Moon, Monitor, ChevronDown, Check } from 'lucide-react'

interface ThemeDropdownProps {
  /** Additional CSS classes */
  className?: string
}

type ThemeOption = 'light' | 'dark' | 'system'

const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeDropdown({ className = '' }: ThemeDropdownProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  if (!mounted) {
    return (
      <div className={`relative ${className}`}>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted"
          disabled
        >
          <div className="h-4 w-4" />
          <span className="text-sm">Theme</span>
        </button>
      </div>
    )
  }

  const currentTheme = themeOptions.find(t => t.value === theme) || themeOptions[2]
  const CurrentIcon = currentTheme.icon

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted border border-border transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{currentTheme.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg bg-card shadow-lg border border-border py-1 z-50">
          {themeOptions.map(option => {
            const Icon = option.icon
            const isSelected = theme === option.value
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground hover:bg-muted'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{option.label}</span>
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ThemeDropdown
