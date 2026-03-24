/**
 * GitHub Helper Tests
 * Tests for GitHub API proxy utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleGitHubError,
  fetchFromGitHub,
  fetchGitHubCommits,
  fetchGitHubIssues,
  fetchGitHubIssue,
} from '../github-helper';

describe('GitHub Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('handleGitHubError', () => {
    it('should return 404 error for not found', () => {
      const mockResponse = {
        status: 404,
        statusText: 'Not Found',
      } as Response;

      const response = handleGitHubError(mockResponse, 'owner', 'repo');

      expect(response.status).toBe(404);
    });

    it('should return 401 error for unauthorized', () => {
      const mockResponse = {
        status: 401,
        statusText: 'Unauthorized',
      } as Response;

      const response = handleGitHubError(mockResponse, 'owner', 'repo');

      expect(response.status).toBe(401);
    });

    it('should return 403 error for rate limit', () => {
      const mockResponse = {
        status: 403,
        statusText: 'Forbidden',
      } as Response;

      const response = handleGitHubError(mockResponse, 'owner', 'repo');

      expect(response.status).toBe(403);
    });

    it('should return 422 error for validation', () => {
      const mockResponse = {
        status: 422,
        statusText: 'Unprocessable Entity',
      } as Response;

      const response = handleGitHubError(mockResponse, 'owner', 'repo');

      expect(response.status).toBe(422);
    });

    it('should return generic error with status for other codes', () => {
      const mockResponse = {
        status: 500,
        statusText: 'Internal Server Error',
      } as Response;

      const response = handleGitHubError(mockResponse, 'owner', 'repo');

      expect(response.status).toBe(500);
    });

    it('should include endpoint in error message when provided', async () => {
      const mockResponse = {
        status: 404,
        statusText: 'Not Found',
      } as Response;

      const response = handleGitHubError(mockResponse, 'owner', 'repo', '/issues/123');
      const body = await response.json();

      expect(body.error).toContain('(/issues/123)');
    });
  });

  describe('fetchFromGitHub', () => {
    it('should make request with correct headers', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      const result = await fetchFromGitHub('/test/endpoint');

      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com/test/endpoint'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': '7zi-frontend/1.0',
          }),
        })
      );
    });

    it('should include authorization header when token is provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await fetchFromGitHub('/test/endpoint', { token: 'test-token' });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token test-token',
          }),
        })
      );
    });

    it('should use default owner from env var', async () => {
      vi.stubEnv('NEXT_PUBLIC_GITHUB_OWNER', 'custom-owner');
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await fetchFromGitHub('/test/endpoint');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('owner=custom-owner'),
        expect.any(Object)
      );
    });

    it('should use custom owner when provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await fetchFromGitHub('/test/endpoint', { owner: 'custom-owner' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('owner=custom-owner'),
        expect.any(Object)
      );
    });

    it('should use default repo from env var', async () => {
      vi.stubEnv('NEXT_PUBLIC_GITHUB_REPO', 'custom-repo');
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await fetchFromGitHub('/test/endpoint');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('repo=custom-repo'),
        expect.any(Object)
      );
    });

    it('should include per_page parameter', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await fetchFromGitHub('/test/endpoint', { perPage: 50 });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=50'),
        expect.any(Object)
      );
    });

    it('should include state parameter when provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await fetchFromGitHub('/test/endpoint', { state: 'open' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('state=open'),
        expect.any(Object)
      );
    });

    it('should include since parameter when provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await fetchFromGitHub('/test/endpoint', {
        since: '2024-01-01T00:00:00Z',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('since=2024-01-01T00%3A00%3A00Z'),
        expect.any(Object)
      );
    });

    it('should include until parameter when provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      await fetchFromGitHub('/test/endpoint', {
        until: '2024-12-31T23:59:59Z',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('until=2024-12-31T23%3A59%3A59Z'),
        expect.any(Object)
      );
    });

    it('should return error response when request fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await fetchFromGitHub('/test/endpoint');

      expect(result.status).toBe(404);
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchFromGitHub('/test/endpoint');

      expect(result.status).toBe(500);
    });
  });

  describe('fetchGitHubCommits', () => {
    it('should call fetchFromGitHub with commits endpoint', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await fetchGitHubCommits({ owner: 'test-owner', repo: 'test-repo' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/test-owner/test-repo/commits'),
        expect.any(Object)
      );
    });

    it('should pass through options to fetchFromGitHub', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await fetchGitHubCommits({
        perPage: 10,
        state: 'closed',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('per_page=10'),
        expect.any(Object)
      );
    });
  });

  describe('fetchGitHubIssues', () => {
    it('should filter out pull requests from response', async () => {
      const mockData = [
        { id: 1, title: 'Issue 1' },
        { id: 2, title: 'PR 1', pull_request: {} },
        { id: 3, title: 'Issue 2' },
        { id: 4, title: 'PR 2', pull_request: { id: 123 } },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await fetchGitHubIssues();

      expect(result.status).toBe(200);
      const body = await result.json();

      expect(body).toHaveLength(2);
      expect(body[0].id).toBe(1);
      expect(body[1].id).toBe(3);
    });

    it('should return empty array when all items are PRs', async () => {
      const mockData = [
        { id: 1, title: 'PR 1', pull_request: {} },
        { id: 2, title: 'PR 2', pull_request: { id: 123 } },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await fetchGitHubIssues();
      const body = await result.json();

      expect(body).toHaveLength(0);
    });

    it('should pass through options to fetchFromGitHub', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await fetchGitHubIssues({
        owner: 'test-owner',
        repo: 'test-repo',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/test-owner/test-repo/issues'),
        expect.any(Object)
      );
    });

    it('should return error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await fetchGitHubIssues();

      expect(result.status).toBe(404);
    });
  });

  describe('fetchGitHubIssue', () => {
    it('should fetch single issue by number', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 123, title: 'Test Issue' }),
      } as Response);

      const result = await fetchGitHubIssue(123);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/songzhuo/openclaw-workspace/issues/123',
        expect.any(Object)
      );
      expect(result.status).toBe(200);
    });

    it('should use custom owner and repo when provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 123 }),
      } as Response);

      await fetchGitHubIssue(123, {
        owner: 'custom-owner',
        repo: 'custom-repo',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/custom-owner/custom-repo/issues/123',
        expect.any(Object)
      );
    });

    it('should include authorization header when token is provided', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 123 }),
      } as Response);

      await fetchGitHubIssue(123, { token: 'test-token' });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token test-token',
          }),
        })
      );
    });

    it('should return error response when issue not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await fetchGitHubIssue(999);

      expect(result.status).toBe(404);
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchGitHubIssue(123);

      expect(result.status).toBe(500);
    });
  });
});
