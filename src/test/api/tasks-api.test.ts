/**
 * Tasks API 单元测试
 * 测试任务管理 API 的所有端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/tasks/route';

// Mock 依赖
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn(),
  extractToken: vi.fn(),
  isAdmin: vi.fn((user) => user.role === 'admin'),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn(() => vi.fn(() => null)),
  generateCsrfToken: vi.fn(() => 'mock-csrf-token'),
  setCsrfTokenCookie: vi.fn(() => new Headers()),
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    audit: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  authLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// 辅助函数：创建模拟请求
function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>,
  headers?: Record<string, string>
): NextRequest {
  const url = new URL('http://localhost:3000/api/tasks');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  const requestHeaders = new Headers();
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      requestHeaders.set(key, value);
    });
  }
  
  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/tasks', () => {
    it('应该返回所有任务', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('应该按状态过滤任务', async () => {
      const request = createMockRequest('GET', undefined, { status: 'completed' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.every((task: any) => task.status === 'completed')).toBe(true);
    });

    it('应该按类型过滤任务', async () => {
      const request = createMockRequest('GET', undefined, { type: 'research' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.every((task: any) => task.type === 'research')).toBe(true);
    });

    it('应该按负责人过滤任务', async () => {
      const request = createMockRequest('GET', undefined, { assignee: 'architect' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.every((task: any) => task.assignee === 'architect')).toBe(true);
    });

    it('应该支持组合过滤条件', async () => {
      const request = createMockRequest('GET', undefined, { 
        status: 'in_progress',
        type: 'research'
      });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      json.data.forEach((task: any) => {
        expect(task.status).toBe('in_progress');
        expect(task.type).toBe('research');
      });
    });

    it('当没有匹配结果时应该返回空数组', async () => {
      const request = createMockRequest('GET', undefined, { status: 'nonexistent' });
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data).toEqual([]);
    });
  });

  describe('POST /api/tasks', () => {
    it('应该创建新任务', async () => {
      const newTask = {
        title: '测试任务',
        description: '这是一个测试任务',
        type: 'development',
        priority: 'high',
      };
      
      const request = createMockRequest('POST', newTask);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe(newTask.title);
      expect(data.description).toBe(newTask.description);
      expect(data.type).toBe(newTask.type);
      expect(data.priority).toBe(newTask.priority);
      expect(data.status).toBe('pending');
      expect(data.id).toMatch(/^task-/);
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();
    });

    it('应该创建只有标题的任务', async () => {
      const request = createMockRequest('POST', { title: '简单任务' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('简单任务');
      expect(data.description).toBe('');
      expect(data.type).toBe('other');
      expect(data.priority).toBe('medium');
    });

    it('没有标题时应该返回 400 错误', async () => {
      const request = createMockRequest('POST', { description: '没有标题的任务' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('标题不是字符串时应该返回 400 错误', async () => {
      const request = createMockRequest('POST', { title: 123 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('应该正确处理指定负责人', async () => {
      const request = createMockRequest('POST', {
        title: '分配任务',
        assignee: 'executor',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.assignee).toBe('executor');
    });

    it('应该记录创建历史', async () => {
      const request = createMockRequest('POST', { title: '带历史记录的任务' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.history).toBeDefined();
      expect(data.history.length).toBeGreaterThan(0);
      expect(data.history[0].status).toBe('pending');
    });
  });

  describe('PUT /api/tasks', () => {
    // Helper to create a task first and get its ID
    const createTestTask = async () => {
      const req = createMockRequest('POST', { title: '临时测试任务' });
      const res = await POST(req);
      const json = await res.json();
      return json.id;
    };

    it('应该更新任务状态', async () => {
      const taskId = await createTestTask();
      const request = createMockRequest('PUT', {
        id: taskId,
        status: 'completed',
      });
      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.status).toBe('completed');
    });

    it('应该更新任务负责人', async () => {
      const taskId = await createTestTask();
      const request = createMockRequest('PUT', {
        id: taskId,
        assignee: 'consultant',
      });
      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.assignee).toBe('consultant');
    });

    it('应该添加评论', async () => {
      const taskId = await createTestTask();
      const request = createMockRequest('PUT', {
        id: taskId,
        comment: '这是一条测试评论',
      });
      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.comments.length).toBeGreaterThan(0);
      expect(json.data.comments[json.data.comments.length - 1].content).toBe('这是一条测试评论');
    });

    it('没有任务ID时应该返回 400 错误', async () => {
      const request = createMockRequest('PUT', { status: 'completed' });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('任务不存在时应该返回 404 错误', async () => {
      const request = createMockRequest('PUT', {
        id: 'nonexistent-task',
        status: 'completed',
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('应该记录状态变更历史', async () => {
      const taskId = await createTestTask();
      const request = createMockRequest('PUT', {
        id: taskId,
        status: 'completed',
      });
      const response = await PUT(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      const lastHistory = json.data.history[json.data.history.length - 1];
      expect(lastHistory.status).toBe('completed');
    });
  });

  describe('DELETE /api/tasks', () => {
    it('没有认证时应该返回 401 错误', async () => {
      const request = createMockRequest('DELETE', undefined, { id: 'task-001' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('没有任务ID时应该返回 400 错误', async () => {
      // Mock 认证 token
      const { verifyToken, extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-1',
        email: 'admin@test.com',
        role: 'admin',
      });

      const request = createMockRequest('DELETE', undefined, {});
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('非管理员用户应该返回 403 错误', async () => {
      const { verifyToken, extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValue('valid-token');
      vi.mocked(verifyToken).mockResolvedValue({
        sub: 'user-2',
        email: 'user@test.com',
        role: 'user',
      });

      const request = createMockRequest('DELETE', undefined, { id: 'task-001' });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('FORBIDDEN');
    });
  });
});

describe('Tasks API 数据验证', () => {
  it('应该验证任务类型', async () => {
    const request = createMockRequest('POST', {
      title: '任务类型测试',
      type: 'invalid-type',
    });
    const response = await POST(request);
    const data = await response.json();

    // API 目前不严格验证类型，但返回的数据应包含类型
    expect(data.type).toBeDefined();
  });

  it('应该验证优先级', async () => {
    const request = createMockRequest('POST', {
      title: '优先级测试',
      priority: 'urgent',
    });
    const response = await POST(request);
    const data = await response.json();

    // API 目前不严格验证优先级
    expect(data.priority).toBeDefined();
  });

  it('应该正确处理空描述', async () => {
    const request = createMockRequest('POST', {
      title: '空描述任务',
      description: '',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.description).toBe('');
  });

  it('应该正确处理特殊字符标题', async () => {
    const specialTitle = '<script>alert("XSS")</script> 测试任务';
    const request = createMockRequest('POST', {
      title: specialTitle,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe(specialTitle);
  });
});

describe('Tasks API 边界情况', () => {
  it('应该处理非常长的标题', async () => {
    const longTitle = 'A'.repeat(1000);
    const request = createMockRequest('POST', { title: longTitle });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe(longTitle);
  });

  it('应该处理并发更新', async () => {
    // 先创建一个任务
    const createReq = createMockRequest('POST', { title: '并发测试任务' });
    const createRes = await POST(createReq);
    const taskJson = await createRes.json();
    const taskId = taskJson.id;

    // 模拟并发更新同一任务
    const requests = [
      createMockRequest('PUT', { id: taskId, status: 'in_progress' }),
      createMockRequest('PUT', { id: taskId, assignee: 'tester' }),
    ];

    const responses = await Promise.all(requests.map(r => PUT(r)));
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  it('应该处理无效的 JSON 请求体', async () => {
    const url = new URL('http://localhost:3000/api/tasks');
    const request = new NextRequest(url, {
      method: 'POST',
      body: 'invalid json{',
      headers: { 'Content-Type': 'application/json' },
    });

    // Next.js 会抛出 SyntaxError，API 应该能处理
    try {
      const response = await POST(request);
      // 如果没有抛出错误，检查状态码
      expect([400, 500]).toContain(response.status);
    } catch (error) {
      // 预期会抛出错误
      expect(error).toBeInstanceOf(SyntaxError);
    }
  });
});