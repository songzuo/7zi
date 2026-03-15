/**
 * Comments API 单元测试
 * 测试博客评论 API 的所有端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock data store
let mockComments: any[] = [];

const resetMockData = () => {
  mockComments = [
    {
      id: 'comment-001',
      postId: 'post-001',
      author: '测试用户1',
      content: '这是一条测试评论',
      tags: ['test'],
      createdAt: '2026-03-15T10:00:00.000Z',
      updatedAt: '2026-03-15T10:00:00.000Z',
    },
    {
      id: 'comment-002',
      postId: 'post-001',
      author: '测试用户2',
      content: '这是另一条测试评论',
      tags: [],
      createdAt: '2026-03-15T11:00:00.000Z',
      updatedAt: '2026-03-15T11:00:00.000Z',
    },
    {
      id: 'comment-003',
      postId: 'post-002',
      author: '测试用户3',
      content: '不同文章的评论',
      tags: ['important'],
      createdAt: '2026-03-15T12:00:00.000Z',
      updatedAt: '2026-03-15T12:00:00.000Z',
    },
  ];
};

// Setup fs mock
const setupFsMock = () => {
  (fs.existsSync as any).mockReturnValue(true);
  (fs.readFileSync as any).mockImplementation(() => JSON.stringify(mockComments));
  (fs.writeFileSync as any).mockImplementation(() => {});
  (fs.mkdirSync as any).mockImplementation(() => {});
};

// Import routes after mocks
import { GET as getComments, POST as createComment } from '@/app/api/comments/route';
import { GET as getComment, PUT as updateComment, DELETE as deleteComment } from '@/app/api/comments/[id]/route';

// Helper function to create mock request for list endpoints
function createMockRequest(
  method: string,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL('http://localhost:3000/api/comments');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper function to create mock request for single comment endpoints
function createMockRequestWithId(
  method: string,
  id: string,
  body?: Record<string, unknown>
): NextRequest {
  const url = new URL(`http://localhost:3000/api/comments/${id}`);

  const req = new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
  });

  if (body) {
    Object.defineProperty(req, 'json', {
      value: vi.fn().mockResolvedValue(body),
      writable: true,
    });
    Object.defineProperty(req, 'text', {
      value: vi.fn().mockResolvedValue(JSON.stringify(body)),
      writable: true,
    });
  }

  return req;
}

// Helper function to create mock request with body
function createMockRequestWithBody(
  method: string,
  body: Record<string, unknown>
): NextRequest {
  const url = new URL('http://localhost:3000/api/comments');

  const req = new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  Object.defineProperty(req, 'json', {
    value: vi.fn().mockResolvedValue(body),
    writable: true,
  });

  return req;
}

describe('Comments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockData();
    setupFsMock();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // GET /api/comments - 获取评论列表
  // ============================================

  describe('GET /api/comments', () => {
    it('应该返回所有评论', async () => {
      const request = createMockRequest('GET');
      const response = await getComments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.comments).toHaveLength(3);
      expect(data.data.total).toBe(3);
    });

    it('应该按文章ID筛选评论', async () => {
      const request = createMockRequest('GET', { postId: 'post-001' });
      const response = await getComments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.comments).toHaveLength(2);
      data.data.comments.forEach((comment: any) => {
        expect(comment.postId).toBe('post-001');
      });
    });

    it('应该返回空数组当没有匹配的评论', async () => {
      const request = createMockRequest('GET', { postId: 'non-existent-post' });
      const response = await getComments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.comments).toHaveLength(0);
      expect(data.data.total).toBe(0);
    });

    it('应该按创建时间倒序排列', async () => {
      const request = createMockRequest('GET');
      const response = await getComments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const comments = data.data.comments;
      for (let i = 0; i < comments.length - 1; i++) {
        const current = new Date(comments[i].createdAt).getTime();
        const next = new Date(comments[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('应该处理文件不存在的情况', async () => {
      (fs.existsSync as any).mockReturnValue(false);
      
      const request = createMockRequest('GET');
      const response = await getComments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.comments).toHaveLength(0);
    });

    it('应该处理无效的JSON数据', async () => {
      (fs.readFileSync as any).mockReturnValue('invalid json');
      
      const request = createMockRequest('GET');
      const response = await getComments(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.comments).toHaveLength(0);
    });
  });

  // ============================================
  // POST /api/comments - 创建评论
  // ============================================

  describe('POST /api/comments', () => {
    it('应该成功创建评论', async () => {
      const body = {
        postId: 'post-001',
        author: '新用户',
        content: '这是一条新评论',
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
      expect(data.data.postId).toBe('post-001');
      expect(data.data.author).toBe('新用户');
      expect(data.data.content).toBe('这是一条新评论');
    });

    it('应该支持标签', async () => {
      const body = {
        postId: 'post-001',
        author: '标签用户',
        content: '带标签的评论',
        tags: ['question', 'important'],
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tags).toEqual(['question', 'important']);
    });

    it('应该验证必填字段 - postId', async () => {
      const body = {
        author: '测试用户',
        content: '评论内容',
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('应该验证必填字段 - author', async () => {
      const body = {
        postId: 'post-001',
        content: '评论内容',
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('应该验证必填字段 - content', async () => {
      const body = {
        postId: 'post-001',
        author: '测试用户',
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('应该验证内容长度不超过5000字符', async () => {
      const body = {
        postId: 'post-001',
        author: '测试用户',
        content: 'a'.repeat(5001),
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('应该接受最大长度的内容', async () => {
      const body = {
        postId: 'post-001',
        author: '测试用户',
        content: 'a'.repeat(5000),
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);

      expect(response.status).toBe(200);
    });

    it('应该自动修剪空白字符', async () => {
      const body = {
        postId: '  post-001  ',
        author: '  测试用户  ',
        content: '  评论内容  ',
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.postId).toBe('post-001');
      expect(data.data.author).toBe('测试用户');
      expect(data.data.content).toBe('评论内容');
    });

    it('应该过滤无效的标签', async () => {
      const body = {
        postId: 'post-001',
        author: '测试用户',
        content: '评论内容',
        tags: ['valid', 123, null, 'also-valid'],
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tags).toEqual(['valid', 'also-valid']);
    });

    it('应该处理空标签数组', async () => {
      const body = {
        postId: 'post-001',
        author: '测试用户',
        content: '评论内容',
        tags: [],
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tags).toEqual([]);
    });
  });

  // ============================================
  // GET /api/comments/:id - 获取单个评论
  // ============================================

  describe('GET /api/comments/:id', () => {
    it('应该返回指定评论', async () => {
      const request = createMockRequestWithId('GET', 'comment-001');
      const response = await getComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('comment-001');
      expect(data.data.author).toBe('测试用户1');
    });

    it('应该返回404当评论不存在', async () => {
      const request = createMockRequestWithId('GET', 'non-existent-id');
      const response = await getComment(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment not found');
    });

    it('应该返回400当没有提供ID', async () => {
      const url = new URL('http://localhost:3000/api/comments/');
      const request = new NextRequest(url, { method: 'GET' });
      
      const response = await getComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment ID is required');
    });
  });

  // ============================================
  // PUT /api/comments/:id - 更新评论
  // ============================================

  describe('PUT /api/comments/:id', () => {
    it('应该成功更新评论内容', async () => {
      const body = {
        content: '更新后的评论内容',
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('更新后的评论内容');
    });

    it('应该成功更新作者名称', async () => {
      const body = {
        author: '更新后的作者',
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.author).toBe('更新后的作者');
    });

    it('应该同时更新内容和作者', async () => {
      const body = {
        content: '新的内容',
        author: '新的作者',
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.content).toBe('新的内容');
      expect(data.data.author).toBe('新的作者');
    });

    it('应该返回404当评论不存在', async () => {
      const body = {
        content: '更新的内容',
      };

      const request = createMockRequestWithId('PUT', 'non-existent-id', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment not found');
    });

    it('应该返回400当没有提供ID', async () => {
      const url = new URL('http://localhost:3000/api/comments/');
      const request = new NextRequest(url, { method: 'PUT' });
      Object.defineProperty(request, 'text', {
        value: vi.fn().mockResolvedValue(JSON.stringify({ content: 'test' })),
        writable: true,
      });
      
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment ID is required');
    });

    it('应该返回400当请求体为空', async () => {
      const request = createMockRequestWithId('PUT', 'comment-001', null);
      Object.defineProperty(request, 'text', {
        value: vi.fn().mockResolvedValue(''),
        writable: true,
      });

      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Request body is required for update');
    });

    it('应该验证内容类型', async () => {
      const body = {
        content: 123,
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content must be a string');
    });

    it('应该验证作者类型', async () => {
      const body = {
        author: 123,
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Author must be a string');
    });

    it('应该拒绝空内容', async () => {
      const body = {
        content: '   ',
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content cannot be empty');
    });

    it('应该拒绝空作者名称', async () => {
      const body = {
        author: '',
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Author cannot be empty');
    });

    it('应该验证内容长度不超过5000字符', async () => {
      const body = {
        content: 'a'.repeat(5001),
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Content must be less than 5000 characters');
    });

    it('应该自动修剪空白字符', async () => {
      const body = {
        content: '  更新后的内容  ',
        author: '  更新后的作者  ',
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.content).toBe('更新后的内容');
      expect(data.data.author).toBe('更新后的作者');
    });

    it('应该在没有实际更新时仍返回成功', async () => {
      const body = {}; // 空对象

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该处理null值作为不更新', async () => {
      const body = {
        content: null,
        author: null,
      };

      const request = createMockRequestWithId('PUT', 'comment-001', body);
      const response = await updateComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // ============================================
  // DELETE /api/comments/:id - 删除评论
  // ============================================

  describe('DELETE /api/comments/:id', () => {
    it('应该成功删除评论', async () => {
      const request = createMockRequestWithId('DELETE', 'comment-001');
      const response = await deleteComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Comment deleted successfully');
    });

    it('应该返回404当评论不存在', async () => {
      const request = createMockRequestWithId('DELETE', 'non-existent-id');
      const response = await deleteComment(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment not found');
    });

    it('应该返回400当没有提供ID', async () => {
      const url = new URL('http://localhost:3000/api/comments/');
      const request = new NextRequest(url, { method: 'DELETE' });
      
      const response = await deleteComment(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment ID is required');
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe('Integration: Full comment lifecycle', () => {
    it('应该完成创建、读取、更新、删除的完整流程', async () => {
      // 由于 mock 不持久化数据，我们测试各操作的独立功能
      // 1. 创建评论 - 验证响应格式正确
      const createBody = {
        postId: 'post-integration',
        author: '集成测试用户',
        content: '集成测试评论内容',
        tags: ['integration'],
      };

      const createRequest = createMockRequestWithBody('POST', createBody);
      const createResponse = await createComment(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(200);
      expect(createData.success).toBe(true);
      expect(createData.data).toHaveProperty('id');
      expect(createData.data.postId).toBe('post-integration');
      expect(createData.data.author).toBe('集成测试用户');

      // 2. 读取评论列表
      const listRequest = createMockRequest('GET', { postId: 'post-001' });
      const listResponse = await getComments(listRequest);
      const listData = await listResponse.json();

      expect(listResponse.status).toBe(200);
      expect(listData.success).toBe(true);
      expect(listData.data.comments).toBeDefined();
      expect(listData.data.total).toBeDefined();

      // 3. 更新评论
      const updateBody = {
        content: '更新后的内容',
      };
      const updateRequest = createMockRequestWithId('PUT', 'comment-001', updateBody);
      const updateResponse = await updateComment(updateRequest);
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.success).toBe(true);
      expect(updateData.data.content).toBe('更新后的内容');

      // 4. 删除评论
      const deleteRequest = createMockRequestWithId('DELETE', 'comment-001');
      const deleteResponse = await deleteComment(deleteRequest);
      const deleteData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteData.success).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('应该处理特殊字符', async () => {
      const body = {
        postId: 'post-special',
        author: '特殊用户 <script>alert("xss")</script>',
        content: '包含特殊字符的评论: <>&"\'',
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.author).toContain('特殊用户');
      expect(data.data.content).toContain('包含特殊字符');
    });

    it('应该处理Unicode字符', async () => {
      const body = {
        postId: 'post-unicode',
        author: '用户 👤',
        content: '这是一个测试 🎉 émoji and ñoñó',
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.author).toBe('用户 👤');
      expect(data.data.content).toBe('这是一个测试 🎉 émoji and ñoñó');
    });

    it('应该处理非常长的作者名称', async () => {
      const body = {
        postId: 'post-long',
        author: 'a'.repeat(200),
        content: '测试内容',
      };

      const request = createMockRequestWithBody('POST', body);
      const response = await createComment(request);

      expect(response.status).toBe(200);
    });

    it('应该处理带查询参数的ID', async () => {
      const request = createMockRequestWithId('GET', 'comment-001?extra=param');
      const response = await getComment(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // API 正确过滤了查询参数，返回纯ID
      expect(data.data.id).toBe('comment-001');
    });
  });
});
