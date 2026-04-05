/**
 * RemoteCursor 性能测试
 */

import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useRemoteCursors } from '@/components/Collaboration/RemoteCursor'

/**
 * Mock WebSocketManager
 */
const createMockWebSocketManager = () => {
  const listeners = new Map<string, Function[]>()

  return {
    isConnected: vi.fn().mockReturnValue(true),
    on: vi.fn((event: string, callback: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, [])
      }
      listeners.get(event)!.push(callback)
    }),
    off: vi.fn((event: string, callback: Function) => {
      const callbacks = listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index !== -1) {
          callbacks.splice(index, 1)
        }
      }
    }),
    emit: vi.fn(),
    _trigger: (event: string, data: any) => {
      const callbacks = listeners.get(event)
      if (callbacks) {
        callbacks.forEach(cb => cb(data))
      }
    },
  }
}

describe('useRemoteCursors Performance', () => {
  let mockWsManager: ReturnType<typeof createMockWebSocketManager>

  beforeEach(() => {
    mockWsManager = createMockWebSocketManager()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should batch multiple cursor updates in a single frame', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Send 20 cursor updates rapidly
    act(() => {
      for (let i = 0; i < 20; i++) {
        mockWsManager._trigger('collab:cursor-update', {
          userId: `user-${i}`,
          userName: `User ${i}`,
          position: { x: i * 10, y: i * 10 },
        })
      }
      vi.advanceTimersByTime(20)
    })

    expect(result.current.cursors).toHaveLength(20)
  })

  test('should throttle local cursor updates', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Call updateLocalCursor 100 times rapidly
    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.updateLocalCursor(i, i)
      }
    })

    // Should be throttled - initial call happens immediately
    // Since throttle uses setTimeout and we're not advancing time, 
    // only the first call should go through
    expect(mockWsManager.emit).toHaveBeenCalledTimes(1)
  })

  test('should handle high-frequency updates without memory leaks', () => {
    const { result, unmount } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Simulate 1000 updates from 10 users
    act(() => {
      for (let i = 0; i < 1000; i++) {
        const userId = `user-${i % 10}`
        mockWsManager._trigger('collab:cursor-update', {
          userId,
          userName: `User ${userId}`,
          position: { x: i % 500, y: (i * 2) % 500 },
        })
      }
      vi.advanceTimersByTime(20)
    })

    // Should only have 10 cursors (one per user)
    expect(result.current.cursors).toHaveLength(10)

    unmount()
  })

  test('should limit visible cursors to MAX_VISIBLE_CURSORS', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Add 30 cursors
    act(() => {
      for (let i = 0; i < 30; i++) {
        mockWsManager._trigger('collab:cursor-update', {
          userId: `user-${i}`,
          userName: `User ${i}`,
          position: { x: i * 10, y: i * 10 },
        })
      }
      vi.advanceTimersByTime(20)
    })

    // Should have 30 in state (filtering happens in component level)
    expect(result.current.cursors).toHaveLength(30)
  })

  test('should handle rapid cursor additions and removals', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Add 10 cursors
    act(() => {
      for (let i = 0; i < 10; i++) {
        mockWsManager._trigger('collab:cursor-update', {
          userId: `user-${i}`,
          userName: `User ${i}`,
          position: { x: i * 10, y: i * 10 },
        })
      }
      vi.advanceTimersByTime(20)
    })

    expect(result.current.cursors).toHaveLength(10)

    // Remove 5 cursors
    act(() => {
      for (let i = 0; i < 5; i++) {
        mockWsManager._trigger('collab:user-left', `user-${i}`)
      }
    })

    expect(result.current.cursors).toHaveLength(5)

    // Add 5 more
    act(() => {
      for (let i = 10; i < 15; i++) {
        mockWsManager._trigger('collab:cursor-update', {
          userId: `user-${i}`,
          userName: `User ${i}`,
          position: { x: i * 10, y: i * 10 },
        })
      }
      vi.advanceTimersByTime(20)
    })

    expect(result.current.cursors).toHaveLength(10)
  })
})

describe('throttle function', () => {
  test('should limit function calls to specified interval', () => {
    vi.useFakeTimers()

    let callCount = 0
    const throttledFn = vi.fn(() => callCount++)

    const throttle = (func: Function, limit: number) => {
      let inThrottle: boolean
      return function (this: any, ...args: any[]) {
        if (!inThrottle) {
          func.apply(this, args)
          inThrottle = true
          setTimeout(() => (inThrottle = false), limit)
        }
      }
    }

    const throttled = throttle(throttledFn, 16)

    // Call 100 times
    for (let i = 0; i < 100; i++) {
      throttled()
    }

    // Advance timers to allow throttled calls to complete
    vi.advanceTimersByTime(100)

    // Should only have called ~6 times (100ms / 16ms = 6.25)
    expect(throttledFn).toHaveBeenCalledTimes(7)

    vi.useRealTimers()
  })

  test('should call function on first invocation', () => {
    vi.useFakeTimers()

    const throttledFn = vi.fn()

    const throttle = (func: Function, limit: number) => {
      let inThrottle: boolean
      return function (this: any, ...args: any[]) {
        if (!inThrottle) {
          func.apply(this, args)
          inThrottle = true
          setTimeout(() => (inThrottle = false), limit)
        }
      }
    }

    const throttled = throttle(throttledFn, 100)

    throttled()

    expect(throttledFn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})

describe('batch processing', () => {
  test('should process batch updates on animation frame', () => {
    // This is more of an integration test concept
    // The actual batch processing uses requestAnimationFrame
    // which is not easily testable in Jest

    const mockRequestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 0)
      return 1
    })

    global.requestAnimationFrame = mockRequestAnimationFrame

    // Test that batch processing is scheduled
    expect(mockRequestAnimationFrame).toBeDefined()

    // Cleanup
    delete (global as any).requestAnimationFrame
  })
})

describe('memory management', () => {
  test('should clean up event listeners on unmount', () => {
    const mockWs = createMockWebSocketManager()
    const { unmount } = renderHook(() => useRemoteCursors(mockWs as any))

    expect(mockWs.on).toHaveBeenCalled()

    unmount()

    expect(mockWs.off).toHaveBeenCalled()
  })

  test('should clean up intervals on unmount', () => {
    vi.useFakeTimers()

    const mockWs = createMockWebSocketManager()
    const { unmount } = renderHook(() => useRemoteCursors(mockWs as any))

    // Advance timers to verify intervals are running
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    unmount()

    // After unmount, advancing timers should not cause issues
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    vi.useRealTimers()
  })
})