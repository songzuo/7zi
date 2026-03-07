/**
 * 批量操作 API 测试
 * 测试覆盖: update-status, update-priority, assign, delete, add-tags, remove-tags, set-due-date
 * 错误处理: 无效操作类型、缺少 ids、数据库错误
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// 模拟数据库模块 - 所有模拟函数必须在工厂函数内部定义
vi.mock('@/lib/db/index', () => ({
  getDatabaseAsync: vi.fn(),
}));

// 导入被测试模块（必须在 mock 之后）
import { POST, GET } from '../app/api/tasks/batch/route';
import { getDatabaseAsync } from '@/lib/db/index';

// 辅助函数：创建模拟的 prepared statement
function createMockStmt(runResult: { changes: number } = { changes: 1 }) {
  return {
    run: vi.fn().mockReturnValue(runResult),
    get: vi.fn(),
    all: vi.fn(),
  };
}

// 辅助函数：创建模拟数据库
function createMockDb() {
  return {
    prepare: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn),
    exec: vi.fn(),
    pragma: vi.fn(),
    close: vi.fn(),
  };
}

describe('Batch Operations API', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getDatabaseAsync).mockResolvedValue(mockDb as any);
  });

  describe('GET /api/tasks/batch', () => {
    it('应该返回支持的批量操作列表', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('operations');
      expect(data.operations.length).toBe(7);

      // 验证操作列表包含所有必需操作
      const operationNames = data.operations.map((op: any) => op.name);
      expect(operationNames).toContain('update-status');
      expect(operationNames).toContain('update-priority');
      expect(operationNames).toContain('assign');
      expect(operationNames).toContain('delete');
      expect(operationNames).toContain('add-tags');
      expect(operationNames).toContain('remove-tags');
      expect(operationNames).toContain('set-due-date');
    });

    it('每个操作应该有 name、description 和 payload 属性', async () => {
      const response = await GET();
      const data = await response.json();

      data.operations.forEach((op: any) => {
        expect(op).toHaveProperty('name');
        expect(op).toHaveProperty('description');
        expect(op).toHaveProperty('payload');
        expect(typeof op.name).toBe('string');
        expect(typeof op.description).toBe('string');
      });
    });
  });

  describe('POST /api/tasks/batch - update-status', () => {
    it('应该成功批量更新任务状态为 todo', async () => {
      const stmt = createMockStmt({ changes: 3 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2', 'task-3'],
          operation: 'update-status',
          payload: { status: 'todo' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.operation).toBe('update-status');
      expect(data.affected).toBe(3);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('应该成功批量更新任务状态为 done 并设置 completedAt', async () => {
      const stmt = createMockStmt({ changes: 2 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2'],
          operation: 'update-status',
          payload: { status: 'done' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.affected).toBe(2);
    });

    it('应该成功更新状态为 in_progress', async () => {
      const stmt = createMockStmt({ changes: 1 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'update-status',
          payload: { status: 'in_progress' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该成功更新状态为 review', async () => {
      const stmt = createMockStmt({ changes: 1 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'update-status',
          payload: { status: 'review' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该拒绝无效的状态值', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'update-status',
          payload: { status: 'invalid_status' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid status');
    });
  });

  describe('POST /api/tasks/batch - update-priority', () => {
    it('应该成功批量更新任务优先级为 high', async () => {
      const stmt = createMockStmt({ changes: 2 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2'],
          operation: 'update-priority',
          payload: { priority: 'high' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.operation).toBe('update-priority');
      expect(data.affected).toBe(2);
    });

    it('应该成功更新优先级为 medium', async () => {
      const stmt = createMockStmt({ changes: 1 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'update-priority',
          payload: { priority: 'medium' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该成功更新优先级为 low', async () => {
      const stmt = createMockStmt({ changes: 1 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'update-priority',
          payload: { priority: 'low' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该拒绝无效的优先级值', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'update-priority',
          payload: { priority: 'urgent' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid priority');
    });
  });

  describe('POST /api/tasks/batch - assign', () => {
    it('应该成功批量分配任务给用户', async () => {
      const stmt = createMockStmt({ changes: 3 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2', 'task-3'],
          operation: 'assign',
          payload: { assignee: 'user-123' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.operation).toBe('assign');
      expect(data.affected).toBe(3);
    });

    it('应该支持取消分配 (assignee 为 null)', async () => {
      const stmt = createMockStmt({ changes: 2 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2'],
          operation: 'assign',
          payload: { assignee: null },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/tasks/batch - delete', () => {
    it('应该成功批量删除任务', async () => {
      const deleteTagsStmt = createMockStmt({ changes: 5 });
      const deleteTaskStmt = createMockStmt({ changes: 3 });

      mockDb.prepare
        .mockReturnValueOnce(deleteTagsStmt)
        .mockReturnValueOnce(deleteTaskStmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2', 'task-3'],
          operation: 'delete',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.operation).toBe('delete');
      expect(data.affected).toBe(3);
    });

    it('删除任务时应该同时删除标签关联', async () => {
      const deleteTagsStmt = createMockStmt({ changes: 2 });
      const deleteTaskStmt = createMockStmt({ changes: 1 });

      mockDb.prepare
        .mockReturnValueOnce(deleteTagsStmt)
        .mockReturnValueOnce(deleteTaskStmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'delete',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // 验证调用了两个 prepared statements（删除标签和删除任务）
      expect(mockDb.prepare).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST /api/tasks/batch - add-tags', () => {
    it('应该成功批量添加标签', async () => {
      const stmt = createMockStmt({ changes: 6 }); // 2 tasks * 3 tags
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2'],
          operation: 'add-tags',
          payload: { tagIds: ['tag-1', 'tag-2', 'tag-3'] },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.operation).toBe('add-tags');
      // affected 是任务数量，不是关联数
      expect(data.affected).toBe(2);
    });

    it('应该拒绝没有 tagIds 的请求', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'add-tags',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Tag IDs are required');
    });

    it('应该拒绝空 tagIds 数组', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'add-tags',
          payload: { tagIds: [] },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/tasks/batch - remove-tags', () => {
    it('应该成功批量移除标签', async () => {
      const stmt = createMockStmt({ changes: 4 }); // 2 tasks * 2 tags removed
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2'],
          operation: 'remove-tags',
          payload: { tagIds: ['tag-1', 'tag-2'] },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.operation).toBe('remove-tags');
      expect(data.affected).toBe(2);
    });

    it('应该拒绝没有 tagIds 的移除请求', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'remove-tags',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Tag IDs are required');
    });
  });

  describe('POST /api/tasks/batch - set-due-date', () => {
    it('应该成功批量设置截止日期', async () => {
      const stmt = createMockStmt({ changes: 3 });
      mockDb.prepare.mockReturnValue(stmt);

      const dueDate = '2025-12-31T23:59:59.000Z';
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2', 'task-3'],
          operation: 'set-due-date',
          payload: { dueDate },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.operation).toBe('set-due-date');
      expect(data.affected).toBe(3);
    });

    it('应该支持清除截止日期 (dueDate 为 null)', async () => {
      const stmt = createMockStmt({ changes: 2 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2'],
          operation: 'set-due-date',
          payload: { dueDate: null },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('错误处理 - 无效操作类型', () => {
    it('应该拒绝未知操作类型', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'unknown-operation',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Unknown operation');
    });

    it('应该拒绝空操作类型', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: '',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('错误处理 - 缺少 ids', () => {
    it('应该拒绝没有 ids 的请求', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'delete',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Task IDs are required');
    });

    it('应该拒绝空 ids 数组', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: [],
          operation: 'delete',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('non-empty array');
    });

    it('应该拒绝 ids 不是数组的情况', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: 'task-1',
          operation: 'delete',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('错误处理 - 数据库错误', () => {
    it('应该处理数据库连接错误', async () => {
      // 模拟数据库错误
      vi.mocked(getDatabaseAsync).mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'delete',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Failed to perform batch operation');
    });

    it('应该处理 SQL 执行错误', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('SQL execution failed');
      });

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1'],
          operation: 'update-status',
          payload: { status: 'done' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
    });
  });

  describe('响应格式验证', () => {
    it('成功响应应该包含所有必需字段', async () => {
      const stmt = createMockStmt({ changes: 2 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['task-1', 'task-2'],
          operation: 'update-status',
          payload: { status: 'done' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('operation');
      expect(data).toHaveProperty('affected');
      expect(data).toHaveProperty('ids');
      expect(data.success).toBe(true);
      expect(Array.isArray(data.ids)).toBe(true);
      expect(typeof data.affected).toBe('number');
    });
  });

  describe('边界情况', () => {
    it('应该处理单个 ID 的情况', async () => {
      const stmt = createMockStmt({ changes: 1 });
      mockDb.prepare.mockReturnValue(stmt);

      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids: ['single-task'],
          operation: 'update-priority',
          payload: { priority: 'high' },
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.affected).toBe(1);
    });

    it('应该处理大量 ID 的情况', async () => {
      const stmt = createMockStmt({ changes: 100 });
      mockDb.prepare.mockReturnValue(stmt);

      const ids = Array.from({ length: 100 }, (_, i) => `task-${i + 1}`);
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: JSON.stringify({
          ids,
          operation: 'delete',
          payload: {},
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.affected).toBe(100);
    });

    it('应该处理无效的 JSON 请求体', async () => {
      const request = new NextRequest('http://localhost/api/tasks/batch', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      // 应该返回错误响应
      expect(response.status).toBe(500);
    });
  });
});