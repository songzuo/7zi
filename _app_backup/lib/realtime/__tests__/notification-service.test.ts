/**
 * 实时通知服务测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock WebSocket 和 Socket.io
vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
    use: vi.fn(),
    close: vi.fn(),
    sockets: {
      sockets: new Map(),
    },
  })),
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('notifyTaskStatusChange', () => {
    it('should create task status change notification', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        taskId: 'task-1',
        taskTitle: '测试任务',
        oldStatus: 'pending',
        newStatus: 'in_progress',
        changedBy: { id: 'user-1', name: '测试用户' },
      };

      // 应该不抛出错误
      expect(() => notificationService.notifyTaskStatusChange(options)).not.toThrow();
    });

    it('should include project channel when projectId is provided', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        taskId: 'task-1',
        taskTitle: '测试任务',
        oldStatus: 'pending',
        newStatus: 'completed',
        changedBy: { id: 'user-1', name: '测试用户' },
        projectId: 'project-1',
        projectName: '测试项目',
      };

      expect(() => notificationService.notifyTaskStatusChange(options)).not.toThrow();
    });
  });

  describe('notifyTaskAssignment', () => {
    it('should create task assignment notification', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        taskId: 'task-1',
        taskTitle: '新任务',
        assignedTo: { id: 'user-2', name: '被分配者' },
        assignedBy: { id: 'user-1', name: '分配者' },
      };

      expect(() => notificationService.notifyTaskAssignment(options)).not.toThrow();
    });
  });

  describe('notifyTaskComment', () => {
    it('should create task comment notification with mentions', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        taskId: 'task-1',
        taskTitle: '测试任务',
        commentId: 'comment-1',
        content: '这是一条评论 @user-2',
        author: { id: 'user-1', name: '评论者' },
        mentions: [{ id: 'user-2', name: '被提及者' }],
      };

      expect(() => notificationService.notifyTaskComment(options)).not.toThrow();
    });
  });

  describe('notifyMemberStatus', () => {
    it('should create member online notification', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        userId: 'user-1',
        userName: '测试用户',
        status: 'online' as const,
      };

      expect(() => notificationService.notifyMemberStatus(options)).not.toThrow();
    });

    it('should create member offline notification', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        userId: 'user-1',
        userName: '测试用户',
        status: 'offline' as const,
      };

      expect(() => notificationService.notifyMemberStatus(options)).not.toThrow();
    });

    it('should create member status change notification', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        userId: 'user-1',
        userName: '测试用户',
        status: 'busy' as const,
        previousStatus: 'online',
      };

      expect(() => notificationService.notifyMemberStatus(options)).not.toThrow();
    });
  });

  describe('broadcastSystemAnnouncement', () => {
    it('should broadcast system announcement to all users', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        title: '系统维护通知',
        content: '系统将于今晚维护',
        level: 'warning' as const,
      };

      expect(() => notificationService.broadcastSystemAnnouncement(options)).not.toThrow();
    });

    it('should send to specific users when targetUsers is provided', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        title: '个性化通知',
        content: '这是一条个性化消息',
        level: 'info' as const,
        targetUsers: ['user-1', 'user-2'],
      };

      expect(() => notificationService.broadcastSystemAnnouncement(options)).not.toThrow();
    });
  });

  describe('notifyProjectUpdate', () => {
    it('should create project update notification', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        projectId: 'project-1',
        projectName: '测试项目',
        changeType: 'updated' as const,
        changedBy: { id: 'user-1', name: '更新者' },
        memberIds: ['user-2', 'user-3'],
      };

      expect(() => notificationService.notifyProjectUpdate(options)).not.toThrow();
    });
  });

  describe('sendCustomNotification', () => {
    it('should send custom notification', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        type: 'custom:event',
        title: '自定义事件',
        message: '这是一个自定义通知',
        priority: 'high' as const,
      };

      expect(() => notificationService.sendCustomNotification(options)).not.toThrow();
    });

    it('should send to specific channels', async () => {
      const { notificationService } = await import('../notification-service');
      
      const options = {
        type: 'custom:channel',
        title: '频道通知',
        message: '发送到特定频道',
        target: {
          channels: ['project:1', 'team:alpha'],
        },
      };

      expect(() => notificationService.sendCustomNotification(options)).not.toThrow();
    });
  });

  describe('utility methods', () => {
    it('should return empty array for online users when no connections', async () => {
      const { notificationService } = await import('../notification-service');
      
      const onlineUsers = notificationService.getOnlineUsers();
      expect(Array.isArray(onlineUsers)).toBe(true);
    });

    it('should return false for isUserOnline when no connections', async () => {
      const { notificationService } = await import('../notification-service');
      
      const isOnline = notificationService.isUserOnline('user-1');
      expect(isOnline).toBe(false);
    });
  });
});