/**
 * NotificationProvider Component
 *
 * Context provider for notification management across the app
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useNotifications, UseNotificationsOptions, UseNotificationsReturn } from '@/hooks/useNotifications';

interface NotificationContextValue extends UseNotificationsReturn {
  // Extend with any additional context values
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps extends UseNotificationsOptions {
  children: ReactNode;
}

export function NotificationProvider({
  children,
  ...options
}: NotificationProviderProps) {
  const notifications = useNotifications(options);

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 */
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }

  return context;
}
