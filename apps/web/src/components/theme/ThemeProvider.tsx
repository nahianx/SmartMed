/**
 * Theme Provider Component
 * 
 * Provides dark mode support using next-themes.
 * Wraps the application to enable theme switching.
 */

'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="smartmed-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export default ThemeProvider
