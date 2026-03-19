/**
 * @fileoverview useGitHubData hook tests
 */
import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGitHubData } from '../../hooks/useGitHubData';

// Mock fetch globally
const fetchMock = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = fetchMock;

// Helper to create mock Response
function createMockResponse(data: any, ok: boolean = true, status: number = 200, statusText: string = 'OK') {
  return {
    ok,
    status,
    statusText,
    headers: new Headers(),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

describe('useGitHubData', () => {
  const mockOwner = 'test-owner';
  const mockRepo = 'test-repo';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with loading state', () => {
    (global.fetch as MockedFunction<typeof fetch>).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval: 0, // Disable auto-refresh for tests
    }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.issues).toEqual([]);
    expect(result.current.commits).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches GitHub data successfully', async () => {
    const mockRepoData = {
      stargazers_count: 100,
      forks_count: 50,
      open_issues_count: 25,
    };

    const mockIssues = [
      { number: 1, title: 'Test issue', state: 'open', html_url: 'https://github.com/test/test/issues/1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', assignee: null, labels: [] }
    ];

    const mockCommits = [
      { sha: 'abc123', commit: { message: 'Test commit', author: { name: 'Test Author', date: '2024-01-01T00:00:00Z' } }, html_url: 'https://github.com/test/test/commit/abc123', author: { avatar_url: 'https://example.com/avatar.png', login: 'testuser' } }
    ];

    (global.fetch as MockedFunction<typeof fetch>)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockIssues), { status: 200, headers: {} }))      // Issues
      .mockResolvedValueOnce(new Response(JSON.stringify(mockCommits), { status: 200, headers: {} }))     // Commits
      .mockResolvedValueOnce(new Response(JSON.stringify(mockRepoData), { status: 200, headers: {} }));   // Stats

    const { result } = renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval: 0, // Disable auto-refresh for tests
    }));

    // Advance timers to let fetches complete
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.stats).toEqual({
      stars: 100,
      forks: 50,
      openIssues: 25,
    });
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors gracefully with fallback to empty data', async () => {
    // The hook catches errors for individual fetches and falls back to empty data
    (global.fetch as MockedFunction<typeof fetch>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval: 0,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Hook uses .catch() to gracefully handle errors, returning empty data
    expect(result.current.isLoading).toBe(false);
    expect(result.current.issues).toEqual([]);
    expect(result.current.commits).toEqual([]);
    expect(result.current.stats).toBeNull(); // null from catch fallback
  });

  it('handles 404 errors gracefully', async () => {
    // The hook catches errors for individual fetches and falls back
    (global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const { result } = renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval: 0,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Hook handles errors gracefully - may have error from one of the fetches
    expect(result.current.isLoading).toBe(false);
    // Error could be set if any fetch threw during the try block
    // Since fetchIssues/Commits/Stats all catch internally, error stays null
    expect(result.current.error).toBeNull();
  });

  it('handles 403 rate limit errors gracefully', async () => {
    // The hook catches errors for individual fetches
    (global.fetch as MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response);

    const { result } = renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval: 0,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isLoading).toBe(false);
    // Hook catches errors internally with .catch()
    expect(result.current.error).toBeNull();
  });

  it('provides refetch function', async () => {
    const mockRepoData = {
      stargazers_count: 100,
      forks_count: 50,
      open_issues_count: 25,
    };

    (global.fetch as MockedFunction<typeof fetch>)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))       // Issues (first call)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))       // Commits (first call)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockRepoData), { status: 200, headers: {} })) // Stats (first call)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))       // Issues (refetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))       // Commits (refetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockRepoData), { status: 200, headers: {} })); // Stats (refetch)

    const { result } = renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval: 0,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(global.fetch).toHaveBeenCalledTimes(3); // Issues, Commits, Stats

    // Call refetch
    await act(async () => {
      await result.current.refresh();
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(global.fetch).toHaveBeenCalledTimes(6); // 3 more calls
  });

  it('fetches even when owner or repo is empty (hook does not guard)', async () => {
    // The hook doesn't check for empty owner/repo - it just makes the request
    (global.fetch as MockedFunction<typeof fetch>)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ stargazers_count: 0, forks_count: 0, open_issues_count: 0 }), { status: 200, headers: {} }));

    const { result } = renderHook(() => useGitHubData({
      owner: '',
      repo: '',
      refreshInterval: 0,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Hook makes the request even with empty owner/repo
    expect(global.fetch).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('includes authorization header when token provided', async () => {
    const mockToken = 'test-token-123';

    (global.fetch as MockedFunction<typeof fetch>)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ stargazers_count: 0, forks_count: 0, open_issues_count: 0 }), { status: 200, headers: {} }));

    renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      token: mockToken,
      refreshInterval: 0,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Check that Authorization header was included
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `token ${mockToken}`,
        }),
      })
    );
  });

  it('sets up auto-refresh interval', async () => {
    const refreshInterval = 10000; // 10 seconds

    (global.fetch as MockedFunction<typeof fetch>)
      .mockResolvedValue({ ok: true, json: async () => [] } as Response);

    renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval,
    }));

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const initialCallCount = (global.fetch as MockedFunction<typeof fetch>).mock.calls.length;

    // Advance time by refresh interval - should trigger another fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(refreshInterval);
    });

    // Should have triggered another fetch (3 more calls for issues/commits/stats)
    expect((global.fetch as MockedFunction<typeof fetch>).mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('returns activities merged from issues and commits', async () => {
    const mockRepoData = {
      stargazers_count: 100,
      forks_count: 50,
      open_issues_count: 25,
    };

    const mockIssues = [
      { 
        number: 1, 
        title: 'Test issue', 
        state: 'open', 
        html_url: 'https://github.com/test/test/issues/1', 
        created_at: '2024-01-01T12:00:00Z', 
        updated_at: '2024-01-01T12:00:00Z', 
        assignee: { login: 'user1', avatar_url: 'https://example.com/user1.png' }, 
        labels: [] 
      }
    ];

    const mockCommits = [
      { 
        sha: 'abc123', 
        commit: { 
          message: 'Test commit message', 
          author: { name: 'Test Author', date: '2024-01-01T13:00:00Z' } 
        }, 
        html_url: 'https://github.com/test/test/commit/abc123', 
        author: { avatar_url: 'https://example.com/avatar.png', login: 'testuser' } 
      }
    ];

    (global.fetch as MockedFunction<typeof fetch>)
      .mockResolvedValueOnce(new Response(JSON.stringify(mockIssues), { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockCommits), { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockRepoData), { status: 200, headers: {} }));

    const { result } = renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval: 0,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.activities.length).toBeGreaterThan(0);
    // Activities should be sorted by timestamp (newest first)
    // Commit is at 13:00, Issue is at 12:00, so commit should be first
    expect(result.current.activities[0].type).toBe('commit');
  });

  it('provides lastUpdated timestamp after successful fetch', async () => {
    const mockRepoData = {
      stargazers_count: 100,
      forks_count: 50,
      open_issues_count: 25,
    };

    (global.fetch as MockedFunction<typeof fetch>)
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200, headers: {} }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockRepoData), { status: 200, headers: {} }));

    const { result } = renderHook(() => useGitHubData({
      owner: mockOwner,
      repo: mockRepo,
      refreshInterval: 0,
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });
});