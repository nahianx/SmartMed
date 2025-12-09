'use client'

import { createContext, useContext, ReactNode } from 'react'

interface ErrorContextType {
  // Add error tracking methods here if needed in the future
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

interface ErrorProviderProps {
  children: ReactNode
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  return (
    <ErrorContext.Provider value={{}}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useError() {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}