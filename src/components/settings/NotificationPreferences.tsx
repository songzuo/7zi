'use client'

/**
 * Notification Preferences Component
 * Allows users to configure notification preferences for different channels and event types
 */

import { useState, useEffect } from 'react'
import { useToastActions } from '@/stores/uiStore'

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms'
export type NotificationEventType =
  | 'agent_events'
  | 'wallet_events'
  | 'security_alerts'
  | 'marketing'

export interface NotificationPreferencesMap {
  channels: Record<NotificationChannel, boolean>
  events: Record<NotificationEventType, boolean>
}

// ============================================================================
// Channel and Event Metadata
// ============================================================================

export const CHANNEL_INFO: Record<
  NotificationChannel,
  { label: string; icon: string; description: string }
> = {
  email: { label: '邮件通知', icon: '📧', description: '通过电子邮件接收通知' },
  push: { label: '推送通知', icon: '📲', description: '浏览器推送通知' },
  in_app: { label: '应用内通知', icon: '🔔', description: '在应用内显示通知' },
  sms: { label: '短信通知', icon: '📱', description: '通过短信接收重要通知' },
}

export const EVENT_INFO: Record<
  NotificationEventType,
  { label: string; icon: string; description: string }
> = {
  agent_events: { label: '智能体事件', icon: '🤖', description: '智能体相关通知' },
  wallet_events: { label: '钱包事件', icon: '💰', description: '钱包和交易通知' },
  security_alerts: { label: '安全警报', icon: '🛡️', description: '账户安全相关通知' },
  marketing: { label: '营销信息', icon: '📢', description: '营销和推广信息' },
}

// ============================================================================
// Component Props
// ============================================================================

