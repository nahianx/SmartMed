import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../context/AuthContext'
import { AppToaster } from '../components/ui/toaster'
import { Providers } from '../components/providers'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorProvider } from '@/components/error/error_provider'
import React from 'react'

const queryClient = new QueryClient()

export const metadata: Metadata = {
  title: 'SmartMed - Healthcare Management System',
  description: 'Modern healthcare management and patient care platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <ErrorProvider>
            <AuthProvider>
              <Providers>
                {children}
                <AppToaster />
              </Providers>
            </AuthProvider>
          </ErrorProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
