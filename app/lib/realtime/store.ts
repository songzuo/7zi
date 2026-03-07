/**
 * 实时通知状态管理
 * 
 * 使用 Zustand 管理实时通知的状态
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  RealtimeNotification,
  RealtimeNotificationState,
  RealtimeNotificationType,
  WebSocketMessage,
} from './types';

/** 生成唯一 ID */
function generateId(): string {
  return `rt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/** 根据消息类型生成通知标题 */
function getNotificationTitle(type: RealtimeNotificationType, message: WebSocketMessage): string {
  switch (type) {
    case 'task_status_changed':
      return '任务状态更新';
    case 'task_assigned':
      return '新任务分配';
    case 'task_comment':
      return '任务有新评论';
    case 'member_online':
      return '成员上线';
    case 'member_offline':
      return '成员离线';
    case 'member_status_changed':
      return '成员状态变更';
    case 'system_announcement':
      return '系统公告';
    case 'project_updated':
      return '项目更新';
    default:
      return '新通知';
  }
}

/** 根据消息类型生成通知图标 */
function getNotificationIcon(type: RealtimeNotificationType): string {
  switch (type) {
    case 'task_status_changed':
      return '📋';
    case 'task_assigned':
      return '📌';
    case 'task_comment':
      return '💬';
    case 'member_online':
      return '🟢';
    case 'member_offline':
      return '⚫';
    case 'member_status_changed':
      return '🔄';
    case 'system_announcement':
      return '📢';
    case 'project_updated':
      return '📁';
    default:
      return '🔔';
  }
}

/** 根据消息类型获取优先级 */
function getNotificationPriority(
  type: RealtimeNotificationType,
  message: WebSocketMessage
): 'low' | 'normal' | 'high' {
  switch (type) {
    case 'system_announcement': {
      const level = (message.payload as { level?: string })?.level;
      return level === 'critical' ? 'high' : level === 'warning' ? 'normal' : 'low';
    }
    case 'task_assigned':
      return 'high';
    case 'task_comment':
    case 'task_status_changed':
      return 'normal';
    case 'member_online':
    case 'member_offline':
    case 'member_status_changed':
      return 'low';
    default:
      return 'normal';
  }
}

/** 从 WebSocket 消息创建通知 */
export function createNotificationFromMessage(message: WebSocketMessage): RealtimeNotification {
  const typeMap: Record<string, RealtimeNotificationType> = {
    'task:status_changed': 'task_status_changed',
    'task:assigned': 'task_assigned',
    'task:comment': 'task_comment',
    'member:online': 'member_online',
    'member:offline': 'member_offline',
    'member:status_changed': 'member_status_changed',
    'system:announcement': 'system_announcement',
    'project:updated': 'project_updated',
  };

  const type = typeMap[message.type] || 'system_announcement';
  const payload = message.payload as Record<string, unknown>;

  // 根据消息类型生成通知内容
  let title = getNotificationTitle(type, message);
  let notificationMessage = '';
  let actionUrl: string | undefined;
  let actionText: string | undefined;
  let avatar: string | undefined;

  switch (type) {
    case 'task_status_changed': {
      const p = payload as {
        taskTitle: string;
        oldStatus: string;
        newStatus: string;
        changedBy: { name: string };
        taskId: string;
      };
      notificationMessage = `${p.taskTitle} 从 ${p.oldStatus} 变更为 ${p.newStatus}（${p.changedBy.name}）`;
      actionUrl = `/tasks/${p.taskId}`;
      actionText = '查看任务';
      break;
    }
    case 'task_assigned': {
      const p = payload as {
        taskTitle: string;
        assignedTo: { name: string };
        assignedBy: { name: string };
        taskId: string;
      };
      notificationMessage = `${p.assignedBy.name} 将 "${p.taskTitle}" 分配给了 ${p.assignedTo.name}`;
      actionUrl = `/tasks/${p.taskId}`;
      actionText = '查看任务';
      break;
    }
    case 'task_comment': {
      const p = payload as {
        taskTitle: string;
        content: string;
        author: { name: string; avatar?: string };
        taskId: string;
      };
      notificationMessage = `${p.author.name} 在 "${p.taskTitle}" 中评论: ${p.content.slice(0, 50)}...`;
      actionUrl = `/tasks/${p.taskId}#comments`;
      actionText = '查看评论';
      avatar = p.author.avatar;
      break;
    }
    case 'member_online': {
      const p = payload as { userName: string; avatar?: string };
      notificationMessage = `${p.userName} 已上线`;
      avatar = p.avatar;
      break;
    }
    case 'member_offline': {
      const p = payload as { userName: string };
      notificationMessage = `${p.userName} 已离线`;
      break;
    }
    case 'member_status_changed': {
      const p = payload as { userName: string; oldStatus: string; newStatus: string };
      notificationMessage = `${p.userName} 状态从 ${p.oldStatus} 变更为 ${p.newStatus}`;
      break;
    }
    case 'system_announcement': {
      const p = payload as {
        title: string;
        content: string;
        actionUrl?: string;
        actionText?: string;
      };
      title = p.title;
      notificationMessage = p.content;
      actionUrl = p.actionUrl;
      actionText = p.actionText;
      break;
    }
    case 'project_updated': {
      const p = payload as {
        projectName: string;
        changeType: string;
        changedBy: { name: string };
        projectId: string;
      };
      notificationMessage = `${p.changedBy.name} ${p.changeType === 'created' ? '创建了' : p.changeType === 'deleted' ? '删除了' : '更新了'} 项目 "${p.projectName}"`;
      actionUrl = `/projects/${p.projectId}`;
      actionText = '查看项目';
      break;
    }
    default:
      notificationMessage = JSON.stringify(payload);
  }

  return {
    id: message.id || generateId(),
    type,
    title,
    message: notificationMessage,
    timestamp: message.timestamp || new Date().toISOString(),
    read: false,
    data: payload as Record<string, unknown>,
    actionUrl,
    actionText,
    priority: getNotificationPriority(type, message),
    icon: getNotificationIcon(type),
    avatar,
  };
}

