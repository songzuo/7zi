/**
 * 实时通知系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useRealtimeNotificationStore,
  createNotificationFromMessage,
} from '../store';
import type { WebSocketMessage, RealtimeNotification } from '../types';
import {
  getTaskStatusLabel,
  getUserStatusLabel,
  formatRelativeTime,
  shouldNotifyImmediately,
  getMessagePriority,
  isValidMessage,
  createMessageSummary,
} from '../utils';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] || null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('实时通知系统', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useRealtimeNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isConnected: false,
      lastHeartbeat: null,
    });
  });

  describe('Store', () => {
    it('应该正确添加通知', () => {
      const store = useRealtimeNotificationStore.getState();
      const notification: RealtimeNotification = {
        id: 'test-1',
        type: 'task_assigned',
        title: '新任务',
        message: '您有新任务',
        timestamp: new Date().toISOString(),
        read: false,
      };

      store.addNotification(notification);

      const state = useRealtimeNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].id).toBe('test-1');
      expect(state.unreadCount).toBe(1);
    });

    it('应该正确标记单个通知为已读', () => {
      const store = useRealtimeNotificationStore.getState();
      const notification: RealtimeNotification = {
        id: 'test-1',
        type: 'task_assigned',
        title: '新任务',
        message: '您有新任务',
        timestamp: new Date().toISOString(),
        read: false,
      };

      store.addNotification(notification);
      store.markAsRead('test-1');

      const state = useRealtimeNotificationStore.getState();
      expect(state.notifications[0].read).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('应该正确标记所有通知为已读', () => {
      const store = useRealtimeNotificationStore.getState();

      store.addNotification({
        id: 'test-1',
        type: 'task_assigned',
        title: '任务1',
        message: '消息1',
        timestamp: new Date().toISOString(),
        read: false,
      });

      store.addNotification({
        id: 'test-2',
        type: 'task_status_changed',
        title: '任务2',
        message: '消息2',
        timestamp: new Date().toISOString(),
        read: false,
      });

      store.markAllAsRead();

      const state = useRealtimeNotificationStore.getState();
      expect(state.notifications.every(n => n.read)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });

    it('应该正确删除通知', () => {
      const store = useRealtimeNotificationStore.getState();

      store.addNotification({
        id: 'test-1',
        type: 'task_assigned',
        title: '任务1',
        message: '消息1',
        timestamp: new Date().toISOString(),
        read: false,
      });

      store.removeNotification('test-1');

      const state = useRealtimeNotificationStore.getState();
      expect(state.notifications).toHaveLength(0);
    });

    it('应该限制最大通知数量', () => {
      const store = useRealtimeNotificationStore.getState();

      // 添加 60 个通知（超过限制 50）
      for (let i = 0; i < 60; i++) {
        store.addNotification({
          id: `test-${i}`,
          type: 'task_assigned',
          title: `任务${i}`,
          message: `消息${i}`,
          timestamp: new Date().toISOString(),
          read: false,
        });
      }

      const state = useRealtimeNotificationStore.getState();
      expect(state.notifications.length).toBeLessThanOrEqual(50);
    });

    it('应该正确设置连接状态', () => {
      const store = useRealtimeNotificationStore.getState();

      store.setConnected(true);
      expect(useRealtimeNotificationStore.getState().isConnected).toBe(true);

      store.setConnected(false);
      expect(useRealtimeNotificationStore.getState().isConnected).toBe(false);
    });

    it('应该正确更新心跳时间', () => {
      const store = useRealtimeNotificationStore.getState();
      const timestamp = new Date().toISOString();

      store.updateHeartbeat(timestamp);

      const state = useRealtimeNotificationStore.getState();
      expect(state.lastHeartbeat).toBe(timestamp);
    });
  });

  describe('createNotificationFromMessage', () => {
    it('应该正确转换任务状态变更消息', () => {
      const message: WebSocketMessage = {
        type: 'task:status_changed',
        id: 'msg-1',
        timestamp: new Date().toISOString(),
        payload: {
          taskId: 'task-1',
          taskTitle: '开发新功能',
          oldStatus: 'pending',
          newStatus: 'in_progress',
          changedBy: {
            id: 'user-1',
            name: '张三',
          },
        },
      };

      const notification = createNotificationFromMessage(message);

      expect(notification.type).toBe('task_status_changed');
      expect(notification.title).toBe('任务状态更新');
      expect(notification.actionUrl).toBe('/tasks/task-1');
      expect(notification.icon).toBe('📋');
    });

    it('应该正确转换任务分配消息', () => {
      const message: WebSocketMessage = {
        type: 'task:assigned',
        id: 'msg-2',
        timestamp: new Date().toISOString(),
        payload: {
          taskId: 'task-2',
          taskTitle: '修复 Bug',
          assignedTo: { id: 'user-2', name: '李四' },
          assignedBy: { id: 'user-1', name: '张三' },
        },
      };

      const notification = createNotificationFromMessage(message);

      expect(notification.type).toBe('task_assigned');
      expect(notification.title).toBe('新任务分配');
      expect(notification.priority).toBe('high');
      expect(notification.actionUrl).toBe('/tasks/task-2');
    });

    it('应该正确转换系统公告消息', () => {
      const message: WebSocketMessage = {
        type: 'system:announcement',
        id: 'msg-3',
        timestamp: new Date().toISOString(),
        payload: {
          title: '系统维护通知',
          content: '系统将于今晚进行维护',
          level: 'warning',
          actionUrl: '/maintenance',
          actionText: '查看详情',
        },
      };

      const notification = createNotificationFromMessage(message);

      expect(notification.type).toBe('system_announcement');
      expect(notification.title).toBe('系统维护通知');
      expect(notification.message).toBe('系统将于今晚进行维护');
      expect(notification.priority).toBe('normal');
    });

    it('应该正确转换成员上线消息', () => {
      const message: WebSocketMessage = {
        type: 'member:online',
        id: 'msg-4',
        timestamp: new Date().toISOString(),
        payload: {
          userId: 'user-3',
          userName: '王五',
          avatar: 'https://example.com/avatar.jpg',
        },
      };

      const notification = createNotificationFromMessage(message);

      expect(notification.type).toBe('member_online');
      expect(notification.title).toBe('成员上线');
      expect(notification.message).toBe('王五 已上线');
      expect(notification.priority).toBe('low');
    });
  });

  describe('工具函数', () => {
    describe('getTaskStatusLabel', () => {
      it('应该返回正确的任务状态标签', () => {
        expect(getTaskStatusLabel('pending')).toBe('待处理');
        expect(getTaskStatusLabel('in_progress')).toBe('进行中');
        expect(getTaskStatusLabel('completed')).toBe('已完成');
        expect(getTaskStatusLabel('cancelled')).toBe('已取消');
        expect(getTaskStatusLabel('blocked')).toBe('已阻塞');
      });

      it('未知状态应返回原值', () => {
        expect(getTaskStatusLabel('unknown')).toBe('unknown');
      });
    });

    describe('getUserStatusLabel', () => {
      it('应该返回正确的用户状态标签', () => {
        expect(getUserStatusLabel('online')).toBe('在线');
        expect(getUserStatusLabel('offline')).toBe('离线');
        expect(getUserStatusLabel('away')).toBe('离开');
        expect(getUserStatusLabel('busy')).toBe('忙碌');
      });
    });

    describe('formatRelativeTime', () => {
      it('应该返回"刚刚"', () => {
        const timestamp = new Date().toISOString();
        expect(formatRelativeTime(timestamp)).toBe('刚刚');
      });

      it('应该返回分钟数', () => {
        const timestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        expect(formatRelativeTime(timestamp)).toBe('5 分钟前');
      });

      it('应该返回小时数', () => {
        const timestamp = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(timestamp)).toBe('3 小时前');
      });

      it('应该返回天数', () => {
        const timestamp = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeTime(timestamp)).toBe('2 天前');
      });
    });

    describe('shouldNotifyImmediately', () => {
      it('关键系统公告应立即通知', () => {
        const message: WebSocketMessage = {
          type: 'system:announcement',
          id: '1',
          timestamp: new Date().toISOString(),
          payload: {
            title: '紧急通知',
            content: '系统紧急维护',
            level: 'critical',
          },
        };

        expect(shouldNotifyImmediately(message)).toBe(true);
      });

      it('分配给自己的任务应立即通知', () => {
        const message: WebSocketMessage = {
          type: 'task:assigned',
          id: '2',
          timestamp: new Date().toISOString(),
          payload: {
            taskId: 'task-1',
            taskTitle: '新任务',
            assignedTo: { id: 'user-1', name: '我' },
            assignedBy: { id: 'user-2', name: '他人' },
          },
        };

        expect(shouldNotifyImmediately(message, 'user-1')).toBe(true);
        expect(shouldNotifyImmediately(message, 'user-2')).toBe(false);
      });

      it('提及自己的评论应立即通知', () => {
        const message: WebSocketMessage = {
          type: 'task:comment',
          id: '3',
          timestamp: new Date().toISOString(),
          payload: {
            taskId: 'task-1',
            taskTitle: '任务',
            commentId: 'comment-1',
            content: '@user-1 你好',
            author: { id: 'user-2', name: '他人' },
            mentions: [{ id: 'user-1', name: '我' }],
          },
        };

        expect(shouldNotifyImmediately(message, 'user-1')).toBe(true);
      });
    });

    describe('getMessagePriority', () => {
      it('关键公告优先级应最高', () => {
        const message: WebSocketMessage = {
          type: 'system:announcement',
          id: '1',
          timestamp: new Date().toISOString(),
          payload: {
            title: '紧急',
            content: '内容',
            level: 'critical',
          },
        };

        expect(getMessagePriority(message)).toBe(100);
      });

      it('任务分配优先级应较高', () => {
        const message: WebSocketMessage = {
          type: 'task:assigned',
          id: '2',
          timestamp: new Date().toISOString(),
          payload: {
            taskId: 'task-1',
            taskTitle: '任务',
            assignedTo: { id: 'u1', name: '用户' },
            assignedBy: { id: 'u2', name: '管理员' },
          },
        };

        expect(getMessagePriority(message)).toBe(70);
      });

      it('成员上线/离线优先级应最低', () => {
        const onlineMsg: WebSocketMessage = {
          type: 'member:online',
          id: '3',
          timestamp: new Date().toISOString(),
          payload: { userId: 'u1', userName: '用户' },
        };

        expect(getMessagePriority(onlineMsg)).toBe(10);
      });
    });

    describe('isValidMessage', () => {
      it('应该验证有效消息', () => {
        const message = {
          type: 'task:status_changed',
          id: '1',
          timestamp: new Date().toISOString(),
          payload: { taskId: 'task-1' },
        };

        expect(isValidMessage(message)).toBe(true);
      });

      it('应该拒绝无效消息', () => {
        expect(isValidMessage(null)).toBe(false);
        expect(isValidMessage({})).toBe(false);
        expect(isValidMessage({ type: 123 })).toBe(false);
        expect(isValidMessage({ type: 'test' })).toBe(false); // 无 payload
      });
    });

    describe('createMessageSummary', () => {
      it('应该创建消息摘要', () => {
        const message: WebSocketMessage = {
          type: 'task:status_changed',
          id: '1',
          timestamp: new Date().toISOString(),
          payload: { taskId: 'task-1' },
        };

        const summary = createMessageSummary(message);
        expect(summary).toContain('任务状态');
      });
    });
  });
});

describe('SocketManager', () => {
  // SocketManager 测试需要 mock socket.io-client
  // 这里只测试基本结构
  
  it('应该导出 socketManager 单例', async () => {
    const { socketManager } = await import('../socket-client');
    expect(socketManager).toBeDefined();
    expect(typeof socketManager.connect).toBe('function');
    expect(typeof socketManager.disconnect).toBe('function');
    expect(typeof socketManager.emit).toBe('function');
    expect(typeof socketManager.on).toBe('function');
  });
});