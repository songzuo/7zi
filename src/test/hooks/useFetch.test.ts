/**
 * @fileoverview useFetch hook tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFetch, useGitHub } from '../../hooks/useFetch';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useFetch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('returns initial loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useFetch('/api/test'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('fetches data successfully', async () => {
    const mockData = { message: 'success' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useFetch<{ message: string }>('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
  });

  it('handles fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useFetch('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('HTTP error! status: 404');
    expect(result.current.data).toBe(null);
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFetch('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBe(null);
  });

  it('handles unknown errors', async () => {
    mockFetch.mockRejectedValueOnce('Unknown error string');

    const { result } = renderHook(() => useFetch('/api/test'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('An error occurred');
  });

  it('sends Accept header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderHook(() => useFetch('/api/test'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          Accept: 'application/json',
        },
      });
    });
  });

  it('uses initialData when provided', () => {
    const initialData = { initial: true };
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() =>
      useFetch('/api/test', { initialData })
    );

    expect(result.current.data).toEqual(initialData);
  });

  it('provides refetch function', async () => {
    const mockData1 = { count: 1 };
    const mockData2 = { count: 2 };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData2),
      });

    const { result } = renderHook(() => useFetch<{ count: number }>('/api/test'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });
  });
});

describe('useGitHub', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('constructs GitHub API URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    renderHook(() => useGitHub('repos/test/repo'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/test/repo',
        expect.any(Object)
      );
    });
  });

  it('returns rateLimit info', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useGitHub('repos/test/repo'));

    expect(result.current.rateLimit).toBe(null);
  });

  it('passes options to useFetch', async () => {
    const initialData = { stars: 100 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ stars: 200 }),
    });

    const { result } = renderHook(() =>
      useGitHub<{ stars: number }>('repos/test/repo', { initialData })
    );

    // Should have initial data immediately
    expect(result.current.data).toEqual(initialData);
  });

  it('provides refetch function', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    });

    const { result } = renderHook(() => useGitHub('repos/test/repo'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });

  it('handles loading state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useGitHub('repos/test/repo'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('handles errors from GitHub API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const { result } = renderHook(() => useGitHub('repos/test/repo'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});