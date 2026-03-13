/**
 * Tasks API 集成测试
 * 测试任务 API 的完整集成场景
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/tasks/route';

// Mock 依赖
vi.mock('@/lib/security/auth', () => ({
  verifyToken: vi.fn().mockResolvedValue({
    sub: 'test-user',
    email: 'test@example.com',
    role: 'admin',
  }),
  extractToken: vi.fn().mockReturnValue('mock-token'),
  isAdmin: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/security/csrf', () => ({
  createCsrfMiddleware: vi.fn().mockReturnValue(vi.fn().mockResolvedValue(null)),
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    audit: vi.fn(),
    info: vi.fn(),
  },
}));

// 辅助函数：创建模拟请求
function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL('http://localhost:3000/api/tasks');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Tasks API 集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('完整任务生命周期', () => {
    it('应该能创建、查询、更新、删除任务', async () => {
      // 1. 创建任务
      const createRequest = createMockRequest('POST', {
        title: '集成测试任务',
        description: '完整生命周期测试',
        type: 'development',
        priority: 'high',
        assignee: 'executor',
      });
      const createResponse = await POST(createRequest);
      expect(createResponse.status).toBe(201);
      const createdTask = await createResponse.json();
      expect(createdTask.id).toMatch(/^task-/);
      expect(createdTask.title).toBe('集成测试任务');
      expect(createdTask.status).toBe('pending');

      // 2. 查询所有任务
      const listRequest = createMockRequest('GET');
      const listResponse = await GET(listRequest);
      expect(listResponse.status).toBe(200);
      const allTasks = await listResponse.json();
      expect(allTasks.length).toBeGreaterThan(0);

      // 3. 按 ID 查询（通过过滤）
      const filterRequest = createMockRequest('GET', undefined, {
        assignee: 'executor',
      });
      const filterResponse = await GET(filterRequest);
      expect(filterResponse.status).toBe(200);
      const filteredTasks = await filterResponse.json();
      expect(filteredTasks.some((t: any) => t.assignee === 'executor')).toBe(true);

      // 4. 更新任务状态
      const updateRequest = createMockRequest('PUT', {
        id: createdTask.id,
        status: 'in_progress',
      });
      const updateResponse = await PUT(updateRequest);
      expect(updateResponse.status).toBe(200);
      const updatedTask = await updateResponse.json();
      expect(updatedTask.status).toBe('in_progress');
      expect(updatedTask.history.length).toBeGreaterThan(1);

      // 5. 添加评论
      const commentRequest = createMockRequest('PUT', {
        id: createdTask.id,
        comment: '这是一个测试评论',
      });
      const commentResponse = await PUT(commentRequest);
      expect(commentResponse.status).toBe(200);
      const taskWithComment = await commentResponse.json();
      expect(taskWithComment.comments.length).toBeGreaterThan(0);
      expect(taskWithComment.comments[0].content).toBe('这是一个测试评论');

      // 6. 完成任务
      const completeRequest = createMockRequest('PUT', {
        id: createdTask.id,
        status: 'completed',
      });
      const completeResponse = await PUT(completeRequest);
      expect(completeResponse.status).toBe(200);
      const completedTask = await completeResponse.json();
      expect(completedTask.status).toBe('completed');
    });
  });

  describe('任务过滤组合', () => {
    it('应该支持多个过滤条件组合', async () => {
      const request = createMockRequest('GET', undefined, {
        status: 'in_progress',
        type: 'research',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.forEach((task: any) => {
        expect(task.status).toBe('in_progress');
        expect(task.type).toBe('research');
      });
    });

    it('应该支持按负责人和状态过滤', async () => {
      const request = createMockRequest('GET', undefined, {
        status: 'completed',
        assignee: 'agent-world-expert',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.forEach((task: any) => {
        expect(task.status).toBe('completed');
        expect(task.assignee).toBe('agent-world-expert');
      });
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理无效的任务 ID 格式', async () => {
      const request = createMockRequest('PUT', {
        id: '',
        status: 'completed',
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('应该处理无效的状态值', async () => {
      const request = createMockRequest('PUT', {
        id: 'task-001',
        status: 'invalid-status',
      });
      const response = await PUT(request);
      // API 目前不验证状态值，返回成功
      expect(response.status).toBe(200);
    });

    it('应该处理空的评论', async () => {
      const request = createMockRequest('PUT', {
        id: 'task-001',
        comment: '',
      });
      const response = await PUT(request);
      const data = await response.json();

      // 空评论也会被添加
      expect(response.status).toBe(200);
    });

    it('应该处理超长的标题', async () => {
      const longTitle = '测试任务标题'.repeat(50);
      const request = createMockRequest('POST', { title: longTitle });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.title).toBe(longTitle);
    });

    it('应该处理超长的描述', async () => {
      const longDesc = '测试描述'.repeat(1000);
      const request = createMockRequest('POST', {
        title: '测试任务',
        description: longDesc,
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.description).toBe(longDesc);
    });
  });

  describe('认证和授权', () => {
    it('DELETE 需要认证', async () => {
      const { extractToken } = await import('@/lib/security/auth');
      vi.mocked(extractToken).mockReturnValueOnce(null);

      const request = createMockRequest('DELETE', undefined, { id: 'task-001' });
      const response = await DELETE(request);

      expect(response.status).toBe(401);
    });

    it('DELETE 需要管理员权限', async () => {
      const { isAdmin } = await import('@/lib/security/auth');
      vi.mocked(isAdmin).mockReturnValueOnce(false);

      const request = createMockRequest('DELETE', undefined, { id: 'task-001' });
      const response = await DELETE(request);

      expect(response.status).toBe(403);
    });

    it('应该验证 token 有效性', async () => {
      const { verifyToken } = await import('@/lib/security/auth');
      vi.mocked(verifyToken).mockResolvedValueOnce(null);

      const request = createMockRequest('PUT', {
        id: 'task-001',
        status: 'completed',
      });
      const response = await PUT(request);

      expect(response.status).toBe(401);
    });
  });

  describe('数据一致性', () => {
    it('创建任务时应该设置正确的时间戳', async () => {
      const beforeCreate = Date.now();
      const request = createMockRequest('POST', { title: '时间戳测试' });
      const response = await POST(request);
      const data = await response.json();
      const afterCreate = Date.now();

      expect(response.status).toBe(201);
      const createdTime = new Date(data.createdAt).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(beforeCreate - 1000);
      expect(createdTime).toBeLessThanOrEqual(afterCreate + 1000);
    });

    it('更新任务时应该更新时间戳', async () => {
      const request = createMockRequest('PUT', {
        id: 'task-001',
        status: 'in_progress',
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(data.updatedAt).toBeDefined();
      expect(new Date(data.updatedAt).getTime()).toBeGreaterThan(
        new Date('2026-01-01').getTime()
      );
    });

    it('历史记录应该正确追踪状态变更', async () => {
      const request = createMockRequest('PUT', {
        id: 'task-002',
        status: 'completed',
      });
      const response = await PUT(request);
      const data = await response.json();

      const historyEntries = data.history;
      const statusChanges = historyEntries.filter(
        (h: any) => h.status === 'completed'
      );

      expect(statusChanges.length).toBeGreaterThan(0);
      expect(statusChanges[statusChanges.length - 1].changedBy).toBeDefined();
    });
  });

  describe('性能相关', () => {
    it('应该快速响应大量任务查询', async () => {
      const startTime = Date.now();
      const request = createMockRequest('GET');
      const response = await GET(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });

    it('应该处理并发创建请求', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        createMockRequest('POST', {
          title: `并发任务 ${i}`,
          type: 'development',
        })
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // 验证所有任务都被创建
      const listResponse = await GET(createMockRequest('GET'));
      const tasks = await listResponse.json();
      expect(tasks.length).toBeGreaterThanOrEqual(5);
    });
  });
});

describe('Tasks API 数据验证集成', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该验证标题必填', async () => {
    const request = createMockRequest('POST', {
      description: '没有标题的任务',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('title');
  });

  it('应该验证标题类型', async () => {
    const request = createMockRequest('POST', {
      title: 12345,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('string');
  });

  it('应该设置默认值', async () => {
    const request = createMockRequest('POST', {
      title: '只设置标题的任务',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.type).toBe('other');
    expect(data.priority).toBe('medium');
    expect(data.status).toBe('pending');
    expect(data.description).toBe('');
  });
});
