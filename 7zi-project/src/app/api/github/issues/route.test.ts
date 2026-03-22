/**
 * GitHub Issues API Integration Tests
 * GET /api/github/issues
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { createMockRequest, TEST_URLS } from '@/test/mocks/api-mocks';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GET /api/github/issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request validation', () => {
    it('should validate required parameters (owner, repo)', async () => {
      const request = createMockRequest('http://localhost:3000/api/github/issues', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.type).toBe('VALIDATION_ERROR');
    });

    it('should validate owner parameter format', async () => {
      const request = createMockRequest('http://localhost:3000/api/github/issues?owner=&repo=test-repo', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate repo parameter format', async () => {
      const request = createMockRequest('http://localhost:3000/api/github/issues?owner=test-owner&repo=', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate per_page parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&per_page=200',
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
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&page=0',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate state parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&state=invalid'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate sort parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&sort=invalid'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should validate direction parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&direction=invalid'
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
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&per_page=10&page=1'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'link': '',
        }),
        json: async () => [
          {
            id: 1,
            number: 123,
            title: 'Test Issue',
            state: 'open',
            user: {
              login: 'testuser',
              avatar_url: 'https://github.com/testuser.png',
            },
            labels: [],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/test-owner/test-repo/issues/123',
          },
        ],
      });

      await GET(request);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('repos/test-owner/test-repo/issues');
      expect(url).toContain('per_page=10');
      expect(url).toContain('page=1');
      expect(options.headers['User-Agent']).toBe('7zi-frontend/1.0');
      expect(options.headers['Accept']).toBe('application/vnd.github.v3+json');
    });

    it('should include GitHub token if configured', async () => {
      process.env.GITHUB_TOKEN = 'test-token';

      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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
        'http://localhost:3000/api/github/issues?owner=nonexistent&repo=nonexistent'
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
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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
    it('should return issues array', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&per_page=5'
      );

      const mockIssues = [
        {
          id: 1,
          number: 123,
          title: 'First Issue',
          state: 'open',
          user: {
            login: 'testuser1',
            avatar_url: 'https://github.com/testuser1.png',
          },
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/123',
        },
        {
          id: 2,
          number: 124,
          title: 'Second Issue',
          state: 'closed',
          user: {
            login: 'testuser2',
            avatar_url: 'https://github.com/testuser2.png',
          },
          labels: [],
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/124',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockIssues,
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

    it('should include issue metadata', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [
          {
            id: 1,
            number: 123,
            title: 'Test Issue',
            state: 'open',
            user: {
              login: 'testuser',
              avatar_url: 'https://github.com/testuser.png',
            },
            labels: [
              { name: 'bug', color: 'd73a4a' },
              { name: 'enhancement', color: 'a2eeef' },
            ],
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            html_url: 'https://github.com/test-owner/test-repo/issues/123',
          },
        ],
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data[0]).toHaveProperty('id', 1);
      expect(data.data[0]).toHaveProperty('number', 123);
      expect(data.data[0]).toHaveProperty('title', 'Test Issue');
      expect(data.data[0]).toHaveProperty('state', 'open');
      expect(data.data[0]).toHaveProperty('user');
      expect(data.data[0].user).toHaveProperty('login');
      expect(data.data[0].user).toHaveProperty('avatar_url');
      expect(data.data[0]).toHaveProperty('labels');
      expect(Array.isArray(data.data[0].labels)).toBe(true);
      expect(data.data[0].labels[0]).toHaveProperty('name');
      expect(data.data[0].labels[0]).toHaveProperty('color');
      expect(data.data[0]).toHaveProperty('created_at');
      expect(data.data[0]).toHaveProperty('updated_at');
      expect(data.data[0]).toHaveProperty('html_url');
    });

    it('should include timestamp', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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

    it('should filter issues by state parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&state=closed'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      await GET(request);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('state=closed');
    });

    it('should filter issues by labels parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&labels=bug,enhancement'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      await GET(request);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('labels=bug%2Cenhancement');
    });

    it('should sort issues by parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&sort=comments&direction=desc'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => [],
      });

      await GET(request);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('sort=comments');
      expect(url).toContain('direction=desc');
    });

    it('should filter issues by date', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&since=2024-01-01'
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
    });

    it('should filter out pull requests from results', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
      );

      const mockMixedResults = [
        {
          id: 1,
          number: 123,
          title: 'Issue',
          state: 'open',
          user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/123',
        },
        {
          id: 2,
          number: 124,
          title: 'Pull Request',
          state: 'open',
          user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/pull/124',
          pull_request: {
            html_url: 'https://github.com/test-owner/test-repo/pull/124',
          },
        },
        {
          id: 3,
          number: 125,
          title: 'Another Issue',
          state: 'closed',
          user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
          labels: [],
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/125',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockMixedResults,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(2); // Should filter out the PR
      expect(data.data.every((issue: { pull_request?: { html_url: string } }) => !issue.pull_request)).toBe(true);
    });
  });

  describe('pagination', () => {
    it('should support page parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&page=3'
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
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo&per_page=100'
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
    it('should handle empty issues array', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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

    it('should handle all results being pull requests', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
      );

      const mockOnlyPRs = [
        {
          id: 1,
          number: 124,
          title: 'Pull Request 1',
          state: 'open',
          user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
          labels: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/pull/124',
          pull_request: { html_url: 'https://github.com/test-owner/test-repo/pull/124' },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockOnlyPRs,
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
    });

    it('should handle fetch errors', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/github/issues?owner=test-owner&repo=test-repo'
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
