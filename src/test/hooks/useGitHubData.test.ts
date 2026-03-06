/**
 * @fileoverview useGitHubData hook tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGitHubData } from '../../hooks/useGitHubData';

// Mock fetch globally
global.fetch = vi.fn();

describe('useGitHubData', () => {
  const mockOwner = 'test-owner';
  const mockRepo = 'test-repo';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useGitHubData(mockOwner, mockRepo));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches GitHub data successfully', async () => {
    const mockData = {
      commits: [
        { id: 'abc123', message: 'Test commit', author: 'Test Author', date: '2024-01-01' }
      ],
      issues: [
        { id: 1, title: 'Test issue', state: 'open', number: 1 }
      ],
      stats: {
        stars: 100,
        forks: 50,
        watchers: 25
      }
    };

    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => useGitHubData(mockOwner, mockRepo));

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors', async () => {
    (global.fetch as vi.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useGitHubData(mockOwner, mockRepo));

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('refetches data when called', async () => {
    const mockData = {
      commits: [],
      issues: [],
      stats: { stars: 0, forks: 0, watchers: 0 }
    };

    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => useGitHubData(mockOwner, mockRepo));

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledTimes(1);

    result.current.refetch();

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not fetch when owner or repo is empty', async () => {
    const { result } = renderHook(() => useGitHubData('', ''));

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});