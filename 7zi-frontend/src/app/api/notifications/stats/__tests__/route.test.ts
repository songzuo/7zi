/**
 * Notification Statistics API Route Tests
 *
 * 测试通知统计 API 端点：
 * - GET /api/notifications/stats
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/services/notification-enhanced', () => ({
  enhancedNotificationService: {
    getStats: vi.fn(() => ({
      total: 100,
      unread: 20,
      byType: {},
      byPriority: {},
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

describe('Notification Stats API - GET /api/notifications/stats', () => {
  it('应该为管理员返回统计信息', async () => {
    const { authenticateJWT } = require('@/lib/auth/api-auth');
    authenticateJWT.mockResolvedValueOnce({
      authenticated: true,
      userId: 'admin-1',
      role: 'admin',
    });

    const { enhancedNotificationService } = require('@/lib/services/notification-enhanced');
    enhancedNotificationService.getStats.mockReturnValue({
      total: 100,
      unread: 20,
      byType: { info: 50, warning: 30, error: 20 },
      byPriority: { low: 40, medium: 35, high: 25 },
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total).toBe(100);
    expect(data.data.unread).toBe(20);
  });

  it('应该拒绝未认证的请求', async () => {
    const { authenticateJWT } = require('@/lib/auth/api-auth');
    authenticateJWT.mockResolvedValueOnce({ authenticated: false });

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('应该拒绝普通用户访问统计信息', async () => {
    const { authenticateJWT } = require('@/lib/auth/api-auth');
    authenticateJWT.mockResolvedValueOnce({
      authenticated: true,
      userId: 'user-1',
      role: 'user',
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Forbidden');
  });

  it('应该按类型分组统计', async () => {
    const { authenticateJWT } = require('@/lib/auth/api-auth');
    const { enhancedNotificationService } = require('@/lib/services/notification-enhanced');

    authenticateJWT.mockResolvedValueOnce({
      authenticated: true,
      userId: 'admin-1',
      role: 'admin',
    });

    enhancedNotificationService.getStats.mockReturnValue({
      total: 100,
      unread: 20,
      byType: {
        info: 50,
        warning: 30,
        error: 15,
        success: 5,
      },
      byPriority: {},
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.byType).toBeDefined();
    expect(data.data.byType.info).toBe(50);
  });

  it('应该按优先级分组统计', async () => {
    const { authenticateJWT } = require('@/lib/auth/api-auth');
    const { enhancedNotificationService } = require('@/lib/services/notification-enhanced');

    authenticateJWT.mockResolvedValueOnce({
      authenticated: true,
      userId: 'admin-1',
      role: 'admin',
    });

    enhancedNotificationService.getStats.mockReturnValue({
      total: 100,
      unread: 20,
      byType: {},
      byPriority: {
        low: 40,
        medium: 35,
        high: 20,
        urgent: 5,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.byPriority).toBeDefined();
    expect(data.data.byPriority.low).toBe(40);
    expect(data.data.byPriority.urgent).toBe(5);
  });
});
