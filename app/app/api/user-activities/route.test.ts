/**
 * 用户活动日志 API 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// 模拟 repository
vi.mock('@/lib/user-activity/repository', () => ({
  userActivityRepository: {
    getActivities: vi.fn(),
    createActivity: vi.fn(),
  },
}));

import { userActivityRepository } from '@/lib/user-activity/repository';

function createRequest(url: string, options?: { method?: string; body?: unknown }): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options?.method || 'GET',
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  }) as NextRequest;
}

describe('/api/user-activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('应该返回活动列表', async () => {
      const mockActivities = [
        {
          id: 'act-1',
          userId: 'user-1',
          type: 'login',
          title: '用户登录',
          source: 'web',
          severity: 'info',
          timestamp: new Date(),
          createdAt: new Date(),
          metadata: {},
        },
      ];

      vi.mocked(userActivityRepository.getActivities).mockResolvedValue({
        activities: mockActivities,
        total: 1,
        hasMore: false,
      });

      const request = createRequest('/api/user-activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.pagination).toBeDefined();
    });

    it('应该支持分页参数', async () => {
      vi.mocked(userActivityRepository.getActivities).mockResolvedValue({
        activities: [],
        total: 0,
        hasMore: false,
      });

      const request = createRequest('/api/user-activities?limit=10&offset=20');
      const response = await GET(request);

      expect(userActivityRepository.getActivities).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });

    it('应该支持过滤参数', async () => {
      vi.mocked(userActivityRepository.getActivities).mockResolvedValue({
        activities: [],
        total: 0,
        hasMore: false,
      });

      const request = createRequest(
        '/api/user-activities?userId=user-1&type=login&severity=error'
      );
      const response = await GET(request);

      expect(userActivityRepository.getActivities).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: ['login'],
          severity: 'error',
        })
      );
    });

    it('应该支持搜索参数', async () => {
      vi.mocked(userActivityRepository.getActivities).mockResolvedValue({
        activities: [],
        total: 0,
        hasMore: false,
      });

      const request = createRequest('/api/user-activities?search=登录');
      const response = await GET(request);

      expect(userActivityRepository.getActivities).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '登录',
        })
      );
    });

    it('应该处理错误', async () => {
      vi.mocked(userActivityRepository.getActivities).mockRejectedValue(
        new Error('Database error')
      );

      const request = createRequest('/api/user-activities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('获取活动列表失败');
    });
  });

  describe('POST', () => {
    it('应该创建新活动', async () => {
      const mockActivity = {
        id: 'act-1',
        userId: 'user-1',
        type: 'login',
        title: '用户登录',
        source: 'web',
        severity: 'info',
        timestamp: new Date(),
        createdAt: new Date(),
        metadata: {},
      };

      vi.mocked(userActivityRepository.createActivity).mockResolvedValue(mockActivity as any);

      const request = createRequest('/api/user-activities', {
        method: 'POST',
        body: {
          userId: 'user-1',
          type: 'login',
          title: '用户登录',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('应该使用默认用户 ID', async () => {
      vi.mocked(userActivityRepository.createActivity).mockResolvedValue({} as any);

      const request = createRequest('/api/user-activities', {
        method: 'POST',
        body: {
          type: 'login',
          title: '用户登录',
        },
      });

      await POST(request);

      expect(userActivityRepository.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'current-user',
        })
      );
    });

    it('应该验证必填字段', async () => {
      const request = createRequest('/api/user-activities', {
        method: 'POST',
        body: {
          userId: 'user-1',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('缺少必填字段');
    });

    it('应该处理错误', async () => {
      vi.mocked(userActivityRepository.createActivity).mockRejectedValue(
        new Error('Database error')
      );

      const request = createRequest('/api/user-activities', {
        method: 'POST',
        body: {
          type: 'login',
          title: '用户登录',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('创建活动记录失败');
    });
  });
});