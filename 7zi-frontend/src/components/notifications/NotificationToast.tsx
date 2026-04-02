/**
 * NotificationToast Component
 *
 * Displays individual notification toasts with animations
 */

'use client'

import React, { useEffect, useState, useCallback, memo } from 'react'
import { Notification, NotificationType } from '@/lib/services/notification'
import { X, Info, CheckCircle, AlertTriangle, XCircle, MessageSquare, Bell } from 'lucide-react'

interface NotificationToastProps {
  notification: Notification
  onClose: () => void
  onMarkRead: (id: string) => void
  autoHide?: boolean
  autoHideDelay?: number
}

// Extract helper functions outside component to avoid recreation
const getIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.SUCCESS:
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case NotificationType.WARNING:
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case NotificationType.ERROR:
      return <XCircle className="h-5 w-5 text-red-500" />
    case NotificationType.MESSAGE:
      return <MessageSquare className="h-5 w-5 text-blue-500" />
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_COMPLETED:
    case NotificationType.TASK_UPDATED:
      return <Bell className="h-5 w-5 text-purple-500" />
    default:
      return <Info className="h-5 w-5 text-gray-500" />
  }
}

const getBorderColor = (type: NotificationType) => {
  switch (type) {
    case NotificationType.SUCCESS:
      return 'border-green-500'
    case NotificationType.WARNING:
      return 'border-yellow-500'
    case NotificationType.ERROR:
      return 'border-red-500'
    case NotificationType.MESSAGE:
      return 'border-blue-500'
    case NotificationType.TASK_ASSIGNED:
    case NotificationType.TASK_COMPLETED:
    case NotificationType.TASK_UPDATED:
      return 'border-purple-500'
    default:
      return 'border-gray-500'
  }
}

function NotificationToast({
  notification,
  onClose,
  onMarkRead,
  autoHide = true,
  autoHideDelay = 5000,
}: NotificationToastProps) {
  'use memo'

  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Animation in
    requestAnimationFrame(() => setIsVisible(true))

    // Auto hide
    if (autoHide) {
      const timer = setTimeout(() => {
        handleClose()
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDelay, notification.id])

  const handleClose = useCallback(() => {
    setIsLeaving(true)
    onMarkRead(notification.id)
    setTimeout(() => {
      onClose()
    }, 300)
  }, [notification.id, onMarkRead, onClose])

  return (
    <div
      className={`relative rounded-lg border-l-4 bg-white shadow-lg dark:bg-gray-800 ${getBorderColor(notification.type)} mb-2 transform p-4 transition-all duration-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'} ${isLeaving ? 'translate-x-full opacity-0' : ''} `}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {notification.title}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>

          {notification.data && Object.keys(notification.data).length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              <pre className="overflow-x-auto rounded bg-gray-100 p-2 dark:bg-gray-700">
                {JSON.stringify(notification.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

// Wrap with React.memo to prevent unnecessary re-renders
export default memo(NotificationToast)
