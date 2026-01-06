'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Lightbulb, Settings } from 'lucide-react'
import { Button } from '@smartmed/ui'
import { HealthTipsList } from '@/components/health-tips/HealthTipsList'
import { HealthTipsPreferences } from '@/components/health-tips/HealthTipsPreferences'
import { useState } from 'react'

export default function HealthTipsPage() {
  const router = useRouter()
  const [showPreferences, setShowPreferences] = useState(false)

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-card via-card to-amber-500/5 dark:from-card dark:via-card dark:to-amber-500/10">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-500/20 dark:to-yellow-500/20 p-2.5 shadow-sm">
                  <Lightbulb className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Health Tips
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Personalized recommendations based on your health profile
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreferences(!showPreferences)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Preferences
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Preferences Panel */}
        {showPreferences && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <HealthTipsPreferences
              onSaved={() => setShowPreferences(false)}
            />
          </div>
        )}

        {/* Tips List */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <HealthTipsList
            showRefresh
            showGenerateButton
            compact={false}
          />
        </div>
      </div>
    </main>
  )
}
