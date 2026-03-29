/**
 * UI 通知状态管理 Store
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-29
 * 更新日期: 2026-03-29 - 重命名类型以区分 UI 通知和服务器通知
 *
 * 功能:
 * - UI 通知列表管理（Toast/Snackbar 样式通知）
 * - 未读计数
 * - 通知操作 (添加、删除、标记已读)
 * - 自动消失机制
 *
 * 注意: 此 Store 用于 UI 层面的通知显示
 * 服务器端实时通知使用 @/lib/services/notification-types.ts 中的类型
 */

import { create } from 'zustand';

/**
 * UI 通知类型（简化版，用于 Toast 显示）
 */
export type UINotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * UI 通知优先级
 */
export type UINotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * UI 通知接口
 *
 * 与服务器端 Notification 类型的区别：
 * - 没有 userId/teamId/taskId（不需要关联用户）
 * - 有 duration（自动消失时间）
 * - 有 action（可点击的操作按钮）
 */
export interface UINotification {
  id: string;
  type: UINotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  priority?: UINotificationPriority;
  duration?: number; // 自动消失时间 (毫秒)
  action?: {
    label: string;
    handler: () => void;
  };
  metadata?: Record<string, unknown>;
}

/**
 * UI 通知过滤器
 */
export interface UINotificationFilter {
  type?: UINotificationType;
  read?: boolean;
  priority?: UINotificationPriority;
  search?: string;
}

/**
 * UI 通知状态接口
 */
export interface UINotificationState {
  // 状态
  notifications: UINotification[];
  unreadCount: number;
  maxNotifications: number;

  // 添加通知
  addNotification: (
    notification: Omit<UINotification, 'id' | 'read' | 'timestamp'>
  ) => string;

  // 删除通知
  removeNotification: (id: string) => void;
  clearAll: () => void;

  // 标记已读
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;

  // 过滤
  getFilteredNotifications: (filter: UINotificationFilter) => UINotification[];

  // 快捷方法
  success: (title: string, message: string, duration?: number) => string;
  error: (title: string, message: string, duration?: number) => string;
  warning: (title: string, message: string, duration?: number) => string;
  info: (title: string, message: string, duration?: number) => string;
}

/**
 * 默认持续时间
 */
const DEFAULT_DURATION: Record<UINotificationType, number> = {
  success: 5000,
  info: 5000,
  warning: 7000,
  error: 10000,
};

/**
 * UI 通知状态 Store
 */
export const useNotificationStore = create<UINotificationState>((set, get) => ({
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

    const newNotification: UINotification = {
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
  getFilteredNotifications: (filter: UINotificationFilter) => {
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
export const selectNotifications = (state: UINotificationState) => state.notifications;
export const selectUnreadCount = (state: UINotificationState) => state.unreadCount;
export const selectUnreadNotifications = (state: UINotificationState) =>
  state.notifications.filter((n) => !n.read);

/**
 * 向后兼容的类型别名
 * @deprecated 使用 UINotification 代替
 */
export type Notification = UINotification;
export type NotificationType = UINotificationType;
export type NotificationPriority = UINotificationPriority;
export type NotificationFilter = UINotificationFilter;
export type NotificationState = UINotificationState;
