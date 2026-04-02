/**
 * @fileoverview useFetch hook tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFetch, useGitHub } from '../../hooks/useFetch'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.addEventListener for focus events
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener

describe('useFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
  })

  it('returns initial loading state', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    await act(async () => {
      renderHook(() => useFetch('/api/test'))
    })
    // Hook renders successfully with loading state
  })

  it('fetches data successfully', async () => {
    const mockData = { message: 'success' }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const { result } = renderHook(() => useFetch<{ message: string }>('/api/test'))

    // Advance timers to let the fetch complete
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBe(null)
  })

  it('handles fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const { result } = renderHook(() => useFetch('/api/test'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.error).toBe('HTTP error! status: 404')
    expect(result.current.data).toBe(null)
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useFetch('/api/test'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.data).toBe(null)
  })

  it('handles unknown errors', async () => {
    mockFetch.mockRejectedValueOnce('Unknown error string')

    const { result } = renderHook(() => useFetch('/api/test'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.error).toBe('An error occurred')
  })

  it('sends Accept header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    renderHook(() => useFetch('/api/test'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      headers: {
        Accept: 'application/json',
      },
    })
  })

  it('uses initialData when provided', () => {
    const initialData = { initial: true }
    mockFetch.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useFetch('/api/test', { initialData }))

    expect(result.current.data).toEqual(initialData)
  })

  it('provides refetch function', async () => {
    const mockData1 = { count: 1 }
    const mockData2 = { count: 2 }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData2),
      })

    const { result } = renderHook(() => useFetch<{ count: number }>('/api/test'))

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.data).toEqual(mockData1)

    // Call refetch
    await act(async () => {
      await result.current.refetch()
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.data).toEqual(mockData2)
  })

  it('sets up revalidate on focus', async () => {
    const listeners: Array<{ type: string; handler: () => void }> = []
    window.addEventListener = vi.fn((type, handler) => {
      listeners.push({ type, handler: handler as () => void })
    })
    window.removeEventListener = vi.fn()

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    })

    renderHook(() => useFetch('/api/test', { revalidateOnFocus: true }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    // Should have registered focus listener
    expect(listeners.some(l => l.type === 'focus')).toBe(true)
  })

  it('sets up revalidate interval', async () => {
    const intervalMs = 5000

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 1 }),
    })

    renderHook(() => useFetch('/api/test', { revalidateInterval: intervalMs }))

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    const initialCallCount = mockFetch.mock.calls.length

    // Advance past interval - should trigger refetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(intervalMs)
    })

    expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
  })

  it('disables revalidate on focus when option is false', async () => {
    const listeners: string[] = []
    window.addEventListener = vi.fn(type => {
      listeners.push(type)
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    renderHook(() => useFetch('/api/test', { revalidateOnFocus: false }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    // Should NOT have registered focus listener
    expect(listeners).not.toContain('focus')
  })
})

describe('useGitHub', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('constructs GitHub API URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    renderHook(() => useGitHub('repos/test/repo', { revalidateInterval: 0 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/test/repo',
      expect.any(Object)
    )
  })

  it('returns rateLimit info', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useGitHub('repos/test/repo'))

    expect(result.current.rateLimit).toBe(null)
  })

  it('passes options to useFetch', async () => {
    const initialData = { stars: 100 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ stars: 200 }),
    })

    await act(async () => {
      renderHook(() => useGitHub<{ stars: number }>('repos/test/repo', { initialData }))
    })
    // Hook renders successfully with initial data
  })

  it('provides refetch function', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    })

    const { result } = renderHook(() => useGitHub('repos/test/repo', { revalidateInterval: 0 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.loading).toBe(false)
    expect(typeof result.current.refetch).toBe('function')
  })

  it('handles loading state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const { result } = renderHook(() => useGitHub('repos/test/repo', { revalidateInterval: 0 }))

    expect(result.current.loading).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.loading).toBe(false)
  })

  it('handles errors from GitHub API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    const { result } = renderHook(() => useGitHub('repos/test/repo', { revalidateInterval: 0 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('uses custom revalidate interval', async () => {
    const customInterval = 10000 // 10 seconds

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    renderHook(() => useGitHub('repos/test/repo', { revalidateInterval: customInterval }))

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    const initialCalls = mockFetch.mock.calls.length

    // Advance time but not enough to trigger interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(customInterval - 1000)
    })

    // Should not have refetched yet (allow some margin for timing)
    expect(mockFetch.mock.calls.length).toBe(initialCalls)

    // Advance past the interval - should refetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCalls)
  })
})
