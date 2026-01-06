'use client'

import { useState, useEffect } from 'react'
import { Bell, Mail, Smartphone, Clock, Volume2, VolumeX, RefreshCw, Save } from 'lucide-react'

interface NotificationPreferences {
  // Appointment notifications
  appointmentReminders: boolean
  appointmentConfirmation: boolean
  appointmentCancellation: boolean
  reminderTiming: string

  // Queue notifications
  queueUpdates: boolean
  queuePositionThreshold: number

  // Health tips notifications
  healthTipsEnabled: boolean
  healthTipsFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'

  // Prescription notifications
  prescriptionReady: boolean

  // Delivery channels
  emailEnabled: boolean
  pushEnabled: boolean
  smsEnabled: boolean

  // Quiet hours
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  timezone: string
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
]

const REMINDER_OPTIONS = [
  { value: '24h', label: '24 hours before' },
  { value: '12h', label: '12 hours before' },
  { value: '6h', label: '6 hours before' },
  { value: '2h', label: '2 hours before' },
  { value: '1h', label: '1 hour before' },
  { value: '30m', label: '30 minutes before' },
  { value: '15m', label: '15 minutes before' },
]

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedReminders, setSelectedReminders] = useState<string[]>([])

  useEffect(() => {
    fetchPreferences()
  }, [])

  useEffect(() => {
    if (preferences?.reminderTiming) {
      setSelectedReminders(preferences.reminderTiming.split(',').map(t => t.trim()))
    }
  }, [preferences?.reminderTiming])

  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch preferences')
      }

      const data = await response.json()
      setPreferences(data.data)
    } catch (err) {
      setError('Failed to load notification preferences')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    if (!preferences) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...preferences,
          reminderTiming: selectedReminders.join(','),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save preferences')
      }

      const data = await response.json()
      setPreferences(data.data)
      setSuccess('Preferences saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    try {
      setSaving(true)
      setError(null)

      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/preferences/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to reset preferences')
      }

      const data = await response.json()
      setPreferences(data.data)
      setSuccess('Preferences reset to defaults!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to reset preferences')
    } finally {
      setSaving(false)
    }
  }

  const toggleReminder = (value: string) => {
    setSelectedReminders(prev => {
      if (prev.includes(value)) {
        return prev.filter(v => v !== value)
      }
      return [...prev, value]
    })
  }

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => prev ? { ...prev, [key]: value } : null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load preferences</p>
          <button
            onClick={fetchPreferences}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bell className="h-8 w-8 text-blue-600" />
              Notification Preferences
            </h1>
            <p className="text-muted-foreground mt-2">
              Control how and when you receive notifications from SmartMed
            </p>
          </div>
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Delivery Channels */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              Delivery Channels
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how you want to receive notifications
            </p>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.emailEnabled}
                  onChange={(e) => updatePreference('emailEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.pushEnabled}
                  onChange={(e) => updatePreference('pushEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-foreground">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive text message notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.smsEnabled}
                  onChange={(e) => updatePreference('smsEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Appointment Notifications */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              📅 Appointment Notifications
            </h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Appointment Reminders</p>
                  <p className="text-sm text-muted-foreground">Get reminded before your appointments</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.appointmentReminders}
                  onChange={(e) => updatePreference('appointmentReminders', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>

              {preferences.appointmentReminders && (
                <div className="ml-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-3">Remind me:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {REMINDER_OPTIONS.map(option => (
                      <label
                        key={option.value}
                        className={`
                          flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors
                          ${selectedReminders.includes(option.value)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-card border-border text-foreground hover:border-blue-400'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={selectedReminders.includes(option.value)}
                          onChange={() => toggleReminder(option.value)}
                          className="sr-only"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Booking Confirmations</p>
                  <p className="text-sm text-muted-foreground">Confirm when appointments are booked</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.appointmentConfirmation}
                  onChange={(e) => updatePreference('appointmentConfirmation', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Cancellation Notices</p>
                  <p className="text-sm text-muted-foreground">Alert when appointments are cancelled</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.appointmentCancellation}
                  onChange={(e) => updatePreference('appointmentCancellation', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Queue Notifications */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              🔢 Queue Notifications
            </h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Queue Updates</p>
                  <p className="text-sm text-muted-foreground">Get notified when your position changes</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.queueUpdates}
                  onChange={(e) => updatePreference('queueUpdates', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>

              {preferences.queueUpdates && (
                <div className="ml-4 p-4 bg-muted rounded-lg">
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">
                      Notify me when position reaches:
                    </span>
                    <select
                      value={preferences.queuePositionThreshold}
                      onChange={(e) => updatePreference('queuePositionThreshold', Number(e.target.value))}
                      className="mt-2 block w-full rounded-lg border-border shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {[1, 2, 3, 5, 10].map(n => (
                        <option key={n} value={n}>
                          Position {n} or less
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Health Tips Notifications */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              💊 Health Tips
            </h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Health Tips</p>
                  <p className="text-sm text-muted-foreground">Receive personalized health tips</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.healthTipsEnabled}
                  onChange={(e) => updatePreference('healthTipsEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>

              {preferences.healthTipsEnabled && (
                <div className="ml-4 p-4 bg-muted rounded-lg">
                  <label className="block">
                    <span className="text-sm font-medium text-foreground">Frequency:</span>
                    <select
                      value={preferences.healthTipsFrequency}
                      onChange={(e) => updatePreference('healthTipsFrequency', e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                      className="mt-2 block w-full rounded-lg border-border shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Prescription Notifications */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              📋 Prescription Notifications
            </h2>

            <label className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer">
              <div>
                <p className="font-medium text-foreground">Prescription Ready</p>
                <p className="text-sm text-muted-foreground">Get notified when prescriptions are available</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.prescriptionReady}
                onChange={(e) => updatePreference('prescriptionReady', e.target.checked)}
                className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Quiet Hours */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              {preferences.quietHoursEnabled ? (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Volume2 className="h-5 w-5 text-muted-foreground" />
              )}
              Quiet Hours
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pause notifications during specific hours
            </p>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-foreground">Enable Quiet Hours</p>
                  <p className="text-sm text-muted-foreground">No notifications during this time</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.quietHoursEnabled}
                  onChange={(e) => updatePreference('quietHoursEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-border text-blue-600 focus:ring-blue-500"
                />
              </label>

              {preferences.quietHoursEnabled && (
                <div className="p-4 bg-muted rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Start Time
                      </span>
                      <input
                        type="time"
                        value={preferences.quietHoursStart || '22:00'}
                        onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                        className="mt-2 block w-full rounded-lg border-border shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        End Time
                      </span>
                      <input
                        type="time"
                        value={preferences.quietHoursEnd || '08:00'}
                        onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                        className="mt-2 block w-full rounded-lg border-border shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-foreground">Timezone</span>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => updatePreference('timezone', e.target.value)}
                      className="mt-2 block w-full rounded-lg border-border shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>
                          {tz.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={savePreferences}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
