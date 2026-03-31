/**
 * @fileoverview Notification management hook
 * @description Hook for managing notifications with localStorage persistence
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { Notification, NotificationType, NotificationPriority } from '../components/NotificationCenter/types';

const STORAGE_KEY = '7zi_notifications';

interface UseNotificationsOptions {
  maxNotifications?: number;
  persist?: boolean;
}

export interface NotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  link?: string;
  icon?: string;
}

// Type for notifications stored in localStorage (with dates as strings)
interface StoredNotification extends Omit<Notification, 'createdAt'> {
  createdAt: string;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    maxNotifications = 50,
    persist = true,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    if (!persist) {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredNotification[];
        // Convert string dates back to Date objects
        const loaded = parsed.map((n) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        }));
        setNotifications(loaded);
      }
    } catch (_error) {
      logger.error('Failed to load notifications', error);
    } finally {
      setIsLoaded(true);
    }
  }, [persist]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (!persist || !isLoaded) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (_error) {
      logger.error('Failed to save notifications', error);
    }
  }, [notifications, persist, isLoaded]);

  // Add a new notification
  const addNotification = useCallback((input: NotificationInput) => {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: input.title,
      message: input.message,
      type: input.type || 'info',
      priority: input.priority || 'medium',
      link: input.link,
      icon: input.icon,
      read: false,
      createdAt: new Date(),
    };

    setNotifications((prev) => {
      const updated = [notification, ...prev];
      // Limit total notifications
      return updated.slice(0, maxNotifications);
    });
  }, [maxNotifications]);

  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Delete a notification
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Convenience methods for different notification types
  const success = useCallback(
    (title: string, message: string, options?: Omit<NotificationInput, 'title' | 'message' | 'type'>) => {
      addNotification({ title, message, type: 'success', ...options });
    },
    [addNotification]
  );

  const error = useCallback(
    (title: string, message: string, options?: Omit<NotificationInput, 'title' | 'message' | 'type'>) => {
      addNotification({ title, message, type: 'error', ...options });
    },
    [addNotification]
  );

  const warning = useCallback(
    (title: string, message: string, options?: Omit<NotificationInput, 'title' | 'message' | 'type'>) => {
      addNotification({ title, message, type: 'warning', ...options });
    },
    [addNotification]
  );

  const info = useCallback(
    (title: string, message: string, options?: Omit<NotificationInput, 'title' | 'message' | 'type'>) => {
      addNotification({ title, message, type: 'info', ...options });
    },
    [addNotification]
  );

  return {
    notifications,
    unreadCount,
    isLoaded,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    success,
    error,
    warning,
    info,
  };
};

export default useNotifications;
