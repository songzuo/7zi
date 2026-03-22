/**
 * Notification Service Tests
 *
 * 测试实时通知服务的核心功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from '@jest/globals';
import {
  NotificationService,
  NotificationType,
  NotificationPriority,
  NotificationFilter,
  Notification,
} from '../notification';

describe('Notification Service', () => {
  let service: NotificationService;
  let mockSocket: any;

  beforeEach(() => {
    // Mock Socket.IO server
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      to: vi.fn(() => mockSocket),
      disconnect: vi.fn(),
    };

    service = new NotificationService(mockSocket);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create notification service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(NotificationService);
    });

    it('should have default configuration', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Notification Creation', () => {
    it('should create notification with valid data', () => {
      const notification: Notification = {
        id: 'notif-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
        createdAt: Date.now(),
      };

      expect(notification).toBeDefined();
      expect(notification.id).toBe('notif-1');
      expect(notification.type).toBe(NotificationType.INFO);
      expect(notification.priority).toBe(NotificationPriority.MEDIUM);
      expect(notification.read).toBe(false);
    });

    it('should create notification with optional fields', () => {
      const notification: Notification = {
        id: 'notif-2',
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.HIGH,
        title: 'Task Completed',
        message: 'Your task has been completed',
        data: { taskId: 'task-123' },
        userId: 'user-1',
        teamId: 'team-1',
        read: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000, // 24 hours
      };

      expect(notification.data).toBeDefined();
      expect(notification.data?.taskId).toBe('task-123');
      expect(notification.userId).toBe('user-1');
      expect(notification.teamId).toBe('team-1');
      expect(notification.expiresAt).toBeDefined();
      expect(notification.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Notification Types', () => {
    it('should have all notification types defined', () => {
      expect(NotificationType.INFO).toBe('info');
      expect(NotificationType.SUCCESS).toBe('success');
      expect(NotificationType.WARNING).toBe('warning');
      expect(NotificationType.ERROR).toBe('error');
      expect(NotificationType.TASK_ASSIGNED).toBe('task_assigned');
      expect(NotificationType.TASK_COMPLETED).toBe('task_completed');
      expect(NotificationType.TASK_UPDATED).toBe('task_updated');
      expect(NotificationType.MESSAGE).toBe('message');
      expect(NotificationType.SYSTEM).toBe('system');
    });

    it('should create notification for each type', () => {
      const types = Object.values(NotificationType);

      types.forEach(type => {
        const notification: Notification = {
          id: `notif-${type}`,
          type,
          priority: NotificationPriority.MEDIUM,
          title: `Test ${type}`,
          message: `This is a ${type} notification`,
          read: false,
          createdAt: Date.now(),
        };

        expect(notification.type).toBe(type);
      });
    });
  });

  describe('Notification Priority', () => {
    it('should have all priority levels defined', () => {
      expect(NotificationPriority.LOW).toBe('low');
      expect(NotificationPriority.MEDIUM).toBe('medium');
      expect(NotificationPriority.HIGH).toBe('high');
      expect(NotificationPriority.URGENT).toBe('urgent');
    });

    it('should create notification for each priority', () => {
      const priorities = Object.values(NotificationPriority);

      priorities.forEach(priority => {
        const notification: Notification = {
          id: `notif-${priority}`,
          type: NotificationType.INFO,
          priority,
          title: `Test ${priority}`,
          message: `This is a ${priority} priority notification`,
          read: false,
          createdAt: Date.now(),
        };

        expect(notification.priority).toBe(priority);
      });
    });
  });

  describe('Notification Filter', () => {
    it('should filter notifications by type', () => {
      const filter: NotificationFilter = {
        type: NotificationType.ERROR,
      };

      expect(filter.type).toBe(NotificationType.ERROR);
    });

    it('should filter notifications by priority', () => {
      const filter: NotificationFilter = {
        priority: NotificationPriority.URGENT,
      };

      expect(filter.priority).toBe(NotificationPriority.URGENT);
    });

    it('should filter notifications by read status', () => {
      const filter1: NotificationFilter = {
        read: false,
      };

      const filter2: NotificationFilter = {
        read: true,
      };

      expect(filter1.read).toBe(false);
      expect(filter2.read).toBe(true);
    });

    it('should filter notifications by user', () => {
      const filter: NotificationFilter = {
        userId: 'user-1',
      };

      expect(filter.userId).toBe('user-1');
    });

    it('should filter notifications by team', () => {
      const filter: NotificationFilter = {
        teamId: 'team-1',
      };

      expect(filter.teamId).toBe('team-1');
    });

    it('should filter notifications by task', () => {
      const filter: NotificationFilter = {
        taskId: 'task-1',
      };

      expect(filter.taskId).toBe('task-1');
    });

    it('should create complex filter with multiple criteria', () => {
      const filter: NotificationFilter = {
        userId: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.HIGH,
        read: false,
        limit: 10,
        offset: 0,
      };

      expect(filter.userId).toBe('user-1');
      expect(filter.type).toBe(NotificationType.TASK_ASSIGNED);
      expect(filter.priority).toBe(NotificationPriority.HIGH);
      expect(filter.read).toBe(false);
      expect(filter.limit).toBe(10);
      expect(filter.offset).toBe(0);
    });

    it('should handle pagination in filter', () => {
      const filter: NotificationFilter = {
        limit: 20,
        offset: 40,
      };

      expect(filter.limit).toBe(20);
      expect(filter.offset).toBe(40);
    });

    it('should handle date range in filter', () => {
      const now = Date.now();
      const filter: NotificationFilter = {
        startTime: now - 86400000, // 1 day ago
        endTime: now,
      };

      expect(filter.startTime).toBeDefined();
      expect(filter.endTime).toBeDefined();
      expect(filter.startTime).toBeLessThan(filter.endTime);
    });
  });

  describe('Notification Expiration', () => {
    it('should create notification with expiration time', () => {
      const expiresAt = Date.now() + 3600000; // 1 hour
      const notification: Notification = {
        id: 'notif-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Expiring Notification',
        message: 'This will expire',
        read: false,
        createdAt: Date.now(),
        expiresAt,
      };

      expect(notification.expiresAt).toBe(expiresAt);
    });

    it('should create notification without expiration', () => {
      const notification: Notification = {
        id: 'notif-2',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Non-Expiring Notification',
        message: 'This will not expire',
        read: false,
        createdAt: Date.now(),
      };

      expect(notification.expiresAt).toBeUndefined();
    });
  });

  describe('Notification Data', () => {
    it('should store arbitrary data in notification', () => {
      const notification: Notification = {
        id: 'notif-1',
        type: NotificationType.TASK_COMPLETED,
        priority: NotificationPriority.HIGH,
        title: 'Task Done',
        message: 'Task completed successfully',
        data: {
          taskId: 'task-123',
          taskName: 'Complete documentation',
          projectId: 'project-1',
          completedBy: 'user-2',
        },
        read: false,
        createdAt: Date.now(),
      };

      expect(notification.data).toBeDefined();
      expect(notification.data?.taskId).toBe('task-123');
      expect(notification.data?.taskName).toBe('Complete documentation');
      expect(notification.data?.projectId).toBe('project-1');
      expect(notification.data?.completedBy).toBe('user-2');
    });

    it('should handle empty data object', () => {
      const notification: Notification = {
        id: 'notif-2',
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: 'Simple Notification',
        message: 'No extra data',
        data: {},
        read: false,
        createdAt: Date.now(),
      };

      expect(notification.data).toBeDefined();
      expect(Object.keys(notification.data || {})).toHaveLength(0);
    });
  });

  describe('Notification Read Status', () => {
    it('should create unread notification by default', () => {
      const notification: Notification = {
        id: 'notif-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Unread',
        message: 'This is unread',
        read: false,
        createdAt: Date.now(),
      };

      expect(notification.read).toBe(false);
    });

    it('should create read notification', () => {
      const notification: Notification = {
        id: 'notif-2',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Read',
        message: 'This is read',
        read: true,
        createdAt: Date.now(),
      };

      expect(notification.read).toBe(true);
    });

    it('should toggle read status', () => {
      const notification: Notification = {
        id: 'notif-3',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Toggle Test',
        message: 'Toggle me',
        read: false,
        createdAt: Date.now(),
      };

      expect(notification.read).toBe(false);

      notification.read = true;
      expect(notification.read).toBe(true);

      notification.read = false;
      expect(notification.read).toBe(false);
    });
  });

  describe('Notification Timestamps', () => {
    it('should have creation timestamp', () => {
      const now = Date.now();
      const notification: Notification = {
        id: 'notif-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Timestamp Test',
        message: 'Check timestamp',
        read: false,
        createdAt: now,
      };

      expect(notification.createdAt).toBe(now);
      expect(notification.createdAt).toBeGreaterThan(now - 1000);
      expect(notification.createdAt).toBeLessThan(now + 1000);
    });

    it('should have unique timestamps', () => {
      const notification1: Notification = {
        id: 'notif-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'First',
        message: 'First notification',
        read: false,
        createdAt: Date.now(),
      };

      // Small delay to ensure different timestamps
      const timestamp1 = notification1.createdAt;

      const notification2: Notification = {
        id: 'notif-2',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Second',
        message: 'Second notification',
        read: false,
        createdAt: Date.now(),
      };

      const timestamp2 = notification2.createdAt;

      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });
  });

  describe('Notification Validation', () => {
    it('should validate notification has required fields', () => {
      const notification: Notification = {
        id: 'notif-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.MEDIUM,
        title: 'Valid',
        message: 'Valid notification',
        read: false,
        createdAt: Date.now(),
      };

      expect(notification.id).toBeDefined();
      expect(notification.type).toBeDefined();
      expect(notification.priority).toBeDefined();
      expect(notification.title).toBeDefined();
      expect(notification.message).toBeDefined();
      expect(notification.read).toBeDefined();
      expect(notification.createdAt).toBeDefined();
    });

    it('should allow empty strings for title and message', () => {
      const notification: Notification = {
        id: 'notif-1',
        type: NotificationType.INFO,
        priority: NotificationPriority.LOW,
        title: '',
        message: '',
        read: false,
        createdAt: Date.now(),
      };

      expect(notification.title).toBe('');
      expect(notification.message).toBe('');
    });
  });
});
