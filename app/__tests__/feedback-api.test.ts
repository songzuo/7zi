import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../app/api/feedback/route';
import { PATCH, DELETE } from '../app/api/feedback/[id]/route';

// 模拟 NextRequest
function createRequest(url: string, options?: { method?: string; body?: unknown }): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options?.method || 'GET',
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  }) as NextRequest;
}

describe('/api/feedback', () => {
  describe('GET', () => {
    it('应该返回反馈列表', async () => {
      const request = createRequest('/api/feedback');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it('应该支持分页参数', async () => {
      const request = createRequest('/api/feedback?limit=5&offset=0');
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.limit).toBe(5);
      expect(data.pagination.offset).toBe(0);
    });

    it('应该支持按分类过滤', async () => {
      const request = createRequest('/api/feedback?category=bug');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // 检查返回的数据都是 bug 分类
      data.data.forEach((item: { category: string }) => {
        expect(item.category).toBe('bug');
      });
    });

    it('应该支持按状态过滤', async () => {
      const request = createRequest('/api/feedback?status=pending');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((item: { status: string }) => {
        expect(item.status).toBe('pending');
      });
    });

    it('应该支持按最低评分过滤', async () => {
      const request = createRequest('/api/feedback?minRating=4');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((item: { rating: number }) => {
        expect(item.rating).toBeGreaterThanOrEqual(4);
      });
    });

    it('应该按创建时间倒序排列', async () => {
      const request = createRequest('/api/feedback');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const dates = data.data.map((item: { createdAt: string }) => new Date(item.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });
  });

  describe('POST', () => {
    it('应该创建新的反馈', async () => {
      const newFeedback = {
        userId: 'test-user',
        userName: '测试用户',
        rating: 4,
        category: 'feature',
        title: '测试功能建议',
        content: '这是一个测试功能建议的内容',
        tags: ['测试'],
      };

      const request = createRequest('/api/feedback', {
        method: 'POST',
        body: newFeedback,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.status).toBe('pending');
      expect(data.data.title).toBe(newFeedback.title);
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const incompleteFeedback = {
        userId: 'test-user',
        // 缺少 title, content, rating
      };

      const request = createRequest('/api/feedback', {
        method: 'POST',
        body: incompleteFeedback,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('缺少必填字段');
    });

    it('应该拒绝无效的评分值', async () => {
      const invalidFeedback = {
        userId: 'test-user',
        userName: '测试用户',
        rating: 6, // 超出范围
        title: '测试标题',
        content: '测试内容',
      };

      const request = createRequest('/api/feedback', {
        method: 'POST',
        body: invalidFeedback,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('评分必须在 0-5 之间');
    });

    it('应该使用默认值填充可选字段', async () => {
      const minimalFeedback = {
        userId: 'test-user',
        title: '测试标题',
        content: '测试内容',
        rating: 3,
      };

      const request = createRequest('/api/feedback', {
        method: 'POST',
        body: minimalFeedback,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.category).toBe('other');
      expect(data.data.tags).toEqual([]);
    });
  });
});

describe('/api/feedback/[id]', () => {
  describe('PATCH', () => {
    it('应该更新反馈状态', async () => {
      const request = createRequest('/api/feedback/fb-1', {
        method: 'PATCH',
        body: { status: 'resolved' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'fb-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('resolved');
    });

    it('应该拒绝无效的状态值', async () => {
      const request = createRequest('/api/feedback/fb-1', {
        method: 'PATCH',
        body: { status: 'invalid-status' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'fb-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('无效的状态值');
    });

    it('应该添加回复', async () => {
      const request = createRequest('/api/feedback/fb-2', {
        method: 'PATCH',
        body: { response: '这是一条管理员回复' },
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'fb-2' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.responses.length).toBeGreaterThan(0);
    });
  });

  describe('GET', () => {
    it('应该返回单个反馈详情', async () => {
      // 先创建一个反馈
      const createRequest = createRequest('/api/feedback', {
        method: 'POST',
        body: {
          userId: 'test-user',
          title: '测试标题',
          content: '测试内容',
          rating: 4,
        },
      });
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const feedbackId = createData.data.id;

      // 获取反馈详情
      const request = createRequest(`/api/feedback/${feedbackId}`);
      const response = await GET(request, { params: Promise.resolve({ id: feedbackId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(feedbackId);
    });

    it('应该返回404当反馈不存在时', async () => {
      const request = createRequest('/api/feedback/non-existent-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('反馈不存在');
    });
  });

  describe('DELETE', () => {
    it('应该删除反馈', async () => {
      // 先创建一个反馈
      const createRequest = createRequest('/api/feedback', {
        method: 'POST',
        body: {
          userId: 'test-user',
          title: '待删除的反馈',
          content: '测试内容',
          rating: 3,
        },
      });
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();
      const feedbackId = createData.data.id;

      // 删除反馈
      const deleteRequest = createRequest(`/api/feedback/${feedbackId}`, { method: 'DELETE' });
      const response = await DELETE(deleteRequest, { params: Promise.resolve({ id: feedbackId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('反馈已删除');
    });

    it('应该返回404当删除不存在的反馈时', async () => {
      const request = createRequest('/api/feedback/non-existent-id', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent-id' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('反馈不存在');
    });
  });
});