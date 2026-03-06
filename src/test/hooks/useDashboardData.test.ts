/**
 * @fileoverview useDashboardData hook tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardData } from '../../hooks/useDashboardData';

// Mock fetch globally
global.fetch = vi.fn();

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches data successfully', async () => {
    const mockData = {
      projects: [
        { id: 1, name: 'Project 1', status: 'active' },
        { id: 2, name: 'Project 2', status: 'completed' }
      ],
      stats: {
        total: 10,
        active: 5,
        completed: 3,
        pending: 2
      }
    };

    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => useDashboardData());

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors', async () => {
    (global.fetch as vi.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDashboardData());

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('handles HTTP errors', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const { result } = renderHook(() => useDashboardData());

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it('refetches data when called', async () => {
    const mockData = { projects: [], stats: { total: 0, active: 0, completed: 0, pending: 0 } };

    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => useDashboardData());

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Call refetch
    result.current.refetch();

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});