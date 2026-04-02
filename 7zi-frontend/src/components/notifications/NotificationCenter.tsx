/**
 * NotificationCenter Component
 *
 * Display all notifications in a panel/dropdown
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Notification, NotificationType, NotificationPriority } from '@/lib/services/notification'
import {
  X,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Bell,
  Clock,
} from 'lucide-react'

// Extract helper functions outside component to avoid recreation
const getIcon = (type: NotificationType) => {
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

const getPriorityBadge = (priority: NotificationPriority) => {
  const colors = {
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
  }

  return <span className={`rounded-full px-2 py-0.5 text-xs ${colors[priority]}`}>{priority}</span>
}

const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) {
    return 'Just now'
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  } else {
    const days = Math.floor(diff / 86400000)
    return `${days}d ago`
  }
}

interface NotificationCenterProps {
  notifications: Notification[]
  unreadCount: number
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onDelete: (id: string) => void
  isOpen: boolean
  onClose: () => void
}

type FilterType = 'all' | 'unread' | NotificationType

function NotificationCenter({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  isOpen,
  onClose,
}: NotificationCenterProps) {
  'use memo'

  const [filter, setFilter] = useState<FilterType>('all')

  const filteredNotifications = useMemo(() => {
    let filtered = notifications

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter)
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt)
  }, [notifications, filter])

  // Memoize filter change handlers
  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter)
  }, [])

  const handleMarkRead = useCallback(
    (id: string) => {
      onMarkRead(id)
    },
    [onMarkRead]
  )

  const handleDelete = useCallback(
    (id: string) => {
      onDelete(id)
    },
    [onDelete]
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 p-2 dark:border-gray-700">
          <button
            onClick={() => handleFilterChange('all')}
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleFilterChange('unread')}
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              filter === 'unread'
                ? 'bg-gray-900 text-white dark:bg-gray-700 dark:text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => handleFilterChange(NotificationType.TASK_ASSIGNED)}
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              filter === NotificationType.TASK_ASSIGNED
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => handleFilterChange(NotificationType.MESSAGE)}
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
              filter === NotificationType.MESSAGE
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Messages
          </button>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <Bell className="mb-2 h-12 w-12 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`dark:hover:bg-gray-750 p-4 transition-colors hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </p>
                        {getPriorityBadge(notification.priority)}
                      </div>

                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {notification.message}
                      </p>

                      <div className="mt-2 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatTime(notification.createdAt)}
                        </span>

                        {!notification.read && (
                          <button
                            onClick={() => handleMarkRead(notification.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Check className="h-3 w-3" />
                            Mark as read
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>

                      {notification.data && Object.keys(notification.data).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            Details
                          </summary>
                          <pre className="mt-1 overflow-x-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-700">
                            {JSON.stringify(notification.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Wrap with React.memo to prevent unnecessary re-renders
export default React.memo(NotificationCenter)
