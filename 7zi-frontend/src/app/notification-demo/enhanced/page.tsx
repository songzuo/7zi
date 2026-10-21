/**
 * Real-time Notification System Demo Page
 *
 * This page demonstrates all notification features:
 * - WebSocket real-time push
 * - Email notifications (if configured)
 * - In-app message storage
 * - User preferences management
 */

'use client'

import { useState, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCenter from '@/components/notifications/NotificationCenter'
import { NotificationType, NotificationPriority } from '@/lib/services/notification'
import type { UserNotificationPreferences } from '@/lib/services/notification-enhanced'
import {
  Bell,
  Mail,
  Send,
  Trash2,
  Settings,
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  MessageSquare,
  Loader2,
} from 'lucide-react'

interface NotificationFormData {
  title: string
  message: string
  type: NotificationType
  priority: NotificationPriority
  userId: string
  forceEmail: boolean
}

type DemoStep = 'intro' | 'create' | 'view' | 'preferences' | 'summary'

export default function NotificationDemoPage() {
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications({
      autoConnect: true,
      userId: 'demo-user-123',
      teamId: 'demo-team-456',
    })

  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [currentStep, setCurrentStep] = useState<DemoStep>('intro')
  const [notificationData, setNotificationData] = useState<NotificationFormData>({
    title: 'Welcome to 7zi!',
    message: 'This is a demo notification to show the notification system in action.',
    type: NotificationType.INFO,
    priority: NotificationPriority.MEDIUM,
    userId: 'demo-user-123',
    forceEmail: false,
  })
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    success: boolean
    message: string
    emailSent: boolean
  } | null>(null)

  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    userId: 'demo-user-123',
    emailEnabled: true,
    emailThreshold: NotificationPriority.HIGH,
    pushEnabled: true,
    pushThreshold: NotificationPriority.MEDIUM,
    digestEnabled: false,
    digestFrequency: 'daily',
    timezone: 'UTC',
  })

  const [isSavingPreferences, setIsSavingPreferences] = useState(false)

  // Get notification icon
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case NotificationType.WARNING:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case NotificationType.ERROR:
        return <XCircle className="h-4 w-4 text-red-500" />
      case NotificationType.MESSAGE:
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_COMPLETED:
      case NotificationType.TASK_UPDATED:
        return <Bell className="h-4 w-4 text-purple-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700'
      case NotificationPriority.HIGH:
        return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700'
      case NotificationPriority.MEDIUM:
        return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
      case NotificationPriority.LOW:
        return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  // Send notification
  const handleSendNotification = async () => {
    setIsSending(true)
    setSendResult(null)

    try {
      const response = await fetch('/api/notifications/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type,
          priority: notificationData.priority,
          userId: notificationData.userId,
          teamId: 'demo-team-456',
          forceEmail: notificationData.forceEmail,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSendResult({
          success: true,
          message: 'Notification sent successfully!',
          emailSent: result.data.emailSent,
        })
        setCurrentStep('view')
      } else {
        setSendResult({
          success: false,
          message: result.error || 'Failed to send notification',
          emailSent: false,
        })
      }
    } catch (error) {
      setSendResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        emailSent: false,
      })
    } finally {
      setIsSending(false)
    }
  }

  // Save preferences
  const handleSavePreferences = async () => {
    setIsSavingPreferences(true)

    try {
      const response = await fetch(`/api/notifications/preferences/${preferences.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      const result = await response.json()

      if (result.success) {
        alert('Preferences saved successfully!')
      } else {
        alert('Failed to save preferences: ' + result.error)
      }
    } catch (error) {
      alert('Failed to save preferences: ' + error)
    } finally {
      setIsSavingPreferences(false)
    }
  }

  // Clear notifications
  const handleClearAll = () => {
    notifications.forEach(n => deleteNotification(n.id))
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                Real-time Notification System
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Demo page for the comprehensive notification system with WebSocket, email, and
                persistent storage
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
                  isConnected
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}
                />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              <button
                onClick={() => setShowNotificationCenter(true)}
                className="relative rounded-lg bg-white p-3 shadow transition-shadow hover:shadow-md dark:bg-gray-800"
              >
                <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8 flex items-center justify-center gap-4">
            {(['intro', 'create', 'view', 'preferences'] as DemoStep[]).map((step, index) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-colors ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : stepHasBeenVisited(currentStep, step)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {index + 1}
                </button>
                <span className="ml-2 text-sm font-medium text-gray-700 capitalize dark:text-gray-300">
                  {step}
                </span>
                {index < 3 && <div className="mx-4 h-0.5 w-8 bg-gray-300 dark:bg-gray-700" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content based on current step */}
        {currentStep === 'intro' && (
          <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Welcome to the Notification System Demo
            </h2>

            <div className="mb-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-600 p-3">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Real-time Push</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Instant browser notifications using Socket.IO WebSocket technology
                </p>
              </div>

              <div className="rounded-lg bg-purple-50 p-6 dark:bg-purple-900/20">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-purple-600 p-3">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Email Delivery</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Optional email notifications using Resend API with beautiful HTML templates
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-6 dark:bg-green-900/20">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-green-600 p-3">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Persistent Storage
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  SQLite database for reliable notification history and user preferences
                </p>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep('create')}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Start Demo →
            </button>
          </div>
        )}

        {currentStep === 'create' && (
          <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Create a Notification
            </h2>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  value={notificationData.title}
                  onChange={e =>
                    setNotificationData({ ...notificationData, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Enter notification title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Message
                </label>
                <textarea
                  value={notificationData.message}
                  onChange={e =>
                    setNotificationData({ ...notificationData, message: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Enter notification message"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type
                  </label>
                  <select
                    value={notificationData.type}
                    onChange={e =>
                      setNotificationData({
                        ...notificationData,
                        type: e.target.value as NotificationType,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value={NotificationType.INFO}>Info</option>
                    <option value={NotificationType.SUCCESS}>Success</option>
                    <option value={NotificationType.WARNING}>Warning</option>
                    <option value={NotificationType.ERROR}>Error</option>
                    <option value={NotificationType.TASK_ASSIGNED}>Task Assigned</option>
                    <option value={NotificationType.TASK_COMPLETED}>Task Completed</option>
                    <option value={NotificationType.MESSAGE}>Message</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <select
                    value={notificationData.priority}
                    onChange={e =>
                      setNotificationData({
                        ...notificationData,
                        priority: e.target.value as NotificationPriority,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value={NotificationPriority.LOW}>Low</option>
                    <option value={NotificationPriority.MEDIUM}>Medium</option>
                    <option value={NotificationPriority.HIGH}>High</option>
                    <option value={NotificationPriority.URGENT}>Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notificationData.forceEmail}
                    onChange={e =>
                      setNotificationData({ ...notificationData, forceEmail: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Force email delivery
                  </span>
                </label>
              </div>

              {sendResult && (
                <div
                  className={`rounded-lg p-4 ${
                    sendResult.success
                      ? 'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {sendResult.success ? (
                      <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {sendResult.message}
                      </p>
                      {sendResult.emailSent && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Email was also sent successfully!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleSendNotification}
                  disabled={isSending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Send Notification
                    </>
                  )}
                </button>
                <button
                  onClick={() => setCurrentStep('view')}
                  className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  View Notifications
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'view' && (
          <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Your Notifications ({notifications.length})
              </h2>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400">
                  No notifications yet. Create one to get started!
                </p>
                <button
                  onClick={() => setCurrentStep('create')}
                  className="mt-4 font-medium text-blue-600 hover:text-blue-700"
                >
                  Create Notification →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 10).map(notification => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-4 transition-all ${
                      !notification.read
                        ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-1 items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">
                              {notification.title}
                            </h3>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setCurrentStep('preferences')}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
              >
                <Settings className="h-5 w-5" />
                Manage Preferences
              </button>
            </div>
          </div>
        )}

        {currentStep === 'preferences' && (
          <div className="rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Notification Preferences
            </h2>

            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Email Notifications
                      </h3>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={preferences.emailEnabled}
                        onChange={e =>
                          setPreferences({ ...preferences, emailEnabled: e.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800" />
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Minimum Priority
                    </label>
                    <select
                      value={preferences.emailThreshold}
                      onChange={e =>
                        setPreferences({
                          ...preferences,
                          emailThreshold: e.target.value as NotificationPriority,
                        })
                      }
                      disabled={!preferences.emailEnabled}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value={NotificationPriority.LOW}>Low</option>
                      <option value={NotificationPriority.MEDIUM}>Medium</option>
                      <option value={NotificationPriority.HIGH}>High</option>
                      <option value={NotificationPriority.URGENT}>Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Push Notifications
                      </h3>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={preferences.pushEnabled}
                        onChange={e =>
                          setPreferences({ ...preferences, pushEnabled: e.target.checked })
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-purple-600 peer-focus:ring-4 peer-focus:ring-purple-300 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-purple-800" />
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Minimum Priority
                    </label>
                    <select
                      value={preferences.pushThreshold}
                      onChange={e =>
                        setPreferences({
                          ...preferences,
                          pushThreshold: e.target.value as NotificationPriority,
                        })
                      }
                      disabled={!preferences.pushEnabled}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-purple-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value={NotificationPriority.LOW}>Low</option>
                      <option value={NotificationPriority.MEDIUM}>Medium</option>
                      <option value={NotificationPriority.HIGH}>High</option>
                      <option value={NotificationPriority.URGENT}>Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quiet Hours Start
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart || ''}
                    onChange={e =>
                      setPreferences({
                        ...preferences,
                        quietHoursStart: e.target.value || undefined,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quiet Hours End
                  </label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd || ''}
                    onChange={e =>
                      setPreferences({ ...preferences, quietHoursEnd: e.target.value || undefined })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={isSavingPreferences}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-green-400"
              >
                {isSavingPreferences ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Notification Center */}
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onDelete={deleteNotification}
          isOpen={showNotificationCenter}
          onClose={() => setShowNotificationCenter(false)}
        />
      </div>
    </div>
  )
}

// Helper function
function stepHasBeenVisited(current: DemoStep, step: DemoStep): boolean {
  const steps: DemoStep[] = ['intro', 'create', 'view', 'preferences']
  const currentIndex = steps.indexOf(current)
  const stepIndex = steps.indexOf(step)
  return stepIndex < currentIndex
}
