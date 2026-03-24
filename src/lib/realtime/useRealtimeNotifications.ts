/**
 * Real-time Notifications Hook
 *
 * Integrates with WebSocket to receive real-time notifications.
 * Handles task updates, member status changes, system announcements, etc.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useEnhancedWebSocket } from './useEnhancedWebSocket';
import { notificationService } from './notification-service';
import type { RealtimeNotification, RealtimeNotificationType } from './types';
import { logger } from '../logger';

// ============================================================================
// Types
// ============================================================================

export interface NotificationFilter {
  types?: RealtimeNotificationType[];
  categories?: Array<'info' | 'warning' | 'error' | 'success'>;
  priority?: Array<'low' | 'normal' | 'high' | 'urgent'>;
  projectId?: string;
  taskId?: string;
  unreadOnly?: boolean;
}

export interface UseRealtimeNotificationsReturn {
  notifications: RealtimeNotification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  isConnected: boolean;

  // Actions
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  filterNotifications: (filter: NotificationFilter) => RealtimeNotification[];

  // WebSocket
  connectionState: string;
  reconnect: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRealtimeNotifications(
  userId: string | null,
  config?: {
    autoConnect?: boolean;
    enableSound?: boolean;
    maxNotifications?: number;
  }
): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const notificationsRef = useRef<RealtimeNotification[]>([]);
  const maxNotifications = config?.maxNotifications || 50;
  const enableSound = config?.enableSound !== false;

  // Initialize WebSocket connection
  const {
    isConnected,
    connectionState,
    reconnect,
    on,
    send,
    subscribe,
  } = useEnhancedWebSocket({
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3000',
    token: userId ? undefined : '', // Token should come from auth context
    channels: userId ? [`user:${userId}`] : [],
    autoConnect: config?.autoConnect !== false && !!userId,
    reconnect: true,
  });

  // Add notification
  const addNotification = useCallback((notification: RealtimeNotification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      notificationsRef.current = updated;

      // Update unread count
      const newUnread = updated.filter(n => !n.read).length;
      setUnreadCount(newUnread);

      return updated;
    });

    // Play notification sound if enabled and priority is high or urgent
    if (enableSound && (notification.priority === 'high' || notification.priority === 'urgent')) {
      playNotificationSound(notification.priority);
    }

    // Log notification
    logger.info('Real-time notification received', {
      type: notification.type,
      title: notification.title,
      priority: notification.priority,
    });
  }, [maxNotifications, enableSound]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, read: true } : n
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Also mark in notification service
      if (userId) {
        
        await notificationService.markAsRead([id], userId);
      }
    } catch (err) {
      logger.error('Failed to mark notification as read', { id, error: err });
    }
  }, [userId]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );

      setUnreadCount(0);

      if (userId) {
        
        await notificationService.markAsRead(
          notificationsRef.current.map(n => n.id),
          userId
        );
      }
    } catch (err) {
      logger.error('Failed to mark all notifications as read', { error: err });
    }
  }, [userId]);

  // Clear notification
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      notificationsRef.current = updated;
      return updated;
    });

    // Update unread count if the notification was unread
    const removed = notificationsRef.current.find(n => n.id === id);
    if (removed && !removed.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    notificationsRef.current = [];
    setUnreadCount(0);
  }, []);

  // Filter notifications
  const filterNotifications = useCallback((filter: NotificationFilter): RealtimeNotification[] => {
    return notifications.filter(notification => {
      // Filter by type
      if (filter.types && !filter.types.includes(notification.type)) {
        return false;
      }

      // Filter by category
      if (filter.categories && notification.category && !filter.categories.includes(notification.category)) {
        return false;
      }

      // Filter by priority
      if (filter.priority && !filter.priority.includes(notification.priority)) {
        return false;
      }

      // Filter by project
      if (filter.projectId && notification.data?.projectId !== filter.projectId) {
        return false;
      }

      // Filter by task
      if (filter.taskId && notification.data?.taskId !== filter.taskId) {
        return false;
      }

      // Filter by read status
      if (filter.unreadOnly && notification.read) {
        return false;
      }

      return true;
    });
  }, [notifications]);

  // Play notification sound
  const playNotificationSound = useCallback((priority: 'high' | 'urgent') => {
    try {
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = AudioContextClass ? new AudioContextClass() : null;

      if (!audioContext) {
        return;
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Sound settings based on priority
      if (priority === 'urgent') {
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2);
      } else {
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.1);
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
      // Audio not supported or blocked
      logger.debug('Failed to play notification sound', { error: err });
    }
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    // Subscribe to notification channel
    if (isConnected && userId) {
      subscribe([`user:${userId}`, 'notifications']);
    }

    // Listen for real-time notifications
    const cleanupNotification = on<RealtimeNotification>('notification', (notification) => {
      addNotification(notification);
    });

    // Listen for task status changes
    const cleanupTaskStatus = on('task:status_changed', (data) => {
      const payload = data.payload as { taskId: string; taskTitle: string; oldStatus: string; newStatus: string };
      const { taskId, taskTitle, oldStatus, newStatus } = payload;
      const notification: RealtimeNotification = {
        id: `task:${taskId}:${Date.now()}`,
        type: 'task_status_changed',
        title: 'Task Status Changed',
        message: `Task "${taskTitle}" changed from ${oldStatus} to ${newStatus}`,
        timestamp: new Date().toISOString(),
        priority: newStatus === 'completed' ? 'normal' : 'high',
        category: 'info',
        data: data.payload as Record<string, unknown>,
        actionUrl: `/tasks/${taskId}`,
        actionText: 'View Task',
      };

      addNotification(notification);
    });

    // Listen for task assignments
    const cleanupTaskAssignment = on('task:assigned', (data) => {
      const payload = data.payload as { taskId: string; taskTitle: string; priority?: string };
      const { taskId, taskTitle } = payload;
      const notification: RealtimeNotification = {
        id: `assignment:${taskId}:${Date.now()}`,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `You have been assigned to task: ${taskTitle}`,
        timestamp: new Date().toISOString(),
        priority: payload.priority === 'urgent' ? 'urgent' : 'high',
        category: 'info',
        data: data.payload as Record<string, unknown>,
        actionUrl: `/tasks/${taskId}`,
        actionText: 'View Task',
      };

      addNotification(notification);
    });

    // Listen for task comments
    const cleanupTaskComment = on('task:comment', (data) => {
      const payload = data.payload as { taskId: string; commentId: string; author: { name: string }; content: string };
      const { taskId, commentId, author, content } = payload;
      const notification: RealtimeNotification = {
        id: `comment:${taskId}:${commentId}:${Date.now()}`,
        type: 'task_comment',
        title: 'New Comment',
        message: `${author.name} commented on: ${content.substring(0, 50)}...`,
        timestamp: new Date().toISOString(),
        priority: 'normal',
        category: 'info',
        data: data.payload as Record<string, unknown>,
        actionUrl: `/tasks/${taskId}#comment-${commentId}`,
        actionText: 'View Comment',
      };

      addNotification(notification);
    });

    // Listen for member status changes
    const cleanupMemberStatus = on('member:status_changed', (data) => {
      const payload = data.payload as { userId: string; userName: string; newStatus: string };
      const { userId, userName, newStatus } = payload;
      const notification: RealtimeNotification = {
        id: `member:${userId}:${Date.now()}`,
        type: 'member_status_changed',
        title: 'Member Status Changed',
        message: `${userName} is now ${newStatus}`,
        timestamp: new Date().toISOString(),
        priority: 'low',
        category: 'info',
        data: data.payload as Record<string, unknown>,
      };

      addNotification(notification);
    });

    // Listen for system announcements
    const cleanupSystemAnnouncement = on('system:announcement', (data) => {
      const payload = data.payload as { id: string; content: string; actionUrl?: string };
      const { id: dataId, content, actionUrl } = payload;
      const notification: RealtimeNotification = {
        id: `system:${dataId}:${Date.now()}`,
        type: 'system_announcement',
        title: 'System Announcement',
        message: content,
        timestamp: new Date().toISOString(),
        priority: 'urgent',
        category: 'warning',
        data: data.payload as Record<string, unknown>,
        actionUrl: actionUrl,
        actionText: 'Learn More',
      };

      addNotification(notification);
    });

    // Listen for project updates
    const cleanupProjectUpdate = on('project:updated', (data) => {
      const payload = data.payload as { projectId: string; projectName: string; changeType: string };
      const { projectId, projectName, changeType } = payload;
      const notification: RealtimeNotification = {
        id: `project:${projectId}:${Date.now()}`,
        type: 'project_updated',
        title: 'Project Updated',
        message: `Project "${projectName}" was ${changeType}`,
        timestamp: new Date().toISOString(),
        priority: changeType === 'deleted' ? 'urgent' : 'normal',
        category: changeType === 'deleted' ? 'error' : 'info',
        data: data.payload as Record<string, unknown>,
        actionUrl: `/projects/${projectId}`,
        actionText: 'View Project',
      };

      addNotification(notification);
    });

    // Load initial notifications
    const loadInitialNotifications = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const history = notificationService.getNotificationHistory(userId, 20);
        setNotifications(history as RealtimeNotification[]);
        notificationsRef.current = history as RealtimeNotification[];
        setUnreadCount(history.filter((n: RealtimeNotification) => !n.read).length);
      } catch (err) {
        logger.error('Failed to load initial notifications', { error: err });
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialNotifications();

    // Cleanup
    return () => {
      cleanupNotification();
      cleanupTaskStatus();
      cleanupTaskAssignment();
      cleanupTaskComment();
      cleanupMemberStatus();
      cleanupSystemAnnouncement();
      cleanupProjectUpdate();
    };
  }, [isConnected, userId, on, subscribe, addNotification]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,

    // Actions
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    filterNotifications,

    // WebSocket
    connectionState,
    reconnect,
  };
}

export default useRealtimeNotifications;
