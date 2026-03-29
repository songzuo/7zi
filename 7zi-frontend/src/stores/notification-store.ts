/**
 * 通知状态管理 Store
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-29
 *
 * 功能:
 * - 通知列表管理
 * - 未读计数
 * - 通知操作 (添加、删除、标记已读)
 * - 自动消失机制
 */

import { create } from 'zustand';

/**
 * 通知类型
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * 通知优先级
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 通知接口
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  priority?: NotificationPriority;
  duration?: number; // 自动消失时间 (毫秒)
  action?: {
    label: string;
    handler: () => void;
  };
  metadata?: Record<string, unknown>;
}

/**
 * 通知过滤器
 */
export interface NotificationFilter {
  type?: NotificationType;
  read?: boolean;
  priority?: NotificationPriority;
  search?: string;
}

/**
 * 通知状态接口
 */
export interface NotificationState {
  // 状态
  notifications: Notification[];
  unreadCount: number;
  maxNotifications: number;

  // 添加通知
  addNotification: (
    notification: Omit<Notification, 'id' | 'read' | 'timestamp'>
  ) => string;

  // 删除通知
  removeNotification: (id: string) => void;
  clearAll: () => void;

  // 标记已读
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;

  // 过滤
  getFilteredNotifications: (filter: NotificationFilter) => Notification[];

  // 快捷方法
  success: (title: string, message: string, duration?: number) => string;
  error: (title: string, message: string, duration?: number) => string;
  warning: (title: string, message: string, duration?: number) => string;
  info: (title: string, message: string, duration?: number) => string;
}

/**
 * 默认持续时间
 */
const DEFAULT_DURATION = {
  success: 5000,
  info: 5000,
  warning: 7000,
  error: 10000,
};

/**
 * 通知状态 Store
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  maxNotifications: 100,

  /**
   * 添加通知
   */
  addNotification: (notification) => {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const duration = notification.duration ?? DEFAULT_DURATION[notification.type];

    const newNotification: Notification = {
      ...notification,
      id,
      read: false,
      timestamp,
      duration,
    };

    set((state) => {
      const updated = [newNotification, ...state.notifications].slice(
        0,
        state.maxNotifications
      );

      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });

    // 自动消失
    if (duration && duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }

    return id;
  },

  /**
   * 删除通知
   */
  removeNotification: (id: string) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  /**
   * 清除所有通知
   */
  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  /**
   * 标记已读
   */
  markAsRead: (id: string) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  /**
   * 全部标记已读
   */
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  /**
   * 获取过滤后的通知
   */
  getFilteredNotifications: (filter: NotificationFilter) => {
    const { notifications } = get();
    let filtered = [...notifications];

    if (filter.type) {
      filtered = filtered.filter((n) => n.type === filter.type);
    }

    if (filter.read !== undefined) {
      filtered = filtered.filter((n) => n.read === filter.read);
    }

    if (filter.priority) {
      filtered = filtered.filter((n) => n.priority === filter.priority);
    }

    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.message.toLowerCase().includes(search)
      );
    }

    return filtered;
  },

  /**
   * 快捷方法 - 成功通知
   */
  success: (title: string, message: string, duration?: number) => {
    return get().addNotification({ type: 'success', title, message, duration });
  },

  /**
   * 快捷方法 - 错误通知
   */
  error: (title: string, message: string, duration?: number) => {
    return get().addNotification({ type: 'error', title, message, duration });
  },

  /**
   * 快捷方法 - 警告通知
   */
  warning: (title: string, message: string, duration?: number) => {
    return get().addNotification({ type: 'warning', title, message, duration });
  },

  /**
   * 快捷方法 - 信息通知
   */
  info: (title: string, message: string, duration?: number) => {
    return get().addNotification({ type: 'info', title, message, duration });
  },
}));

/**
 * 选择器 - 用于性能优化
 */
export const selectNotifications = (state: NotificationState) => state.notifications;
export const selectUnreadCount = (state: NotificationState) => state.unreadCount;
export const selectUnreadNotifications = (state: NotificationState) =>
  state.notifications.filter((n) => !n.read);
