/**
 * Tests for Search API Routes
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/search/advanced-search', () => ({
  getGlobalSearchManager: () => ({
    search: vi.fn((query: string, options: unknown) => {
      // Mock search results
      return [
        {
          item: {
            type: 'task',
            id: 'task-1',
            title: 'Test Task 1',
            description: 'A test task for search',
            status: 'pending',
            priority: 'high',
            labels: [{ name: 'test' }, { name: 'search' }],
            assignee: 'user-1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
          score: 0.95,
        },
        {
          item: {
            type: 'task',
            id: 'task-2',
            title: 'Test Task 2',
            description: 'Another test task',
            status: 'completed',
            priority: 'low',
            labels: [{ name: 'test' }],
            assignee: 'user-2',
            createdAt: '2024-01-03T00:00:00Z',
            updatedAt: '2024-01-04T00:00:00Z',
          },
          score: 0.85,
        },
      ];
    }),
  }),
}));

vi.mock('@/lib/search/history-manager', () => ({
  getGlobalHistoryManager: () => ({
    add: vi.fn(),
    getRecent: vi.fn((limit: number) => {
      return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
        query: `search ${i + 1}`,
        resultCount: 10,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
      }));
    }),
  }),
}));

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data) => {
    return {
      json: data,
      status: 200,
    } as unknown as Response;
  }),
  createErrorResponse: vi.fn((error) => {
    return {
      json: { success: false, error: error.message },
      status: 500,
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

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('正常响应测试', () => {
    it('应该返回搜索结果', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
      expect(Array.isArray(data.data.results)).toBe(true);
      expect(data.data.results.length).toBeGreaterThan(0);
    });

    it('应该包含分页信息', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=10&offset=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.total).toBeDefined();
      expect(data.data.page).toBe(1);
      expect(data.data.pageSize).toBe(10);
      expect(data.data.hasMore).toBeDefined();
      expect(typeof data.data.hasMore).toBe('boolean');
    });

    it('应该支持不同的目标类型', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&target=tasks', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该包含历史记录当请求时', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&history=true', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.history).toBeDefined();
      expect(Array.isArray(data.data.history)).toBe(true);
    });

    it('应该支持模糊搜索', async () => {
      const request = new NextRequest('http://localhost/api/search?q=tset&fuzzy=true', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该支持自定义模糊阈值', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&fuzzy=true&fuzzyThreshold=0.5', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该支持大小写敏感搜索', async () => {
      const request = new NextRequest('http://localhost/api/search?q=Test&caseSensitive=true', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该支持包含高亮', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&highlights=true', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理空查询字符串', async () => {
      const request = new NextRequest('http://localhost/api/search?q=', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
    });

    it('应该处理无效的目标类型', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&target=invalid', {
        method: 'GET',
      });

      const response = await GET(request);

      // 应该仍然返回响应，可能没有结果
      expect(response.status).toBe(200);
    });

    it('应该处理无效的limit参数', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=abc', {
        method: 'GET',
      });

      const response = await GET(request);

      // 应该使用默认值
      expect(response.status).toBe(200);
    });

    it('应该处理无效的offset参数', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&offset=abc', {
        method: 'GET',
      });

      const response = await GET(request);

      // 应该使用默认值
      expect(response.status).toBe(200);
    });

    it('应该处理无效的fuzzyThreshold参数', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&fuzzyThreshold=abc', {
        method: 'GET',
      });

      const response = await GET(request);

      // 应该使用默认值
      expect(response.status).toBe(200);
    });

    it('应该处理服务器错误', async () => {
      // Get the mocked function
      const { getGlobalSearchManager } = await import('@/lib/search/advanced-search');

      // Mock error scenario using vi.mocked
      const mockSearch = vi.mocked(getGlobalSearchManager).mockImplementationOnce(() => ({
        search: vi.fn(() => {
          throw new Error('Search service unavailable');
        }),
      }));

      const request = new NextRequest('http://localhost/api/search?q=test', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);

      // Restore original mock
      mockSearch.mockRestore();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极限limit值', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=1000', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理极限offset值', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&offset=99999', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.results.length).toBe(0);
      expect(data.data.hasMore).toBe(false);
    });

    it('应该处理负offset值', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&offset=-1', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理极小limit值', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.results.length).toBeLessThanOrEqual(1);
    });

    it('应该处理零limit值', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.results.length).toBe(0);
    });

    it('应该处理多个过滤器', async () => {
      const request = new NextRequest(
        'http://localhost/api/search?q=test&status=pending,completed&priority=high,low&labels=test&assignees=user-1',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理日期范围过滤器', async () => {
      const request = new NextRequest(
        'http://localhost/api/search?q=test&createdAfter=2024-01-01&createdBefore=2024-12-31',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理无效的日期格式', async () => {
      const request = new NextRequest(
        'http://localhost/api/search?q=test&createdAfter=invalid-date',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);

      // 应该仍然返回响应
      expect(response.status).toBe(200);
    });

    it('应该处理特殊字符查询', async () => {
      const request = new NextRequest(
        'http://localhost/api/search?q=test%20%3C%3E%20%26%20%22%27',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该处理超长查询字符串', async () => {
      const longQuery = 'test '.repeat(1000);
      const request = new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(longQuery)}`, {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('应该正确计算hasMore标志', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=1&offset=0', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 如果总结果数大于limit，hasMore应该为true
      if (data.data.total > 1) {
        expect(data.data.hasMore).toBe(true);
      }
    });

    it('应该正确计算页码', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=10&offset=20', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.page).toBe(3);
    });

    it('应该处理所有目标搜索', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&target=all', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.status).toBe(200);
    });
  });
});
