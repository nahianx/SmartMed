/**
 * Theme Toggle Component
 * 
 * Button that toggles between light, dark, and system themes.
 */

'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'

interface ThemeToggleProps {
  /** Show as icon-only button */
  iconOnly?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ThemeToggle({ iconOnly = false, className = '' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder to avoid layout shift
    return (
      <button
        className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}
        disabled
      >
        <div className="h-5 w-5" />
      </button>
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-5 w-5" />
    }
    if (resolvedTheme === 'dark') {
      return <Moon className="h-5 w-5" />
    }
    return <Sun className="h-5 w-5" />
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      default:
        return 'System'
    }
  }

  if (iconOnly) {
    return (
      <button
        onClick={cycleTheme}
        className={`p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
        title={`Theme: ${getLabel()}`}
        aria-label={`Current theme: ${getLabel()}. Click to change.`}
      >
        {getIcon()}
      </button>
    )
  }

  return (
    <button
      onClick={cycleTheme}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
    >
      {getIcon()}
      <span className="text-sm font-medium">{getLabel()}</span>
    </button>
  )
}

export default ThemeToggle
