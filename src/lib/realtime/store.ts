/**
 * 通知状态管理 Store
 * 
 * 使用 Zustand 管理通知状态
 */

import { create } from 'zustand';
import type { RealtimeNotification } from './types';

// ============================================================================
// Store 定义
// ============================================================================

interface NotificationStore {
  // 状态
  notifications: RealtimeNotification[];
  unreadCount: number;
  isConnected: boolean;
  
  // 操作方法
  addNotification: (notification: RealtimeNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setConnected: (connected: boolean) => void;
}

// ============================================================================
// Store 实现
// ============================================================================

export const useRealtimeNotificationStore = create<NotificationStore>((set, get) => ({
  // 初始状态
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  
  // 添加通知
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 100), // 最多保留 100 条
      unreadCount: state.unreadCount + 1,
    }));
  },
  
  // 标记为已读
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
  
  // 全部标记为已读
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
  
  // 删除通知
  removeNotification: (id) => {
    set((state) => {
      const removed = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: removed && !removed.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    });
  },
  
  // 清空所有通知
  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },
  
  // 设置连接状态
  setConnected: (connected) => {
    set({ isConnected: connected });
  },
}));

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从 WebSocket 消息创建通知
 */
export function createNotificationFromMessage(
  message: unknown
): RealtimeNotification {
  const msg = message as Record<string, unknown>;
  const type = (msg.type as string) || 'system:announcement';
  const payload = (msg.payload as Record<string, unknown>) || {};

  return {
    id: (msg.id as string) || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: mapMessageTypeToNotificationType(type),
    title: (payload.title as string) || getDefaultTitle(type),
    message: (payload.message as string) || (payload.description as string) || getDefaultMessage(type),
    read: false,
    timestamp: (msg.timestamp as string) || new Date().toISOString(),
    priority: (payload.priority as RealtimeNotification['priority']) || 'normal',
    icon: (payload.icon as string) || getDefaultIcon(type),
    actionUrl: payload.actionUrl as string | undefined,
    actionText: payload.actionText as string | undefined,
    data: payload,
  };
}

/**
 * 映射消息类型到通知类型
 */
function mapMessageTypeToNotificationType(
  messageType: string
): RealtimeNotification['type'] {
  const typeMap: Record<string, RealtimeNotification['type']> = {
    'task:status_changed': 'task_status_changed',
    'task:assigned': 'task_assigned',
    'task:comment': 'task_comment',
    'member:online': 'member_online',
    'member:offline': 'member_offline',
    'member:status_changed': 'member_status_changed',
    'system:announcement': 'system_announcement',
    'project:updated': 'project_updated',
  };

  return typeMap[messageType] || 'system_announcement';
}

/**
 * 获取默认标题
 */
function getDefaultTitle(messageType: string): string {
  const titleMap: Record<string, string> = {
    'task:status_changed': '任务状态变更',
    'task:assigned': '新任务分配',
    'task:comment': '任务评论',
    'member:online': '成员上线',
    'member:offline': '成员离线',
    'member:status_changed': '成员状态变更',
    'system:announcement': '系统公告',
    'project:updated': '项目更新',
  };

  return titleMap[messageType] || '通知';
}

/**
 * 获取默认消息
 */
function getDefaultMessage(messageType: string): string {
  const messageMap: Record<string, string> = {
    'task:status_changed': '任务状态已更新',
    'task:assigned': '您被分配了新任务',
    'task:comment': '任务有新评论',
    'member:online': '成员已上线',
    'member:offline': '成员已离线',
    'member:status_changed': '成员状态已变更',
    'system:announcement': '收到系统公告',
    'project:updated': '项目已更新',
  };

  return messageMap[messageType] || '收到新通知';
}

/**
 * 获取默认图标
 */
function getDefaultIcon(messageType: string): string | undefined {
  const iconMap: Record<string, string> = {
    'task:status_changed': '📋',
    'task:assigned': '✅',
    'task:comment': '💬',
    'member:online': '🟢',
    'member:offline': '⚫',
    'member:status_changed': '🔄',
    'system:announcement': '📢',
    'project:updated': '📁',
  };

  return iconMap[messageType];
}
