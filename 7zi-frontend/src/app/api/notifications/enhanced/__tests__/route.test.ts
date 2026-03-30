/**
 * Enhanced Notifications API Route Tests
 *
 * 测试增强通知 API 端点：
 * - GET /api/notifications/enhanced
 * - POST /api/notifications/enhanced
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies - must use same paths as in the actual route file
vi.mock('@/lib/services/notification-enhanced', () => ({
  enhancedNotificationService: {
    getNotifications: vi.fn(() => []),
    getUnreadCount: vi.fn(() => 0),
    notify: vi.fn(async () => ({
      success: true,
      notificationId: 'notif-1',
      emailSent: true,
    })),
  },
}));

vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(async (req) => ({
    authenticated: true,
    userId: 'user-1',
    role: 'user',
  })),
}));

// Import mocked modules after vi.mock calls
import { enhancedNotificationService } from '@/lib/services/notification-enhanced';
import { authenticateJWT } from '@/lib/auth/api-auth';

describe('Enhanced Notifications API - GET /api/notifications/enhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'user',
    });
  });

  it('应该返回用户通知列表', async () => {
    vi.mocked(enhancedNotificationService.getNotifications).mockReturnValue([
      { id: 'notif-1', userId: 'user-1', title: 'Test', read: false },
      { id: 'notif-2', userId: 'user-1', title: 'Test 2', read: true },
    ] as any);
    vi.mocked(enhancedNotificationService.getUnreadCount).mockReturnValue(1);

    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.notifications).toBeInstanceOf(Array);
    expect(data.data.meta.unreadCount).toBe(1);
  });

  it('应该支持用户ID过滤（仅管理员）', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({
      authenticated: true,
      userId: 'admin-1',
      role: 'admin',
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced?userId=user-2', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('应该支持类型过滤', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced?type=info', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('应该支持优先级过滤', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced?priority=high', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('应该支持已读/未读过滤', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced?read=false', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('应该支持时间过滤', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced?since=1234567890', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('应该限制返回数量', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced?limit=10', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('应该拒绝未认证的请求', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({ authenticated: false });

    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });
});

describe('Enhanced Notifications API - POST /api/notifications/enhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'user',
    });
    vi.mocked(enhancedNotificationService.notify).mockResolvedValue({
      success: true,
      notificationId: 'notif-1',
      emailSent: true,
    });
  });

  it('应该成功创建并发送通知', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info',
        priority: 'medium',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('notif-1');
    expect(data.data.emailSent).toBe(true);
  });

  it('应该验证必填字段', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        // 缺少 title 和 message
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('应该支持跳过邮件发送', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        message: 'Test message',
        skipEmail: true,
      }),
    });

    await POST(request);

    expect(enhancedNotificationService.notify).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        skipEmail: true,
      })
    );
  });

  it('应该支持指定用户', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        message: 'Test message',
        userId: 'user-2',
      }),
    });

    await POST(request);

    expect(enhancedNotificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
      }),
      expect.any(Object)
    );
  });

  it('应该支持指定团队', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        message: 'Test message',
        teamId: 'team-1',
      }),
    });

    await POST(request);

    expect(enhancedNotificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team-1',
      }),
      expect.any(Object)
    );
  });

  it('应该支持指定任务', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        message: 'Test message',
        taskId: 'task-1',
      }),
    });

    await POST(request);

    expect(enhancedNotificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-1',
      }),
      expect.any(Object)
    );
  });

  it('应该支持自定义邮件接收者', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        message: 'Test message',
        emailRecipients: [
          { email: 'user@example.com', name: 'Test User' },
        ],
      }),
    });

    await POST(request);

    expect(enhancedNotificationService.notify).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        emailRecipients: [
          { email: 'user@example.com', name: 'Test User' },
        ],
      })
    );
  });

  it('应该拒绝未认证的请求', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({ authenticated: false });

    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('应该处理发送失败', async () => {
    vi.mocked(enhancedNotificationService.notify).mockResolvedValue({
      success: false,
      error: 'Failed to send email',
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/enhanced', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
