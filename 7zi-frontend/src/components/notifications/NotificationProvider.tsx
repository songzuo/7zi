/**
 * NotificationProvider Component
 *
 * Context provider for notification management across the app
 */

'use client'

import React, { createContext, useContext, ReactNode, memo, useMemo } from 'react'
import {
  useNotifications,
  UseNotificationsOptions,
  UseNotificationsReturn,
} from '@/hooks/useNotifications'

interface NotificationContextValue extends UseNotificationsReturn {
  // Extend with any additional context values
}

export type { NotificationContextValue }

const NotificationContext = createContext<NotificationContextValue | null>(null)

interface NotificationProviderProps extends UseNotificationsOptions {
  children: ReactNode
}

function NotificationProvider({ children, ...options }: NotificationProviderProps) {
  'use memo'

  const notifications = useNotifications(options)

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => notifications, [notifications])

  return (
    <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
  )
}

// Wrap with React.memo to prevent unnecessary re-renders
export default memo(NotificationProvider)

/**
 * Hook to access notification context
 */
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext)

  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider')
  }

  return context
}