/** 最大通知数量 */
const MAX_NOTIFICATIONS = 50;

/** 创建 Store */
export const useRealtimeNotificationStore = create<RealtimeNotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isConnected: false,
      lastHeartbeat: null,

      /**
       * 添加新通知
       */
      addNotification: (notification: RealtimeNotification) => {
        set((state) => {
          // 检查是否已存在相同 ID 的通知
          const exists = state.notifications.some(n => n.id === notification.id);
          if (exists) return state;

          // 添加到列表开头，限制最大数量
          const newNotifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
          
          return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.read).length,
          };
        });
      },

      /**
       * 标记单个通知为已读
       */
      markAsRead: (id: string) => {
        set((state) => {
          const notifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });
      },

      /**
       * 标记所有通知为已读
       */
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      /**
       * 删除单个通知
       */
      removeNotification: (id: string) => {
        set((state) => {
          const notifications = state.notifications.filter(n => n.id !== id);
          return {
            notifications,
            unreadCount: notifications.filter(n => !n.read).length,
          };
        });
      },

      /**
       * 清空所有通知
       */
      clearAll: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      /**
       * 设置连接状态
       */
      setConnected: (connected: boolean) => {
        set({ isConnected: connected });
      },

      /**
       * 更新心跳时间
       */
      updateHeartbeat: (timestamp: string) => {
        set({ lastHeartbeat: timestamp });
      },
    }),
    {
      name: 'realtime-notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 只持久化通知数据，不持久化连接状态
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

/** 获取未读通知 */
export function useUnreadNotifications() {
  return useRealtimeNotificationStore((state) =>
    state.notifications.filter((n) => !n.read)
  );
}

/** 获取已读通知 */
export function useReadNotifications() {
  return useRealtimeNotificationStore((state) =>
    state.notifications.filter((n) => n.read)
  );
}

/** 获取指定类型的通知 */
export function useNotificationsByType(type: RealtimeNotificationType) {
  return useRealtimeNotificationStore((state) =>
    state.notifications.filter((n) => n.type === type)
  );
}

/** 获取高优先级通知 */
export function useHighPriorityNotifications() {
  return useRealtimeNotificationStore((state) =>
    state.notifications.filter((n) => n.priority === 'high' && !n.read)
  );
}

export type { RealtimeNotificationState };