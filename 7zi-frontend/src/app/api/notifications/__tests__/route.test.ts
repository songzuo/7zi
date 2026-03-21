/**
 * Notifications API Route Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { notificationService } from '@/lib/services/notification';
import { createSuccessResponse, createValidationError, createErrorResponse } from '../../../../lib/api/error-handler';

// Mock notification service
vi.mock('@/lib/services/notification', () => ({
  notificationService: {
    notify: vi.fn(),
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
  },
  NotificationType: {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
  },
  NotificationPriority: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
  },
}));

// Mock error handler
vi.mock('../../../../lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn(),
  createValidationError: vi.fn(),
  createErrorResponse: vi.fn(),
}));

describe('Notifications API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSuccessResponse).mockImplementation((data, status = 200) => {
      return {
        status,
        json: async () => ({ success: true, data }),
      } as any;
    });
    vi.mocked(createValidationError).mockImplementation((message) => {
      return {
        status: 400,
        json: async () => ({ success: false, error: { message } }),
      } as any;
    });
    vi.mocked(createErrorResponse).mockImplementation((error) => {
      return {
        status: 500,
        json: async () => ({ success: false, error }),
      } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should get notifications with no filters', async () => {
      const mockNotifications = [
        { id: '1', title: 'Test 1', type: 'info', priority: 'medium' },
        { id: '2', title: 'Test 2', type: 'success', priority: 'high' },
      ];
      vi.mocked(notificationService.getNotifications).mockReturnValue(mockNotifications);
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(5);

      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(notificationService.getNotifications).toHaveBeenCalledWith({});
      expect(notificationService.getUnreadCount).toHaveBeenCalledWith({});
      expect(createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          notifications: mockNotifications,
          meta: expect.objectContaining({
            count: 2,
            unreadCount: 5,
          }),
        })
      );
    });

    it('should get notifications with type filter', async () => {
      const mockNotifications = [{ id: '1', title: 'Test', type: 'error' }];
      vi.mocked(notificationService.getNotifications).mockReturnValue(mockNotifications);
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0);

      const url = new URL('http://localhost/api/notifications?type=error');
      const request = new NextRequest(url);
      await GET(request);

      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        type: 'error',
      });
    });

    it('should get notifications with priority filter', async () => {
      const url = new URL('http://localhost/api/notifications?priority=high');
      const request = new NextRequest(url);
      await GET(request);

      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        priority: 'high',
      });
    });

    it('should get notifications with userId filter', async () => {
      const url = new URL('http://localhost/api/notifications?userId=user-123');
      const request = new NextRequest(url);
      await GET(request);

      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
      });
    });

    it('should get notifications with teamId filter', async () => {
      const url = new URL('http://localhost/api/notifications?teamId=team-123');
      const request = new NextRequest(url);
      await GET(request);

      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        teamId: 'team-123',
      });
    });

    it('should get notifications with taskId filter', async () => {
      const url = new URL('http://localhost/api/notifications?taskId=task-123');
      const request = new NextRequest(url);
      await GET(request);

      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        taskId: 'task-123',
      });
    });

    it('should get notifications with read filter', async () => {
      const url = new URL('http://localhost/api/notifications?read=true');
      const request = new NextRequest(url);
      await GET(request);

      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        read: true,
      });
    });

    it('should get notifications with since filter', async () => {
      const url = new URL('http://localhost/api/notifications?since=1234567890');
      const request = new NextRequest(url);
      await GET(request);

      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        since: 1234567890,
      });
    });

    it('should respect limit parameter', async () => {
      const mockNotifications = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        title: `Test ${i}`,
      }));
      vi.mocked(notificationService.getNotifications).mockReturnValue(mockNotifications);
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0);

      const url = new URL('http://localhost/api/notifications?limit=10');
      const request = new NextRequest(url);
      await GET(request);

      expect(createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            count: 10,
          }),
        })
      );
    });

    it('should use default limit of 50', async () => {
      const mockNotifications = Array.from({ length: 60 }, (_, i) => ({
        id: String(i),
        title: `Test ${i}`,
      }));
      vi.mocked(notificationService.getNotifications).mockReturnValue(mockNotifications);
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0);

      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url);
      await GET(request);

      expect(createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            count: 50,
          }),
        })
      );
    });

    it('should handle errors', async () => {
      vi.mocked(notificationService.getNotifications).mockImplementation(() => {
        throw new Error('Database error');
      });

      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url);
      const response = await GET(request);

      expect(createErrorResponse).toHaveBeenCalled();
    });

    it('should handle combined filters', async () => {
      const url = new URL(
        'http://localhost/api/notifications?type=info&priority=high&userId=user-123&read=false'
      );
      const request = new NextRequest(url);
      await GET(request);

      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        type: 'info',
        priority: 'high',
        userId: 'user-123',
        read: false,
      });
    });
  });

  describe('POST /api/notifications', () => {
    it('should create notification with required fields', async () => {
      vi.mocked(notificationService.notify).mockResolvedValue('notif-123');

      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'Test message',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(notificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          priority: 'medium',
          title: 'Test Notification',
          message: 'Test message',
        })
      );
      expect(createSuccessResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'notif-123',
          message: 'Notification created',
        }),
        201
      );
    });

    it('should create notification with all fields', async () => {
      vi.mocked(notificationService.notify).mockResolvedValue('notif-456');

      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          message: 'Message',
          type: 'warning',
          priority: 'high',
          userId: 'user-123',
          teamId: 'team-123',
          taskId: 'task-123',
          data: { custom: 'value' },
          expiresAt: Date.now() + 3600000,
        }),
      });

      await POST(request);

      expect(notificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          priority: 'high',
          title: 'Test',
          message: 'Message',
          userId: 'user-123',
          teamId: 'team-123',
          taskId: 'task-123',
          data: { custom: 'value' },
          expiresAt: expect.any(Number),
        })
      );
    });

    it('should return validation error when title is missing', async () => {
      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
        }),
      });

      await POST(request);

      expect(createValidationError).toHaveBeenCalledWith(
        'title and message are required'
      );
    });

    it('should return validation error when message is missing', async () => {
      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
        }),
      });

      await POST(request);

      expect(createValidationError).toHaveBeenCalledWith(
        'title and message are required'
      );
    });

    it('should return validation error when both title and message are missing', async () => {
      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(request);

      expect(createValidationError).toHaveBeenCalledWith(
        'title and message are required'
      );
    });

    it('should handle errors during notification creation', async () => {
      vi.mocked(notificationService.notify).mockRejectedValue(
        new Error('Failed to create notification')
      );

      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          message: 'Message',
        }),
      });

      const response = await POST(request);

      expect(createErrorResponse).toHaveBeenCalled();
    });

    it('should handle invalid JSON', async () => {
      const url = new URL('http://localhost/api/notifications');
      const request = new NextRequest(url, {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(createErrorResponse).toHaveBeenCalled();
    });
  });
});
