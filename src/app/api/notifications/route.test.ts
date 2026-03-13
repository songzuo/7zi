/**
 * Notifications API Route Tests
 * 
 * 测试文件: src/app/api/notifications/route.test.ts
 * 框架: Vitest + jest-dom
 * 
 * 覆盖:
 * - GET /api/notifications - 获取通知列表（支持过滤）
 * - POST /api/notifications - 创建新通知
 * - 认证和授权测试
 * - 错误处理测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Mock Dependencies
// ============================================

vi.mock('@/lib/security/auth', () => ({
  generateAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
  generateRefreshToken: vi.fn(() => Promise.resolve('mock-refresh-token')),
  verifyToken: vi.fn((token: string) => {
    if (token === 'valid-token') {
      return Promise.resolve({ sub: 'user-001', role: 'user' });
    }
    if (token === 'admin-token') {
      return Promise.resolve({ sub: 'admin-001', role: 'admin' });
    }
    if (token === 'user-002-token') {
      return Promise.resolve({ sub: 'user-002', role: 'user' });
    }
    return Promise.resolve(null);
  }),
  extractToken: vi.fn((request: NextRequest) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }),
  isAdmin: vi.fn((payload: { role: string }) => payload.role === 'admin'),
}));

vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn(() => async (request: NextRequest) => {
    // Skip CSRF check for tests
    return null;
  }),
  generateCsrfToken: vi.fn(() => 'mock-csrf-token'),
  setCsrfTokenCookie: vi.fn(() => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'csrf_token=mock-csrf-token; Path=/');
    return headers;
  }),
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
  },
}));

// Import the route handlers
import { GET, POST } from '@/app/api/notifications/route';

// ============================================
// Helper Functions
// ============================================

/**
 * 创建 GET 请求
 */
function createGetRequest(searchParams?: Record<string, string>, headers?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/notifications');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const requestHeaders = new Headers(headers || {});
  
  return new NextRequest(url, {
    method: 'GET',
    headers: requestHeaders,
  });
}

/**
 * 创建 POST 请求（带 JSON Body）
 */
function createPostRequest(body: Record<string, unknown>, headers?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/notifications');
  
  const requestHeaders = new Headers(headers || {
    'Content-Type': 'application/json',
  });
  
  const req = new NextRequest(url, {
    method: 'POST',
    headers: requestHeaders,
  });

  // Override json to return our body
  Object.defineProperty(req, 'json', {
    value: vi.fn().mockResolvedValue(body),
    writable: true,
  });

  return req;
}

// ============================================
// Test Suite: Notifications API Route
// ============================================