interface NotificationPreferencesProps {
  userId?: string
  onSave?: (preferences: NotificationPreferencesMap) => void
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationPreferences({
  userId = 'demo-user',
  onSave,
  className = '',
}: NotificationPreferencesProps) {
  const toast = useToastActions()
  const [preferences, setPreferences] = useState<NotificationPreferencesMap>({
    channels: {
      email: true,
      push: true,
      in_app: true,
      sms: false,
    },
    events: {
      agent_events: true,
      wallet_events: true,
      security_alerts: true,
      marketing: false,
    },
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [userId])

  // Load preferences from API
  async function loadPreferences() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/user/preferences?format=map&userId=${userId}`, {
        headers: {
          'x-user-id': userId,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load preferences')
      }

      const result = await response.json()

      if (result.success && result.data) {
        setPreferences(result.data)
        setHasUnsavedChanges(false)
      }
    } catch (err) {
      console.error('Error loading preferences:', err)
      setError('加载偏好设置失败')
      toast.error('加载偏好设置失败')
    } finally {
      setLoading(false)
    }
  }

  // Save preferences to API
  async function savePreferences() {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/user/preferences?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      const result = await response.json()

      if (result.success) {
        setHasUnsavedChanges(false)
        toast.success('偏好设置已保存')
        onSave?.(result.data)
      } else {
        throw new Error(result.error || 'Save failed')
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving preferences:', err)
      }
      setError('保存偏好设置失败')
      toast.error('保存偏好设置失败')
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  async function resetToDefaults() {
    if (!confirm('确定要重置为默认设置吗？')) {
      return
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/user/preferences?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to reset preferences')
      }

      const result = await response.json()

      if (result.success) {
        // Convert result to map format
        const mapFormat: NotificationPreferencesMap = {
          channels: {
            email: result.data.email_enabled,
            push: result.data.push_enabled,
            in_app: result.data.in_app_enabled,
            sms: result.data.sms_enabled,
          },
          events: {
            agent_events: result.data.agent_events_enabled,
            wallet_events: result.data.wallet_events_enabled,
            security_alerts: result.data.security_alerts_enabled,
            marketing: result.data.marketing_enabled,
          },
        }

        setPreferences(mapFormat)
        setHasUnsavedChanges(false)
        toast.success('已重置为默认设置')
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error resetting preferences:', err)
      }
      setError('重置失败')
      toast.error('重置失败')
    } finally {
      setSaving(false)
    }
  }

  // Update channel preference
  function updateChannel(channel: NotificationChannel, value: boolean) {
    setPreferences(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: value,
      },
    }))
    setHasUnsavedChanges(true)
  }

  // Update event preference
  function updateEvent(event: NotificationEventType, value: boolean) {
    setPreferences(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [event]: value,
      },
    }))
    setHasUnsavedChanges(true)
  }

  // Enable all channels
  function enableAllChannels() {
    setPreferences(prev => ({
      ...prev,
      channels: {
        email: true,
        push: true,
        in_app: true,
        sms: true,
      },
    }))
    setHasUnsavedChanges(true)
  }

  // Disable all channels
  function disableAllChannels() {
    setPreferences(prev => ({
      ...prev,
      channels: {
        email: false,
        push: false,
        in_app: false,
        sms: false,
      },
    }))
    setHasUnsavedChanges(true)
  }

  // Enable all events
  function enableAllEvents() {
    setPreferences(prev => ({
      ...prev,
      events: {
        agent_events: true,
        wallet_events: true,
        security_alerts: true,
        marketing: true,
      },
    }))
    setHasUnsavedChanges(true)
  }

  // Disable all events
  function disableAllEvents() {
    setPreferences(prev => ({
      ...prev,
      events: {
        agent_events: false,
        wallet_events: false,
        security_alerts: false,
        marketing: false,
      },
    }))
    setHasUnsavedChanges(true)
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className={`rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl bg-white shadow-lg dark:bg-zinc-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">🔔 通知偏好设置</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            自定义您希望接收的通知类型和方式
          </p>
        </div>
        {hasUnsavedChanges && (
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            有未保存的更改
          </span>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="space-y-8 p-6">
        {/* Channel Preferences */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
              📡 通知渠道
            </h3>
            <div className="flex gap-2">
              <button
                onClick={enableAllChannels}
                className="rounded-lg bg-blue-100 px-3 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                全部启用
              </button>
              <button
                onClick={disableAllChannels}
                className="rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                全部禁用
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(Object.keys(CHANNEL_INFO) as NotificationChannel[]).map(channel => (
              <ChannelToggle
                key={channel}
                channel={channel}
                enabled={preferences.channels[channel]}
                onToggle={updateChannel}
              />
            ))}
          </div>
        </section>

        {/* Event Type Preferences */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
              📋 事件类型
            </h3>
            <div className="flex gap-2">
              <button
                onClick={enableAllEvents}
                className="rounded-lg bg-blue-100 px-3 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                全部启用
              </button>
              <button
                onClick={disableAllEvents}
                className="rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                全部禁用
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(Object.keys(EVENT_INFO) as NotificationEventType[]).map(eventType => (
              <EventToggle
                key={eventType}
                event={eventType}
                enabled={preferences.events[eventType]}
                onToggle={updateEvent}
              />
            ))}
          </div>
        </section>

        {/* Actions */}
        <section className="flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            重置为默认
          </button>
          <button
            onClick={savePreferences}
            disabled={!hasUnsavedChanges || saving}
            className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:opacity-50 dark:disabled:bg-zinc-700"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </section>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface ChannelToggleProps {
  channel: NotificationChannel
  enabled: boolean
  onToggle: (channel: NotificationChannel, value: boolean) => void
}

function ChannelToggle({ channel, enabled, onToggle }: ChannelToggleProps) {
  const info = CHANNEL_INFO[channel]

  return (
    <button
      onClick={() => onToggle(channel, !enabled)}
      className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
        enabled
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
      } `}
    >
      <span className="text-2xl">{info.icon}</span>
      <div className="flex-1">
        <div className="font-medium text-zinc-900 dark:text-white">{info.label}</div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">{info.description}</div>
      </div>
      <ToggleSwitch checked={enabled} />
    </button>
  )
}

interface EventToggleProps {
  event: NotificationEventType
  enabled: boolean
  onToggle: (event: NotificationEventType, value: boolean) => void
}

function EventToggle({ event, enabled, onToggle }: EventToggleProps) {
  const info = EVENT_INFO[event]

  return (
    <button
      onClick={() => onToggle(event, !enabled)}
      className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
        enabled
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
      } `}
    >
      <span className="text-2xl">{info.icon}</span>
      <div className="flex-1">
        <div className="font-medium text-zinc-900 dark:text-white">{info.label}</div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">{info.description}</div>
      </div>
      <ToggleSwitch checked={enabled} />
    </button>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  disabled?: boolean
}

function ToggleSwitch({ checked, disabled = false }: ToggleSwitchProps) {
  return (
    <div
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'} ${disabled ? 'opacity-50' : ''} `}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'} `}
      />
    </div>
  )
}

// ============================================================================
// Exports
// ============================================================================

export default NotificationPreferences
