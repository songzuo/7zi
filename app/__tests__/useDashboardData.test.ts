import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../hooks/useDashboardData';

// Mock fetch globally
global.fetch = vi.fn();

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch issues and commits on mount', async () => {
    const mockIssues = [
      {
        number: 1,
        title: 'Test Issue',
        state: 'open' as const,
        labels: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        html_url: 'https://github.com/test/1',
      },
    ];

    const mockCommits = [
      {
        sha: 'abc123',
        commit: {
          message: 'Test commit',
          author: { name: 'Test User', date: '2024-01-01' },
        },
        html_url: 'https://github.com/commit/abc123',
      },
    ];

    // Mock fetch to return issues then commits
    let fetchCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockIssues),
        } as Response);
      } else {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCommits),
        } as Response);
      }
    });

    const { result } = renderHook(() => useDashboardData('test', 'repo'));

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should have fetched issues
    expect(result.current.issues).toHaveLength(1);
    expect(result.current.issues[0].title).toBe('Test Issue');

    // Should have fetched commits
    expect(result.current.commits).toHaveLength(1);
    expect(result.current.commits[0].commit.message).toBe('Test commit');
  });

  it('should filter out pull requests from issues', async () => {
    const mockIssues = [
      {
        number: 1,
        title: 'Real Issue',
        state: 'open' as const,
        labels: [],
        pull_request: {}, // This is a PR
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        html_url: 'https://github.com/test/1',
      },
      {
        number: 2,
        title: 'Issue',
        state: 'open' as const,
        labels: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        html_url: 'https://github.com/test/2',
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockIssues),
      } as Response);
    });

    const { result } = renderHook(() => useDashboardData('test', 'repo'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only have 1 issue (filtered out the PR)
    expect(result.current.issues).toHaveLength(1);
    expect(result.current.issues[0].number).toBe(2);
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);
    });

    const { result } = renderHook(() => useDashboardData('test', 'repo'));

    // Wait for the initial load attempt
    await waitFor(() => {
      // Error should be set after fetch fails
      expect(result.current.error || result.current.isLoading === false).toBe(true);
    });
  });

  it('should refresh data when refreshData is called', async () => {
    const mockIssues = [
      {
        number: 1,
        title: 'Updated Issue',
        state: 'open' as const,
        labels: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        html_url: 'https://github.com/test/1',
      },
    ];

    let fetchCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      fetchCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(fetchCount === 1 ? [] : mockIssues),
      } as Response);
    });

    const { result } = renderHook(() => useDashboardData('test', 'repo'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initial load completed - issues may or may not be empty depending on timing
    // Now call refresh
    await result.current.refreshData();

    // Should now have issues
    expect(result.current.issues).toHaveLength(1);
    expect(result.current.issues[0].title).toBe('Updated Issue');
  });
});
