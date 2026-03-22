/**
 * 通知 Hooks
 * 
 * 提供通知偏好设置和历史管理的自定义 Hooks
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { RealtimeNotification, NotificationCategory } from './types';

// ============================================================================
// 类型定义
// ============================================================================

export interface NotificationPreferences {
  // 浏览器通知
  browserEnabled: boolean;
  
  // 声音通知
  soundEnabled: boolean;
  soundVolume: number; // 0-1
  
  // 分类设置
  categoryPreferences: Record<NotificationCategory, {
    enabled: boolean;
    sound: boolean;
    browser: boolean;
  }>;
  
  // 批量通知
  batchEnabled: boolean;
  batchDelay: number; // 毫秒
  maxBatchSize: number;
  
  // 优先级设置
  prioritySettings: {
    low: { enabled: boolean; sound: boolean };
    normal: { enabled: boolean; sound: boolean };
    high: { enabled: boolean; sound: boolean };
    urgent: { enabled: boolean; sound: boolean };
  };
}

export interface NotificationHistoryItem {
  notification: RealtimeNotification;
  read: boolean;
  dismissed: boolean;
  timestamp: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byCategory: Record<NotificationCategory, number>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_PREFERENCES: NotificationPreferences = {
  browserEnabled: false,
  soundEnabled: false,
  soundVolume: 0.5,
  categoryPreferences: {
    info: { enabled: true, sound: false, browser: false },
    warning: { enabled: true, sound: true, browser: true },
    error: { enabled: true, sound: true, browser: true },
    success: { enabled: true, sound: false, browser: false },
  },
  batchEnabled: true,
  batchDelay: 2000,
  maxBatchSize: 5,
  prioritySettings: {
    low: { enabled: true, sound: false },
    normal: { enabled: true, sound: false },
    high: { enabled: true, sound: true },
    urgent: { enabled: true, sound: true },
  },
};

// ============================================================================
// 本地存储键
// ============================================================================

const STORAGE_KEYS = {
  PREFERENCES: 'notification-preferences',
  HISTORY: 'notification-history',
  STATS: 'notification-stats',
};

// ============================================================================
// Hook: useNotificationPreferences
// ============================================================================

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  // 从本地存储加载偏好设置
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences(() => ({ ...DEFAULT_PREFERENCES, ...parsed }));
      }
    } catch (error) {
      // localStorage may be disabled - use defaults
    } finally {
      setLoaded(true);
    }
  }, []);

  // 保存偏好设置到本地存储
  const savePreferences = useCallback((newPreferences: NotificationPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(newPreferences));
    } catch (error) {
      // localStorage may be disabled - silently fail
    }
  }, []);

  // 更新单个偏好设置
  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  // 更新分类偏好
  const updateCategoryPreference = useCallback((
    category: NotificationCategory,
    settings: Partial<NotificationPreferences['categoryPreferences'][NotificationCategory]>
  ) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        categoryPreferences: {
          ...prev.categoryPreferences,
          [category]: {
            ...prev.categoryPreferences[category],
            ...settings,
          },
        },
      };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  // 更新优先级设置
  const updatePrioritySetting = useCallback((
    priority: keyof NotificationPreferences['prioritySettings'],
    settings: Partial<NotificationPreferences['prioritySettings'][typeof priority]>
  ) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        prioritySettings: {
          ...prev.prioritySettings,
          [priority]: {
            ...prev.prioritySettings[priority],
            ...settings,
          },
        },
      };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  // 检查是否应该显示通知
  const shouldShowNotification = useCallback((notification: Partial<RealtimeNotification>): boolean => {
    const { priority = 'normal', category = 'info' } = notification;
    
    // 检查优先级是否启用
    if (!preferences.prioritySettings[priority]?.enabled) {
      return false;
    }
    
    // 检查分类是否启用
    if (!preferences.categoryPreferences[category]?.enabled) {
      return false;
    }
    
    return true;
  }, [preferences]);

  // 检查是否应该播放声音
  const shouldPlaySound = useCallback((notification: Partial<RealtimeNotification>): boolean => {
    const { priority = 'normal', category = 'info' } = notification;

    // 检查全局声音设置
    if (!preferences.soundEnabled) {
      return false;
    }

    // 检查优先级声音设置
    const prioritySoundEnabled = preferences.prioritySettings[priority]?.sound;
    if (!prioritySoundEnabled) {
      return false;
    }

    // 检查分类声音设置
    if (!preferences.categoryPreferences[category]?.sound) {
      return false;
    }

    return true;
  }, [preferences]);

  // 检查是否应该显示浏览器通知
  const shouldShowBrowserNotification = useCallback((notification: Partial<RealtimeNotification>): boolean => {
    const { category = 'info' } = notification;

    // 检查全局浏览器通知设置
    if (!preferences.browserEnabled) {
      return false;
    }

    // 检查分类浏览器通知设置
    if (!preferences.categoryPreferences[category]?.browser) {
      return false;
    }

    return true;
  }, [preferences]);

  // 播放通知声音
  const playNotificationSound = useCallback(() => {
    if (!preferences.soundEnabled) return;
    
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = preferences.soundVolume;
      audio.play().catch(() => {
        // Audio may be blocked by browser autoplay policies
      });
    } catch (error) {
      // Audio not available in this environment
    }
  }, [preferences]);

  // 重置为默认设置
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
  }, []);

  return {
    preferences,
    loaded,
    updatePreference,
    updateCategoryPreference,
    updatePrioritySetting,
    shouldShowNotification,
    shouldPlaySound,
    shouldShowBrowserNotification,
    playNotificationSound,
    resetPreferences,
  };
}

// ============================================================================
// Hook: useNotificationHistory
// ============================================================================

export function useNotificationHistory(maxSize = 100) {
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 从本地存储加载历史记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved) as NotificationHistoryItem[];
        // 只加载最新的 maxSize 条记录
        setHistory(parsed.slice(0, maxSize));
      }
    } catch (error) {
      // localStorage may be disabled - start with empty history
    } finally {
      setLoaded(true);
    }
  }, [maxSize]);

  // 保存历史记录到本地存储
  const saveHistory = useCallback((newHistory: NotificationHistoryItem[]) => {
    try {
      const toSave = newHistory.slice(0, maxSize);
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(toSave));
    } catch (error) {
      // localStorage may be disabled - silently fail
    }
  }, [maxSize]);

  // 添加通知到历史记录
  const addToHistory = useCallback((notification: RealtimeNotification) => {
    setHistory(prev => {
      const newItem: NotificationHistoryItem = {
        notification,
        read: notification.read || false,
        dismissed: false,
        timestamp: Date.now(),
      };
      
      const updated = [newItem, ...prev].slice(0, maxSize);
      saveHistory(updated);
      return updated;
    });
  }, [maxSize, saveHistory]);

  // 标记为已读
  const markAsRead = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.map(item =>
        item.notification.id === id ? { ...item, read: true } : item
      );
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // 标记全部为已读
  const markAllAsRead = useCallback(() => {
    setHistory(prev => {
      const updated = prev.map(item => ({ ...item, read: true }));
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // 删除通知
  const removeNotification = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.notification.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, [saveHistory]);

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  }, []);

  // 获取统计信息
  const getStats = useCallback((): NotificationStats => {
    const stats: NotificationStats = {
      total: history.length,
      unread: 0,
      byCategory: { info: 0, warning: 0, error: 0, success: 0 },
      byType: {},
      byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
    };

    history.forEach(item => {
      const { notification } = item;

      // 未读计数
      if (!item.read) {
        stats.unread++;
      }

      // 分类统计
      const category = notification.category || 'info';
      stats.byCategory[category]++;

      // 类型统计
      const type = notification.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // 优先级统计
      const priority = notification.priority;
      stats.byPriority[priority]++;
    });

    return stats;
  }, [history]);

  // 获取未读通知
  const getUnreadNotifications = useCallback(() => {
    return history.filter(item => !item.read);
  }, [history]);

  // 获取按分类分组的通知
  const getNotificationsByCategory = useCallback((category?: NotificationCategory) => {
    if (category) {
      return history.filter(item => item.notification.category === category);
    }
    return history;
  }, [history]);

  // 搜索通知
  const searchNotifications = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return history.filter(item => {
      const { notification } = item;
      return (
        notification.title.toLowerCase().includes(lowerQuery) ||
        notification.message.toLowerCase().includes(lowerQuery)
      );
    });
  }, [history]);

  // 按日期范围筛选
  const getNotificationsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return history.filter(item => item.timestamp >= start && item.timestamp <= end);
  }, [history]);

  // 统计信息（使用 useMemo 优化）
  const stats = useMemo(() => getStats(), [getStats]);

  return {
    history,
    loaded,
    stats,
    addToHistory,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearHistory,
    getUnreadNotifications,
    getNotificationsByCategory,
    searchNotifications,
    getNotificationsByDateRange,
  };
}

// ============================================================================
// Hook: useNotificationBatching (辅助 Hook)
// ============================================================================

export function useNotificationBatching() {
  const [batchQueue, setBatchQueue] = useState<RealtimeNotification[]>([]);
  const [batchTimeout, setBatchTimeout] = useState<NodeJS.Timeout | null>(null);

  // 添加通知到批处理队列
  const addToBatch = useCallback((notification: RealtimeNotification, onBatchReady: (notifications: RealtimeNotification[]) => void, delay = 2000) => {
    setBatchQueue(prev => [...prev, notification]);

    // 清除之前的定时器
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }

    // 设置新的定时器
    const timeout = setTimeout(() => {
      setBatchQueue(current => {
        if (current.length > 0) {
          onBatchReady(current);
          return [];
        }
        return current;
      });
    }, delay);

    setBatchTimeout(timeout);
  }, [batchTimeout]);

  // 立即刷新批处理队列
  const flushBatch = useCallback((onBatchReady: (notifications: RealtimeNotification[]) => void) => {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
      setBatchTimeout(null);
    }

    setBatchQueue(current => {
      if (current.length > 0) {
        onBatchReady(current);
        return [];
      }
      return current;
    });
  }, [batchTimeout]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }
    };
  }, [batchTimeout]);

  return {
    addToBatch,
    flushBatch,
    batchSize: batchQueue.length,
  };
}
