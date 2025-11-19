import type { Metadata } from 'next'
import './globals.css'
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
        <Providers>
          {children}
          <AppToaster />
        </Providers>
      </body>
    </html>
  )
}
