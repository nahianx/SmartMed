'use client'

import { createContext, useContext, ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'

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
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '12px 16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            duration: 8000, // Errors stay longer
          },
        }}
      />
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
