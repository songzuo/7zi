/**
 * Tests for GitHub Commits API Route
 *
 * 测试 GitHub Commits API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
vi.mock('@/lib/api/validation', () => ({
  githubCommitsQuerySchema: {
    parse: vi.fn((data) => {
      const { owner, repo, per_page = '30', page = '1', sha, path, since, until } = data;

      // Validation logic
      if (!owner || !repo) {
        throw new Error('owner and repo are required');
      }

      const perPageNum = parseInt(per_page);
      const pageNum = parseInt(page);

      if (isNaN(perPageNum) || perPageNum < 1 || perPageNum > 100) {
        throw new Error('per_page must be between 1 and 100');
      }

      if (isNaN(pageNum) || pageNum < 1) {
        throw new Error('page must be greater than 0');
      }

      return {
        owner,
        repo,
        per_page: perPageNum,
        page: pageNum,
        sha: sha || undefined,
        path: path || undefined,
        since: since || undefined,
        until: until || undefined,
      };
    }),
  },
  validateQuery: vi.fn((searchParams, schema) => {
    try {
      const data = schema.parse(Object.fromEntries(searchParams));
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        errors: error instanceof Error ? [{ message: error.message }] : [],
      };
    }
  }),
  formatValidationErrors: vi.fn((errors) => {
    return errors.map((e: any) => e.message);
  }),
}));

vi.mock('@/lib/api/error-handler', () => ({
  createValidationError: vi.fn((message: string, context?: any) => {
    return {
      json: { success: false, error: message, ...context },
      status: 400,
    } as unknown as Response;
  }),
  createUnauthorizedError: vi.fn((message: string) => {
    return {
      json: { success: false, error: message },
      status: 401,
    } as unknown as Response;
  }),
  createNotFoundError: vi.fn((message: string, context?: any) => {
    return {
      json: { success: false, error: message, ...context },
      status: 404,
    } as unknown as Response;
  }),
  createRateLimitError: vi.fn((message: string) => {
    return {
      json: { success: false, error: message },
      status: 429,
    } as unknown as Response;
  }),
  createErrorResponse: vi.fn((error: Error, status?: number) => {
    return {
      json: { success: false, error: error.message },
      status: status || 500,
    } as unknown as Response;
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('GET /api/github/commits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  describe('正常请求测试', () => {
    it('应该成功返回提交列表', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-01T00:00:00Z',
            },
            message: 'Test commit',
          },
          html_url: 'https://github.com/test/repo/commit/abc123',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCommits);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.per_page).toBe(30);
    });

    it('应该支持自定义 per_page 参数', async () => {
      const mockCommits = Array.from({ length: 10 }, (_, i) => ({
        sha: `sha${i}`,
        commit: {
          author: {
            name: `User ${i}`,
            email: `user${i}@example.com`,
            date: '2024-01-01T00:00:00Z',
          },
          message: `Commit ${i}`,
        },
        html_url: `https://github.com/test/repo/commit/sha${i}`,
      }));

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&per_page=10', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(10);
      expect(data.pagination.per_page).toBe(10);
    });

    it('应该支持自定义 page 参数', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-01T00:00:00Z',
            },
            message: 'Test commit',
          },
          html_url: 'https://github.com/test/repo/commit/abc123',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&page=3', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(3);
    });

    it('应该支持 sha 参数过滤', async () => {
      const mockCommits = [
        {
          sha: 'def456',
          commit: {
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-01T00:00:00Z',
            },
            message: 'Test commit',
          },
          html_url: 'https://github.com/test/repo/commit/def456',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&sha=def456', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sha=def456'),
        expect.any(Object)
      );
    });

    it('应该支持 path 参数过滤', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-01T00:00:00Z',
            },
            message: 'Test commit',
          },
          html_url: 'https://github.com/test/repo/commit/abc123',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&path=src/app', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('path=src%2Fapp'),
        expect.any(Object)
      );
    });

    it('应该支持 since 参数过滤', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-01T00:00:00Z',
            },
            message: 'Test commit',
          },
          html_url: 'https://github.com/test/repo/commit/abc123',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&since=2024-01-01T00:00:00Z', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('since=2024-01-01T00%3A00%3A00Z'),
        expect.any(Object)
      );
    });

    it('应该支持 until 参数过滤', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-01T00:00:00Z',
            },
            message: 'Test commit',
          },
          html_url: 'https://github.com/test/repo/commit/abc123',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&until=2024-01-31T00:00:00Z', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('until=2024-01-31T00%3A00%3A00Z'),
        expect.any(Object)
      );
    });

    it('应该使用 GITHUB_TOKEN 进行认证', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-01T00:00:00Z',
            },
            message: 'Test commit',
          },
          html_url: 'https://github.com/test/repo/commit/abc123',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token test-token',
          }),
        })
      );
    });

    it('应该返回 timestamp 字段', async () => {
      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            author: {
              name: 'Test User',
              email: 'test@example.com',
              date: '2024-01-01T00:00:00Z',
            },
            message: 'Test commit',
          },
          html_url: 'https://github.com/test/repo/commit/abc123',
        },
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCommits,
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('输入验证测试', () => {
    it('缺少 owner 参数应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits?repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('owner and repo are required');
    });

    it('缺少 repo 参数应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits?owner=test', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('owner and repo are required');
    });

    it('缺少 owner 和 repo 参数应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('per_page 小于 1 应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&per_page=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('per_page must be between 1 and 100');
    });

    it('per_page 大于 100 应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&per_page=101', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('per_page must be between 1 and 100');
    });

    it('page 小于 1 应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&page=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('page must be greater than 0');
    });

    it('page 为负数应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&page=-1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('per_page 为非数字应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&per_page=abc', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('page 为非数字应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&page=abc', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('应该允许 per_page 为边界值 1', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&per_page=1', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该允许 per_page 为边界值 100', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&per_page=100', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('认证错误测试', () => {
    it('应该处理 GitHub 401 错误（无效 token）', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Bad credentials',
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('GitHub authentication token is invalid');
    });

    it('应该处理 GitHub 403 错误（速率限制）', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600;

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'API rate limit exceeded',
        headers: new Headers({
          'x-ratelimit-reset': resetTime.toString(),
        }),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('rate limit exceeded');
    });

    it('应该处理没有 x-ratelimit-reset 的速率限制', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'API rate limit exceeded',
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('rate limit exceeded');
    });

    it('应该处理未配置 GITHUB_TOKEN 的情况', async () => {
      delete process.env.GITHUB_TOKEN;

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);

      // 应该发出警告但不影响请求
      const { logger } = require('@/lib/logger');
      expect(logger.warn).toHaveBeenCalledWith('GITHUB_TOKEN not configured');

      expect(response.status).toBe(200);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理 GitHub 404 错误（仓库不存在）', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Repository not found',
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=nonexistent&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Repository nonexistent/repo not found');
    });

    it('应该处理 GitHub 500 错误', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Internal Server Error',
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('应该处理 GitHub API 返回非数组响应', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ not: 'an array' }),
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.success).toBe(false);

      const { logger } = require('@/lib/logger');
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该处理网络错误', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      const { logger } = require('@/lib/logger');
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该处理 JSON 解析错误', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => {
          throw new Error('Invalid JSON');
        },
        headers: new Headers(),
        type: 'basic' as ResponseType,
        url: 'http://test.com',
        redirected: false,
        body: null,
        bodyUsed: false,
        clone: () => ({ ok: true, status: 200 } as Response),
        text: async () => '',
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
      } as unknown as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);

      const { logger } = require('@/lib/logger');
      expect(logger.error).toHaveBeenCalled();
    });

    it('应该处理响应文本读取错误', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => {
          throw new Error('Failed to read response');
        },
        headers: new Headers(),
        type: 'basic' as ResponseType,
        url: 'http://test.com',
        redirected: false,
        body: null,
        bodyUsed: false,
        clone: () => ({ ok: false, status: 500 } as Response),
        json: async () => ({}),
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
      } as unknown as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空提交列表', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('应该处理特殊字符的 owner 和 repo', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test--user&repo=my--repo', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('repos/test--user/my--repo/commits'),
        expect.any(Object)
      );
    });

    it('应该处理带特殊字符的 sha', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&sha=abc123def456', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理带斜杠的 path', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&path=src/app/page.tsx', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('path=src%2Fapp%2Fpage.tsx'),
        expect.any(Object)
      );
    });

    it('应该处理带特殊字符的 path', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&path=src/app%20test/page.tsx', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理 ISO 8601 日期格式的 since', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest('http://localhost/api/github/commits?owner=test&repo=repo&since=2024-01-01T00:00:00.000Z', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理所有过滤参数组合', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      } as Response);

      const request = new NextRequest(
        'http://localhost/api/github/commits?owner=test&repo=repo&per_page=10&page=2&sha=abc123&path=src/app&since=2024-01-01T00:00:00Z&until=2024-12-31T23:59:59Z',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});
