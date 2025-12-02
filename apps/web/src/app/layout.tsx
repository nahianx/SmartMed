import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../context/AuthContext'
import { AppToaster } from '../components/ui/toaster'
import { Providers } from '../components/providers'

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
        <AuthProvider>
          <Providers>
            {children}
            <AppToaster />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}
