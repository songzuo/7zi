/**
 * GitHub Commits API Integration Tests
 * GET /api/github/commits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { createMockRequest, TEST_URLS } from '@/test/mocks/api-mocks';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GET /api/github/commits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request validation', () => {
    it('should validate required parameters (owner, repo)', async () => {
      const request = createMockRequest('http://localhost:3000/api/github/commits', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should validate owner parameter format', async () => {
      const request = createMockRequest('http://localhost:3000/api/github/commits?owner=&repo=test-repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate repo parameter format', async () => {
      const request = createMockRequest('http://localhost:3000/api/github/commits?owner=test-owner&repo=', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate per_page parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&per_page=200',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate page parameter is positive', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&page=0',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GitHub API interactions', () => {
    it('should call GitHub API with correct parameters', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&per_page=10&page=1'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'link': '',
        }),
        json: async () => [
          {
            sha: 'abc123',
            commit: {
              author: { name: 'Test User', email: 'test@example.com', date: '2024-01-01' },
              message: 'Test commit',
            },
            html_url: 'https://github.com/test-owner/test-repo/commit/abc123',
          },
        ],
      });

      await GET(request);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('repos/test-owner/test-repo/commits');
      expect(url).toContain('per_page=10');
      expect(url).toContain('page=1');
      expect(options.headers['User-Agent']).toBe('7zi-frontend/1.0');
      expect(options.headers['Accept']).toBe('application/vnd.github.v3+json');
    });

    it('should include GitHub token if configured', async () => {
      process.env.GITHUB_TOKEN = 'test-token';

      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      await GET(request);

      const [_, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('token test-token');

      delete process.env.GITHUB_TOKEN;
    });

    it('should handle 404 response from GitHub', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=nonexistent&repo=nonexistent'
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Not Found',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('NOT_FOUND');
    });

    it('should handle 401 unauthorized from GitHub', async () => {
      process.env.GITHUB_TOKEN = 'invalid-token';

      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Bad credentials',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('UNAUTHORIZED');

      delete process.env.GITHUB_TOKEN;
    });

    it('should handle 403 rate limit from GitHub', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({
          'x-ratelimit-reset': '1234567890',
        }),
        text: async () => 'API rate limit exceeded',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.error.message).toContain('rate limit');
    });

    it('should handle invalid JSON response from GitHub', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ not: 'an array' }),
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe('An internal error occurred');
      expect(data.error.details?.originalMessage).toContain('Invalid response format');
    });
  });

  describe('successful responses', () => {
    it('should return commits array', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&per_page=5'
      );

      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            author: { name: 'Test User 1', email: 'test1@example.com', date: '2024-01-01' },
            message: 'First commit',
          },
          html_url: 'https://github.com/test-owner/test-repo/commit/abc123',
        },
        {
          sha: 'def456',
          commit: {
            author: { name: 'Test User 2', email: 'test2@example.com', date: '2024-01-02' },
            message: 'Second commit',
          },
          html_url: 'https://github.com/test-owner/test-repo/commit/def456',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockCommits,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination).toEqual({
        page: 1,
        per_page: 5,
        total: 0,
      });
    });

    it('should include commit metadata', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [
          {
            sha: 'abc123',
            commit: {
              author: { name: 'Test User', email: 'test@example.com', date: '2024-01-01T00:00:00Z' },
              message: 'Test commit message',
            },
            html_url: 'https://github.com/test-owner/test-repo/commit/abc123',
          },
        ],
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data[0]).toHaveProperty('sha', 'abc123');
      expect(data.data[0]).toHaveProperty('commit');
      expect(data.data[0].commit.author).toHaveProperty('name');
      expect(data.data[0].commit.author).toHaveProperty('email');
      expect(data.data[0].commit.author).toHaveProperty('date');
      expect(data.data[0].commit).toHaveProperty('message');
      expect(data.data[0]).toHaveProperty('html_url');
    });

    it('should include timestamp', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });

    it('should filter commits by sha parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&sha=main'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      await GET(request);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('sha=main');
    });

    it('should filter commits by path parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&path=src/components'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      await GET(request);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('path=src%2Fcomponents');
    });

    it('should filter commits by date range', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&since=2024-01-01&until=2024-01-31'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      await GET(request);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('since=2024-01-01');
      expect(url).toContain('until=2024-01-31');
    });
  });

  describe('pagination', () => {
    it('should support page parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&page=3'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      await GET(request);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=3');
    });

    it('should default to page 1 if not specified', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.page).toBe(1);
    });

    it('should default to per_page 30 if not specified', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.per_page).toBe(30);
    });

    it('should respect per_page maximum of 100', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo&per_page=100'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.per_page).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle empty commits array', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('should handle fetch errors', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/commits?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('INTERNAL_ERROR');
    });
  });
});
