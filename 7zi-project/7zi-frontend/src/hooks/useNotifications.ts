/**
 * useNotifications Hook
 *
 * React hook for real-time notification management using Socket.IO client
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationFilter,
} from '@/lib/services/notification';

/**
 * Socket connection status
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * useNotifications hook options
 */
export interface UseNotificationsOptions {
  autoConnect?: boolean;
  userId?: string;
  teamId?: string;
  channels?: string[];
  socketUrl?: string;
}

/**
 * Hook return value
 */
export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refreshNotifications: (filter?: NotificationFilter) => Promise<void>;
}

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const {
    autoConnect = true,
    userId,
    teamId,
    channels = [],
    socketUrl = process.env.NEXT_PUBLIC_NOTIFICATION_SOCKET_URL || 'http://localhost:3001',
  } = options;

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const isMounted = useRef(true);

  /**
   * Connect to Socket.IO server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[useNotifications] Already connected');
      return;
    }

    setStatus('connecting');

    try {
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[useNotifications] Connected to socket server');
        setStatus('connected');

        // Subscribe to channels
        const subscriptionChannels = [
          ...channels,
          ...(userId ? [`user:${userId}`] : []),
          ...(teamId ? [`team:${teamId}`] : []),
        ];

        socket.emit('subscribe', {
          userId,
          teamId,
          channels: subscriptionChannels,
        });
      });

      socket.on('initial_notifications', (initialNotifs: Notification[]) => {
        if (isMounted.current) {
          setNotifications(initialNotifs);
          setUnreadCount(initialNotifs.filter(n => !n.read).length);
          console.log(`[useNotifications] Received ${initialNotifs.length} initial notifications`);
        }
      });

      socket.on('notification', (notification: Notification) => {
        if (isMounted.current) {
          setNotifications(prev => [notification, ...prev]);
          if (!notification.read) {
            setUnreadCount(prev => prev + 1);
          }

          // Show browser notification if permitted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
            });
          }
        }
      });

      socket.on('notification_read', (notificationId: string) => {
        if (isMounted.current) {
          setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      });

      socket.on('notifications_cleared', (filter: NotificationFilter) => {
        if (isMounted.current) {
          setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
          );
          setUnreadCount(0);
        }
      });

      socket.on('notification_deleted', (notificationId: string) => {
        if (isMounted.current) {
          setNotifications(prev => {
            const filtered = prev.filter(n => n.id !== notificationId);
            if (!prev.find(n => n.id === notificationId)?.read) {
              setUnreadCount(filtered.filter(n => !n.read).length);
            }
            return filtered;
          });
        }
      });

      socket.on('unread_count', (count: number) => {
        if (isMounted.current) {
          setUnreadCount(count);
        }
      });

      socket.on('disconnect', (reason: string) => {
        console.log('[useNotifications] Disconnected:', reason);
        setStatus('disconnected');
      });

      socket.on('connect_error', (error: Error) => {
        console.error('[useNotifications] Connection error:', error);
        setStatus('error');
      });

      socket.on('subscribed', ({ channels }: { channels: string[] }) => {
        console.log('[useNotifications] Subscribed to channels:', channels);
      });
    } catch (error) {
      console.error('[useNotifications] Failed to connect:', error);
      setStatus('error');
    }
  }, [socketUrl, userId, teamId, channels]);

  /**
   * Disconnect from Socket.IO server
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
      console.log('[useNotifications] Disconnected');
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((id: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_read', id);
    }

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    if (socketRef.current?.connected) {
      const filter: NotificationFilter = {
        userId,
        teamId,
      };
      socketRef.current.emit('mark_all_read', filter);
    }

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId, teamId]);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback((id: string) => {
    // Optimistic update
    setNotifications(prev => {
      const notif = prev.find(n => n.id === id);
      if (notif && !notif.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  /**
   * Refresh notifications via REST API
   */
  const refreshNotifications = useCallback(async (filter?: NotificationFilter) => {
    try {
      const params = new URLSearchParams();

      if (userId) params.append('userId', userId);
      if (teamId) params.append('teamId', teamId);
      if (filter?.type) params.append('type', filter.type as string);
      if (filter?.priority) params.append('priority', filter.priority as string);
      if (filter?.read !== undefined) params.append('read', String(filter.read));

      const response = await fetch(`/api/notifications?${params}`);
      const result = await response.json();

      if (result.success && result.data) {
        setNotifications(result.data);
        setUnreadCount(result.meta?.unreadCount || 0);
      }
    } catch (error) {
      console.error('[useNotifications] Failed to refresh notifications:', error);
    }
  }, [userId, teamId]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Request notification permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      isMounted.current = false;
      disconnect();
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notifications,
    unreadCount,
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };
}
