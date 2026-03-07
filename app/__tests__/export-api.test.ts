/**
 * 导出 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../app/api/export/route';
import { NextRequest } from 'next/server';

// Mock 任务 API
vi.mock('@/lib/tasks/api', () => ({
  getTasks: vi.fn().mockResolvedValue([
    {
      id: 'task-1',
      title: '测试任务1',
      description: '描述1',
      priority: 'high',
      status: 'done',
      tags: [{ id: 'tag-1', name: '功能', color: 'blue' }],
      assignee: 'user-1',
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: '测试任务2',
      description: '描述2',
      priority: 'medium',
      status: 'in_progress',
      tags: [{ id: 'tag-2', name: 'Bug', color: 'red' }],
      assignee: 'user-2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]),
}));

describe('Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/export', () => {
    it('应该返回 JSON 格式的导出数据', async () => {
      const url = new URL('http://localhost/api/export?format=json&type=tasks');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('exportedAt');
    });

    it('应该返回 CSV 格式的导出数据', async () => {
      const url = new URL('http://localhost/api/export?format=csv&type=tasks');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/csv');
      expect(text).toContain('ID');
      expect(text).toContain('标题');
    });

    it('应该返回统计数据', async () => {
      const url = new URL('http://localhost/api/export?format=json&type=stats');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('tasks');
      expect(data.stats).toHaveProperty('total');
      expect(data.stats).toHaveProperty('done');
      expect(data.stats).toHaveProperty('completionRate');
    });

    it('应该拒绝不支持的格式', async () => {
      const url = new URL('http://localhost/api/export?format=xml&type=tasks');
      const request = new NextRequest(url);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });

  describe('POST /api/export', () => {
    it('应该导出任务数据为 JSON', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json', type: 'tasks' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
    });

    it('应该导出任务数据为 CSV', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'csv', type: 'tasks' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/csv');
      expect(text).toContain('ID');
    });

    it('应该返回统计数据', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json', type: 'stats' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total');
      expect(data.data).toHaveProperty('completionRate');
    });

    it('应该导出自定义数据', async () => {
      const customData = [
        { name: '项目1', status: '完成' },
        { name: '项目2', status: '进行中' },
      ];
      
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json', type: 'custom', data: customData }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(customData);
    });

    it('应该拒绝没有数据的自定义导出', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json', type: 'custom' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('应该拒绝不支持的导出类型', async () => {
      const request = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json', type: 'unsupported' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });
  });
});