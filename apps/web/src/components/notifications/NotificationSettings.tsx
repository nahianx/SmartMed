"use client"

import { useState } from 'react'
import { Bell, Volume2, VolumeX, Play, Check, AlertTriangle } from 'lucide-react'
import { useQueueNotifications, QueueEventType } from '@/hooks/useQueueNotifications'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from '@smartmed/ui'
import { showSuccess, handleApiError } from '@/lib/error_utils'

interface NotificationSettingsProps {
  className?: string
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const {
    browserPermission,
    requestBrowserPermission,
    preferences,
    isLoadingPreferences,
    updatePreferences,
    availableSounds,
    previewSound,
    stopPreview,
    notifyQueueEvent,
    isMuted,
    toggleMute,
    isInQuietHours,
  } = useQueueNotifications()

  const [isUpdating, setIsUpdating] = useState(false)
  const [previewingSound, setPreviewingSound] = useState<string | null>(null)

  const handleUpdatePreference = async (key: string, value: boolean | string | number) => {
    setIsUpdating(true)
    try {
      await updatePreferences({ [key]: value })
      showSuccess('Notification settings updated')
    } catch (error) {
      handleApiError(error, 'Failed to update settings')
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePreviewSound = async (soundId: string) => {
    setPreviewingSound(soundId)
    await previewSound(soundId)
    setTimeout(() => setPreviewingSound(null), 2000)
  }

  const handleTestNotification = () => {
    notifyQueueEvent('patient_joined', 'Test Patient')
    showSuccess('Test notification sent!')
  }

  const handleRequestPermission = async () => {
    const permission = await requestBrowserPermission()
    if (permission === 'granted') {
      showSuccess('Browser notifications enabled!')
    } else if (permission === 'denied') {
      handleApiError(new Error('Permission denied. Please enable notifications in your browser settings.'))
    }
  }

  if (isLoadingPreferences) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Queue Notification Settings
        </CardTitle>
        <CardDescription>
          Configure audio and browser notifications for queue events
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Browser Notification Permission */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <Label className="font-medium">Browser Notifications</Label>
            <p className="text-sm text-gray-500">
              {browserPermission === 'granted' && 'Enabled - You will receive notifications'}
              {browserPermission === 'denied' && 'Blocked - Enable in browser settings'}
              {browserPermission === 'default' && 'Not enabled - Click to enable'}
              {!browserPermission && 'Not supported in this browser'}
            </p>
          </div>
          {browserPermission === 'granted' ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : browserPermission === 'denied' ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <Button size="sm" onClick={handleRequestPermission}>
              Enable
            </Button>
          )}
        </div>

        {/* Audio Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="audio-enabled" className="font-medium">Audio Notifications</Label>
            <p className="text-sm text-gray-500">
              Play sound when queue events occur
            </p>
          </div>
          <Switch
            id="audio-enabled"
            checked={preferences?.audioNotificationsEnabled ?? true}
            onCheckedChange={(checked) => handleUpdatePreference('audioNotificationsEnabled', checked)}
            disabled={isUpdating}
          />
        </div>

        {/* Browser Notifications Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="browser-enabled" className="font-medium">Browser Notifications</Label>
            <p className="text-sm text-gray-500">
              Show browser alerts when page is not focused
            </p>
          </div>
          <Switch
            id="browser-enabled"
            checked={preferences?.browserNotificationsEnabled ?? true}
            onCheckedChange={(checked) => handleUpdatePreference('browserNotificationsEnabled', checked)}
            disabled={isUpdating || browserPermission !== 'granted'}
          />
        </div>

        {/* Sound Selection */}
        <div className="space-y-2">
          <Label htmlFor="notification-sound" className="font-medium">Notification Sound</Label>
          <div className="flex gap-2">
            <Select
              value={preferences?.notificationSound || 'notification-default'}
              onValueChange={(value) => handleUpdatePreference('notificationSound', value)}
              disabled={isUpdating || !preferences?.audioNotificationsEnabled}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a sound" />
              </SelectTrigger>
              <SelectContent>
                {availableSounds.map((sound) => (
                  <SelectItem key={sound.id} value={sound.id}>
                    {sound.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePreviewSound(preferences?.notificationSound || 'notification-default')}
              disabled={!preferences?.audioNotificationsEnabled || previewingSound !== null}
            >
              {previewingSound ? (
                <div className="animate-pulse">
                  <Volume2 className="h-4 w-4" />
                </div>
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Volume Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">Volume</Label>
            <span className="text-sm text-gray-500">{preferences?.notificationVolume ?? 70}%</span>
          </div>
          <div className="flex items-center gap-3">
            <VolumeX className="h-4 w-4 text-gray-400" />
            <Slider
              value={[preferences?.notificationVolume ?? 70]}
              min={0}
              max={100}
              step={5}
              onValueChange={([value]) => handleUpdatePreference('notificationVolume', value)}
              disabled={isUpdating || !preferences?.audioNotificationsEnabled}
              className="flex-1"
            />
            <Volume2 className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <Label htmlFor="quiet-hours" className="font-medium">Quiet Hours</Label>
              <p className="text-sm text-gray-500">
                Mute notifications during specific times
                {isInQuietHours() && (
                  <span className="ml-2 text-amber-600">(Currently active)</span>
                )}
              </p>
            </div>
            <Switch
              id="quiet-hours"
              checked={preferences?.quietHoursEnabled ?? false}
              onCheckedChange={(checked) => handleUpdatePreference('quietHoursEnabled', checked)}
              disabled={isUpdating}
            />
          </div>

          {preferences?.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-1">
                <Label htmlFor="quiet-start" className="text-sm">Start Time</Label>
                <input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietHoursStart || '22:00'}
                  onChange={(e) => handleUpdatePreference('quietHoursStart', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  disabled={isUpdating}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quiet-end" className="text-sm">End Time</Label>
                <input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietHoursEnd || '08:00'}
                  onChange={(e) => handleUpdatePreference('quietHoursEnd', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  disabled={isUpdating}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Mute Toggle */}
        <div className="border-t pt-4">
          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            onClick={toggleMute}
            className="w-full"
          >
            {isMuted ? (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Notifications Muted - Click to Unmute
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Mute All Notifications
              </>
            )}
          </Button>
        </div>

        {/* Test Notification */}
        <div className="border-t pt-4">
          <Button
            variant="secondary"
            onClick={handleTestNotification}
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            Send Test Notification
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">
            This will play a sound and show a browser notification (if enabled)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
