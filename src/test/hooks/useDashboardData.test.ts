/**
 * @fileoverview useDashboardData hook tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardData } from '../../hooks/useDashboardData';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('fetches data successfully', async () => {
    const mockIssues = [
      { number: 1, title: 'Issue 1', state: 'open', labels: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: 'https://github.com/test/test/issues/1' },
    ];
    const mockCommits = [
      { sha: 'abc123', commit: { message: 'Test', author: { name: 'Test', date: new Date().toISOString() } }, html_url: 'https://github.com/test/test/commit/abc123' },
    ];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockIssues })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCommits });

    const { result } = renderHook(() => useDashboardData('owner', 'repo'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.issues).toHaveLength(1);
    expect(result.current.commits).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDashboardData('owner', 'repo'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.error).not.toBeNull();
  });

  it('handles HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    });

    const { result } = renderHook(() => useDashboardData('owner', 'repo'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(result.current.error).not.toBeNull();
  });

  it('refreshes data when refreshData is called', async () => {
    const mockIssues: unknown[] = [];
    const mockCommits: unknown[] = [];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockIssues })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCommits });

    const { result } = renderHook(() => useDashboardData('owner', 'repo'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Reset mock for refresh calls
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockIssues })
      .mockResolvedValueOnce({ ok: true, json: async () => mockCommits });

    // Call refreshData wrapped in act
    await act(async () => {
      await result.current.refreshData();
    });

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });
});