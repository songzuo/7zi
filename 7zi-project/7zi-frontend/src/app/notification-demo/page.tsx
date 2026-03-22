/**
 * Demo page for Notification System
 *
 * Shows how to use the notification components and hooks
 */

'use client';

import { useState } from 'react';
import { Bell, Send, Trash2, Check } from 'lucide-react';
import {
  NotificationProvider,
  NotificationToaster,
  NotificationCenter,
  useNotificationContext,
} from '@/components/notifications';
import {
  NotificationType,
  NotificationPriority,
} from '@/lib/services/notification';

/**
 * Demo Content Component - Uses the notification context
 */
function DemoContent() {
  const { notifications, unreadCount, isConnected, markAllAsRead } = useNotificationContext();
  const [showCenter, setShowCenter] = useState(false);

  const sendTestNotification = async (type: NotificationType) => {
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
    });
  };

  const sendTaskNotification = async () => {
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
    });
  };

  const clearNotifications = async () => {
    const notificationIds = notifications.map(n => n.id);
    await Promise.all(
      notificationIds.map(id =>
        fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Notification System Demo
          </h1>

          {/* Notification Button */}
          <button
            onClick={() => setShowCenter(true)}
            className="relative p-3 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <Bell className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {isConnected
                ? 'Connected to notification server'
                : 'Disconnected from notification server'}
            </span>
          </div>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Send Test Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Send Test Notifications
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => sendTestNotification(NotificationType.INFO)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Send className="h-4 w-4" />
                Info
              </button>
              <button
                onClick={() => sendTestNotification(NotificationType.SUCCESS)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Send className="h-4 w-4" />
                Success
              </button>
              <button
                onClick={() => sendTestNotification(NotificationType.WARNING)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                <Send className="h-4 w-4" />
                Warning
              </button>
              <button
                onClick={() => sendTestNotification(NotificationType.ERROR)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Send className="h-4 w-4" />
                Error
              </button>
              <button
                onClick={sendTaskNotification}
                className="w-full flex items-center justify-center gap-2 p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Send className="h-4 w-4" />
                Task Assigned
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Bulk Actions
            </h2>
            <div className="space-y-2">
              <button
                onClick={markAllAsRead}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Check className="h-4 w-4" />
                Mark All as Read
              </button>
              <button
                onClick={clearNotifications}
                className="w-full flex items-center justify-center gap-2 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Clear All Notifications
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
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
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {unreadCount}
                </p>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Recent Notifications
          </h2>
          {notifications.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No notifications yet. Send some test notifications above!
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.read
                      ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(notification.createdAt).toLocaleString()} •{' '}
                        {notification.type} • {notification.priority}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
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
          onMarkRead={() => {/* Handled by toast component */}}
          onDelete={(id) => console.log('Delete', id)}
        />

        {/* Notification Center Panel */}
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          isOpen={showCenter}
          onClose={() => setShowCenter(false)}
          onMarkRead={(id) => console.log('Mark as read', id)}
          onMarkAllRead={markAllAsRead}
          onDelete={(id) => console.log('Delete', id)}
        />
      </div>
    </div>
  );
}

/**
 * Demo Page - Wraps with NotificationProvider
 */
export default function NotificationDemoPage() {
  return (
    <NotificationProvider autoConnect>
      <DemoContent />
    </NotificationProvider>
  );
}