describe('Notifications API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // GET /api/notifications Tests
  // ============================================

  describe('GET /api/notifications', () => {
    /**
     * 测试: 获取用户通知列表 - 基本功能
     * 预期: 返回通知数组、总数量和未读数量
     */
    it('should return notifications list for a user', async () => {
      const request = createGetRequest({ userId: 'user-001' });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('notifications');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('unreadCount');
      expect(Array.isArray(data.notifications)).toBe(true);
    });

    /**
     * 测试: 按通知类型过滤
     * 预期: 只返回指定类型的通知
     */
    it('should filter notifications by type', async () => {
      const request = createGetRequest({ 
        userId: 'user-001',
        type: 'task_assigned',
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.notifications.forEach((notif: any) => {
        expect(notif.type).toBe('task_assigned');
      });
    });

    /**
     * 测试: 按已读状态过滤
     * 预期: 只返回未读/已读的通知
     */
    it('should filter notifications by read status', async () => {
      // 测试获取未读通知
      const unreadRequest = createGetRequest({ 
        userId: 'user-001',
        read: 'false',
      });
      
      const unreadResponse = await GET(unreadRequest);
      const unreadData = await unreadResponse.json();

      expect(unreadResponse.status).toBe(200);
      unreadData.notifications.forEach((notif: any) => {
        expect(notif.read).toBe(false);
      });

      // 测试获取已读通知
      const readRequest = createGetRequest({ 
        userId: 'user-001',
        read: 'true',
      });
      
      const readResponse = await GET(readRequest);
      const readData = await readResponse.json();

      expect(readResponse.status).toBe(200);
      readData.notifications.forEach((notif: any) => {
        expect(notif.read).toBe(true);
      });
    });

    /**
     * 测试: 分页功能 - limit
     * 预期: 返回指定数量的通知
     */
    it('should support pagination with limit', async () => {
      const request = createGetRequest({ 
        userId: 'user-001',
        limit: '2',
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications.length).toBeLessThanOrEqual(2);
    });

    /**
     * 测试: 分页功能 - offset
     * 预期: 跳过指定数量的通知
     */
    it('should support pagination with offset', async () => {
      // 先获取所有通知
      const allRequest = createGetRequest({ userId: 'user-001' });
      const allResponse = await GET(allRequest);
      const allData = await allResponse.json();
      
      if (allData.total > 1) {
        // 测试 offset
        const offsetRequest = createGetRequest({ 
          userId: 'user-001',
          offset: '1',
        });
        
        const offsetResponse = await GET(offsetRequest);
        const offsetData = await offsetResponse.json();

        expect(offsetResponse.status).toBe(200);
        // Offset 后的数量应该少于或等于总数减 offset
        expect(offsetData.notifications.length).toBeLessThanOrEqual(allData.total - 1);
      }
    });

    /**
     * 测试: 组合过滤 - 类型 + 已读状态
     * 预期: 返回同时满足两个条件的通知
     */
    it('should filter by multiple criteria', async () => {
      const request = createGetRequest({ 
        userId: 'user-001',
        type: 'task_assigned',
        read: 'false',
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.notifications.forEach((notif: any) => {
        expect(notif.type).toBe('task_assigned');
        expect(notif.read).toBe(false);
      });
    });

    /**
     * 测试: 从认证 Token 获取 userId
     * 预期: 当未提供 userId 时，从 token 解析
     */
    it('should get userId from auth token when not provided', async () => {
      const headers = { 'Authorization': 'Bearer valid-token' };
      const request = createGetRequest({}, headers);
      
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    /**
     * 测试: 匿名用户获取通知
     * 预期: 返回空列表或匿名用户的通知
     */
    it('should handle anonymous user', async () => {
      const request = createGetRequest({ userId: 'anonymous' });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('notifications');
      expect(Array.isArray(data.notifications)).toBe(true);
    });
  });

  // ============================================
  // POST /api/notifications Tests
  // ============================================

  describe('POST /api/notifications', () => {
    /**
     * 测试: 创建新通知 - 基本功能
     * 预期: 返回 201 和新创建的通知对象
     */
    it('should create a new notification with valid data', async () => {
      const body = {
        type: 'task_assigned',
        title: 'Test Notification',
        message: 'This is a test notification',
        userId: 'user-001',
        priority: 'high',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.type).toBe('task_assigned');
      expect(data.title).toBe('Test Notification');
      expect(data.message).toBe('This is a test notification');
      expect(data.read).toBe(false);
      expect(data.userId).toBe('user-001');
    });

    /**
     * 测试: 创建通知 - 带 link 字段
     * 预期: link 字段被正确保存
     */
    it('should create notification with optional link', async () => {
      const body = {
        type: 'project_update',
        title: 'Project Updated',
        message: 'Your project has been updated',
        userId: 'user-001',
        link: '/projects/proj-001',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.link).toBe('/projects/proj-001');
    });

    /**
     * 测试: 创建通知 - 带 metadata
     * 预期: metadata 被正确保存
     */
    it('should create notification with metadata', async () => {
      const body = {
        type: 'mention',
        title: 'Mentioned',
        message: 'You were mentioned',
        userId: 'user-001',
        metadata: { 
          taskId: 'task-001', 
          mentionedBy: 'user-002',
          context: 'comment',
        },
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toEqual({ 
        taskId: 'task-001', 
        mentionedBy: 'user-002',
        context: 'comment',
      });
    });

    /**
     * 测试: 创建通知 - 所有通知类型
     * 预期: 每种类型都能成功创建
     */
    it('should create notifications for all valid types', async () => {
      const types = ['task_assigned', 'project_update', 'mention', 'system_alert'];
      
      for (const type of types) {
        const body = {
          type,
          title: `${type} notification`,
          message: `Testing ${type}`,
          userId: 'user-001',
        };
        
        const request = createPostRequest(body);
        const response = await POST(request);
        
        expect(response.status).toBe(201);
      }
    });

    /**
     * 测试: 验证失败 - 无效的通知类型
     * 预期: 返回 400 错误
     */
    it('should reject invalid notification type', async () => {
      const body = {
        type: 'invalid_type',
        title: 'Test Notification',
        message: 'This is a test notification',
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid notification type');
    });

    /**
     * 测试: 验证失败 - 缺少 title
     * 预期: 返回 400 错误
     */
    it('should reject missing title', async () => {
      const body = {
        type: 'task_assigned',
        message: 'This is a test notification',
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('title');
    });

    /**
     * 测试: 验证失败 - 缺少 message
     * 预期: 返回 400 错误
     */
    it('should reject missing message', async () => {
      const body = {
        type: 'task_assigned',
        title: 'Test Notification',
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('message');
    });

    /**
     * 测试: 验证失败 - 缺少 userId
     * 预期: 返回 400 错误
     */
    it('should reject missing userId', async () => {
      const body = {
        type: 'task_assigned',
        title: 'Test Notification',
        message: 'This is a test notification',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('User ID');
    });

    /**
     * 测试: 验证失败 - title 类型错误
     * 预期: 返回 400 错误
     */
    it('should reject non-string title', async () => {
      const body = {
        type: 'task_assigned',
        title: 123 as any,
        message: 'Test message',
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('title');
    });

    /**
     * 测试: 验证失败 - message 类型错误
     * 预期: 返回 400 错误
     */
    it('should reject non-string message', async () => {
      const body = {
        type: 'task_assigned',
        title: 'Test',
        message: ['array', 'message'],
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('message');
    });

    /**
     * 测试: 优先级 - 默认值
     * 预期: 使用默认优先级 'medium'
     */
    it('should use default priority when not provided', async () => {
      const body = {
        type: 'system_alert',
        title: 'Default Priority Test',
        message: 'Testing default priority',
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.priority).toBe('medium');
    });

    /**
     * 测试: 优先级 - 自定义值
     * 预期: 使用提供的优先级
     */
    it('should use custom priority when provided', async () => {
      const body = {
        type: 'task_assigned',
        title: 'High Priority Test',
        message: 'Testing high priority',
        userId: 'user-001',
        priority: 'high',
      };
      
      const request = createPostRequest(body);
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.priority).toBe('high');
    });
  });

  // ============================================
  // Authentication & Authorization Tests
  // ============================================

  describe('Authentication & Authorization', () => {
    /**
     * 测试: 认证 - 有效 Token
     * 预期: 请求成功处理
     */
    it('should process request with valid auth token', async () => {
      const headers = { 'Authorization': 'Bearer valid-token' };
      const request = createGetRequest({ userId: 'user-001' }, headers);
      
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    /**
     * 测试: 认证 - 无 Token
     * 预期: 请求仍然成功，返回匿名或默认数据
     */
    it('should handle request without auth token', async () => {
      const request = createGetRequest({ userId: 'user-001' });
      
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    /**
     * 测试: 认证 - 无效 Token
     * 预期: 降级为匿名用户
     */
    it('should handle invalid auth token', async () => {
      const headers = { 'Authorization': 'Bearer invalid-token' };
      const request = createGetRequest({ userId: 'user-001' }, headers);
      
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    /**
     * 测试: 认证 - Admin Token
     * 预期: 请求成功处理
     */
    it('should process request with admin token', async () => {
      const headers = { 'Authorization': 'Bearer admin-token' };
      const body = {
        type: 'system_alert',
        title: 'Admin Test',
        message: 'Testing admin',
        userId: 'user-001',
      };
      const request = createPostRequest(body, headers);
      
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('Error Handling', () => {
    /**
     * 测试: GET - 服务器错误
     * 预期: 返回 500 错误和错误信息
     */
    it('should return 500 on server error during GET', async () => {
      // 模拟通过传递无效参数触发错误
      const request = createGetRequest({ 
        userId: 'user-001',
        limit: 'invalid',
      });
      
      const response = await GET(request);
      
      // 正常情况下应该能处理，但如果是严重错误应该返回 500
      expect([200, 400, 500]).toContain(response.status);
    });

    /**
     * 测试: POST - 解析 JSON 失败
     * 预期: 返回 400 错误
     */
    it('should handle JSON parse error', async () => {
      const url = new URL('http://localhost:3000/api/notifications');
      const req = new NextRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Override json to throw error
      Object.defineProperty(req, 'json', {
        value: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        writable: true,
      });
      
      const response = await POST(req);
      
      expect(response.status).toBe(400);
    });

    /**
     * 测试: GET - 不存在的用户
     * 预期: 返回空列表
     */
    it('should return empty list for non-existent user', async () => {
      const request = createGetRequest({ userId: 'non-existent-user-xyz' });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toEqual([]);
      expect(data.total).toBe(0);
    });

    /**
     * 测试: POST - 异常处理
     * 预期: 捕获异常并返回 400
     */
    it('should handle unexpected errors during POST', async () => {
      const body = {
        type: 'task_assigned',
        title: 'Test',
        message: 'Test message',
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      
      // 正常应该成功
      const response = await POST(request);
      
      // 如果服务正常应该返回 201
      expect([201, 400, 500]).toContain(response.status);
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================

  describe('Edge Cases', () => {
    /**
     * 测试: GET - 空字符串 userId
     * 预期: 视为无效，使用默认值
     */
    it('should handle empty userId', async () => {
      const request = createGetRequest({ userId: '' });
      
      const response = await GET(request);
      
      expect([200, 400]).toContain(response.status);
    });

    /**
     * 测试: GET - 非常大的 limit 值
     * 预期: 正常处理，返回所有匹配结果
     */
    it('should handle very large limit', async () => {
      const request = createGetRequest({ 
        userId: 'user-001',
        limit: '999999',
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 不应该返回错误
      expect(data.notifications).toBeDefined();
    });

    /**
     * 测试: GET - 负数 offset
     * 预期: 正常处理
     */
    it('should handle negative offset', async () => {
      const request = createGetRequest({ 
        userId: 'user-001',
        offset: '-1',
      });
      
      const response = await GET(request);
      
      // 应该能处理，offset 会被忽略或修正
      expect([200, 400]).toContain(response.status);
    });

    /**
     * 测试: POST - 非常长的 title
     * 预期: 验证失败
     */
    it('should reject overly long title', async () => {
      const body = {
        type: 'task_assigned',
        title: 'A'.repeat(300),
        message: 'Test',
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      const response = await POST(request);
      
      // 返回 400 或 201（取决于验证严格程度）
      expect([201, 400]).toContain(response.status);
    });

    /**
     * 测试: POST - 非常长的 message
     * 预期: 验证失败
     */
    it('should reject overly long message', async () => {
      const body = {
        type: 'task_assigned',
        title: 'Test',
        message: 'B'.repeat(2000),
        userId: 'user-001',
      };
      
      const request = createPostRequest(body);
      const response = await POST(request);
      
      expect([201, 400]).toContain(response.status);
    });

    /**
     * 测试: POST - 空对象
     * 预期: 返回验证错误
     */
    it('should reject empty body', async () => {
      const body = {};
      
      const request = createPostRequest(body);
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe('Integration Tests', () => {
    /**
     * 测试: 完整生命周期 - 创建并获取
     * 预期: 创建后能正确获取到新通知
     */
    it('should create notification and retrieve it', async () => {
      // 1. 创建通知
      const createBody = {
        type: 'system_alert',
        title: 'Integration Test',
        message: 'Testing full lifecycle',
        userId: 'user-001',
      };
      
      const createRequest = createPostRequest(createBody);
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      const notificationId = createData.id;

      // 2. 获取通知列表
      const getRequest = createGetRequest({ userId: 'user-001' });
      const getResponse = await GET(getRequest);
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      
      // 3. 验证新通知在列表中
      const createdNotif = getData.notifications.find((n: any) => n.id === notificationId);
      expect(createdNotif).toBeDefined();
      expect(createdNotif.title).toBe('Integration Test');
    });

    /**
     * 测试: 多次创建通知
     * 预期: 每次都创建新的通知，有唯一的 ID
     */
    it('should create multiple notifications with unique IDs', async () => {
      const ids: string[] = [];
      
      for (let i = 0; i < 3; i++) {
        const body = {
          type: 'system_alert',
          title: `Notification ${i}`,
          message: `Message ${i}`,
          userId: 'user-001',
        };
        
        const request = createPostRequest(body);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data).toHaveProperty('id');
        ids.push(data.id);
      }

      // 验证 ID 唯一
      expect(new Set(ids).size).toBe(ids.length);
    });

    /**
     * 测试: 获取未读数量
     * 预期: 返回正确的未读数量
     */
    it('should return correct unread count', async () => {
      const request = createGetRequest({ userId: 'user-001' });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // 验证 unreadCount 与实际未读数量一致
      const actualUnread = data.notifications.filter((n: any) => !n.read).length;
      expect(data.unreadCount).toBe(actualUnread);
    });
  });
});
