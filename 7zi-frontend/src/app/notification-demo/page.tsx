/**
 * Demo page for Notification System
 *
 * Shows how to use the notification components and hooks
 */

'use client'

import { useState } from 'react'
import { Bell, Send, Trash2, Check } from 'lucide-react'
import {
  NotificationProvider,
  NotificationToaster,
  NotificationCenter,
  useNotificationContext,
} from '@/components/notifications'
import { NotificationType, NotificationPriority } from '@/lib/services/notification-types'

/**
 * Demo Content Component - Uses the notification context
 */
function DemoContent() {
  'use memo'

  const { notifications, unreadCount, isConnected, markAllAsRead } = useNotificationContext()
  const [showCenter, setShowCenter] = useState(false)

  const sendTestNotification = async (type: NotificationType) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          priority: NotificationPriority.MEDIUM,
          title: `Test ${type} Notification`,
          message: `This is a test ${type} notification sent at ${new Date().toLocaleTimeString()}`,
          data: { test: true, type, timestamp: Date.now() },
        }),
      })
    } catch (error) {
      console.error('[NotificationDemo] Failed to send test notification:', error)
    }
  }

  const sendTaskNotification = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: NotificationType.TASK_ASSIGNED,
          priority: NotificationPriority.HIGH,
          title: 'New Task Assigned',
          message: 'You have been assigned to review PR #1234',
          data: {
            taskId: 'task-123',
            taskName: 'Review Feature X',
            priority: 'high',
          },
        }),
      })
    } catch (error) {
      console.error('[NotificationDemo] Failed to send task notification:', error)
    }
  }

  const clearNotifications = async () => {
    try {
      const notificationIds = notifications.map(n => n.id)
      await Promise.all(
        notificationIds.map(id => fetch(`/api/notifications/${id}`, { method: 'DELETE' }))
      )
    } catch (error) {
      console.error('[NotificationDemo] Failed to clear notifications:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-900">
      {/* Header */}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Notification System Demo
          </h1>

          {/* Notification Button */}
          <button
            onClick={() => setShowCenter(true)}
            className="relative rounded-lg bg-white p-3 shadow transition-shadow hover:shadow-md dark:bg-gray-800"
          >
            <Bell className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Connection Status */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {isConnected
                ? 'Connected to notification server'
                : 'Disconnected from notification server'}
            </span>
          </div>
        </div>

        {/* Test Controls */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Send Test Notifications */}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Send Test Notifications
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => sendTestNotification(NotificationType.INFO)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 p-3 text-white transition-colors hover:bg-blue-600"
              >
                <Send className="h-4 w-4" />
                Info
              </button>
              <button
                onClick={() => sendTestNotification(NotificationType.SUCCESS)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 p-3 text-white transition-colors hover:bg-green-600"
              >
                <Send className="h-4 w-4" />
                Success
              </button>
              <button
                onClick={() => sendTestNotification(NotificationType.WARNING)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 p-3 text-white transition-colors hover:bg-yellow-600"
              >
                <Send className="h-4 w-4" />
                Warning
              </button>
              <button
                onClick={() => sendTestNotification(NotificationType.ERROR)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 p-3 text-white transition-colors hover:bg-red-600"
              >
                <Send className="h-4 w-4" />
                Error
              </button>
              <button
                onClick={sendTaskNotification}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-500 p-3 text-white transition-colors hover:bg-purple-600"
              >
                <Send className="h-4 w-4" />
                Task Assigned
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Bulk Actions
            </h2>
            <div className="space-y-2">
              <button
                onClick={markAllAsRead}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 p-3 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <Check className="h-4 w-4" />
                Mark All as Read
              </button>
              <button
                onClick={clearNotifications}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-100 p-3 text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Notifications
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Statistics
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {notifications.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{unreadCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Read</p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                  {notifications.length - unreadCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Notifications List */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Notifications
          </h2>
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">
              No notifications yet. Send some test notifications above!
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={`rounded-lg border p-4 ${
                    notification.read
                      ? 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                      : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()} • {notification.type} •{' '}
                        {notification.priority}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        New
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Toaster */}
        <NotificationToaster
          notifications={notifications}
          onMarkRead={() => {
            /* Handled by toast component */
          }}
          onDelete={id => console.log('Delete', id)}
        />

        {/* Notification Center Panel */}
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          isOpen={showCenter}
          onClose={() => setShowCenter(false)}
          onMarkRead={id => console.log('Mark as read', id)}
          onMarkAllRead={markAllAsRead}
          onDelete={id => console.log('Delete', id)}
        />
      </div>
    </div>
  )
}

/**
 * Demo Page - Wraps with NotificationProvider
 */
export default function NotificationDemoPage() {
  return (
    <NotificationProvider autoConnect>
      <DemoContent />
    </NotificationProvider>
  )
}
