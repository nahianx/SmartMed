import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../context/AuthContext'
import { AppToaster } from '../components/ui/toaster'
import { Providers } from '../components/providers'
import { ErrorProvider } from '@/components/error/error_provider'
import React from 'react'

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
        <Providers>
          <ErrorProvider>
            <AuthProvider>
              {children}
              <AppToaster />
            </AuthProvider>
          </ErrorProvider>
        </Providers>
      </body>
    </html>
  )
}
