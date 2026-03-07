'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
type NotificationCategory = 'task' | 'system' | 'mention' | 'message' | 'alert';

interface EnhancedNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  icon?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
  actionUrl?: string;
  actionText?: string;
}

interface UseEnhancedNotificationsOptions {
  autoFetch?: boolean;
  fetchInterval?: number;
  maxNotifications?: number;
}

interface UseEnhancedNotificationsReturn {
  notifications: EnhancedNotification[];
  unreadCount: number;
  urgentCount: number;
  isLoading: boolean;
  error: Error | null;
  
  // 操作方法
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
  clearAll: () => void;
  
  // 过滤
  filter: 'all' | NotificationCategory | 'unread';
  setFilter: (filter: 'all' | NotificationCategory | 'unread') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredNotifications: EnhancedNotification[];
  
  // 快捷方法
  push: (notification: Omit<EnhancedNotification, 'id' | 'timestamp' | 'read' | 'dismissed'>) => void;
  success: (title: string, message: string, options?: Partial<EnhancedNotification>) => void;
  notifyError: (title: string, message: string, options?: Partial<EnhancedNotification>) => void;
  warning: (title: string, message: string, options?: Partial<EnhancedNotification>) => void;
  info: (title: string, message: string, options?: Partial<EnhancedNotification>) => void;
}

// ============================================================================
// Hook 实现
// ============================================================================

export function useEnhancedNotifications(
  options: UseEnhancedNotificationsOptions = {}
): UseEnhancedNotificationsReturn {
  const {
    autoFetch = true,
    fetchInterval = 30000, // 30秒
    maxNotifications = 100,
  } = options;

  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<Error | null>(null);
  const [filter, setFilter] = useState<'all' | NotificationCategory | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 获取通知
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setErrorState(null);
    
    try {
      const params = new URLSearchParams({
        limit: String(maxNotifications),
      });
      
      const response = await fetch(`/api/notifications?${params}`);
      
      if (!response.ok) {
        throw new Error('获取通知失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setNotifications(result.data.notifications);
      }
    } catch (err) {
      setErrorState(err instanceof Error ? err : new Error('未知错误'));
    } finally {
      setIsLoading(false);
    }
  }, [maxNotifications]);

  // 自动获取
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
      
      if (fetchInterval > 0) {
        const interval = setInterval(fetchNotifications, fetchInterval);
        return () => clearInterval(interval);
      }
    }
  }, [autoFetch, fetchInterval, fetchNotifications]);

  // 统计
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read && !n.dismissed).length,
    [notifications]
  );
  
  const urgentCount = useMemo(() => 
    notifications.filter(n => n.priority === 'urgent' && !n.read && !n.dismissed).length,
    [notifications]
  );

  // 过滤通知
  const filteredNotifications = useMemo(() => {
    let result = notifications.filter(n => !n.dismissed);
    
    if (filter === 'unread') {
      result = result.filter(n => !n.read);
    } else if (filter !== 'all') {
      result = result.filter(n => n.category === filter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }
    
    // 排序
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    result.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    return result;
  }, [notifications, filter, searchQuery]);

  // 标记已读
  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', notificationIds: [id] }),
      });
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  }, []);

  // 全部已读
  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
    } catch (err) {
      console.error('标记全部已读失败:', err);
    }
  }, []);

  // 关闭通知
  const dismiss = useCallback(async (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );
    
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', notificationIds: [id] }),
      });
    } catch (err) {
      console.error('关闭通知失败:', err);
    }
  }, []);

  // 清除已读
  const clearRead = useCallback(async () => {
    setNotifications(prev => prev.filter(n => !n.read));
    
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_read' }),
      });
    } catch (err) {
      console.error('清除已读失败:', err);
    }
  }, []);

  // 清空全部
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // 添加通知
  const push = useCallback((notification: Omit<EnhancedNotification, 'id' | 'timestamp' | 'read' | 'dismissed'>) => {
    const newNotification: EnhancedNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
      dismissed: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // 快捷方法
  const success = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    push({ type: 'success', category: 'task', priority: 'normal', title, message, ...options });
  }, [push]);

  const notifyError = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    push({ type: 'error', category: 'alert', priority: 'high', title, message, ...options });
  }, [push]);

  const warning = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    push({ type: 'warning', category: 'system', priority: 'normal', title, message, ...options });
  }, [push]);

  const info = useCallback((title: string, message: string, options?: Partial<EnhancedNotification>) => {
    push({ type: 'info', category: 'message', priority: 'low', title, message, ...options });
  }, [push]);

  return {
    notifications,
    unreadCount,
    urgentCount,
    isLoading,
    error: errorState,
    
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearRead,
    clearAll,
    
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filteredNotifications,
    
    push,
    success,
    notifyError,
    warning,
    info,
  };
}

export type { 
  EnhancedNotification, 
  NotificationPriority, 
  NotificationCategory,
  UseEnhancedNotificationsReturn 
};