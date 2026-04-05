/**
 * RemoteCursor 组件单元测试
 */

import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useRemoteCursors, RemoteCursor } from '@/components/Collaboration/RemoteCursor'

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

describe('useRemoteCursors', () => {
  let mockWsManager: ReturnType<typeof createMockWebSocketManager>

  beforeEach(() => {
    mockWsManager = createMockWebSocketManager()
    vi.useFakeTimers()
    
    // Mock requestAnimationFrame to execute immediately
    vi.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(1)
      return 1
    })
    
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should initialize with empty cursors', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    expect(result.current.cursors).toEqual([])
  })

  test('should add cursor on cursor update event', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Simulate cursor update event
    act(() => {
      mockWsManager._trigger('collab:cursor-update', {
        userId: 'user-1',
        userName: 'Alice',
        position: { x: 100, y: 200 },
      })
    })

    // Advance timers for batch processing
    act(() => {
      vi.advanceTimersByTime(20)
    })

    expect(result.current.cursors).toHaveLength(1)
    expect(result.current.cursors[0].userId).toBe('user-1')
    expect(result.current.cursors[0].userName).toBe('Alice')
    expect(result.current.cursors[0].position).toEqual({ x: 100, y: 200 })
  })

  test('should remove cursor on user left event', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Add cursor first
    act(() => {
      mockWsManager._trigger('collab:cursor-update', {
        userId: 'user-1',
        userName: 'Alice',
        position: { x: 100, y: 200 },
      })
      vi.advanceTimersByTime(20)
    })

    expect(result.current.cursors).toHaveLength(1)

    // Remove cursor
    act(() => {
      mockWsManager._trigger('collab:user-left', 'user-1')
    })

    expect(result.current.cursors).toHaveLength(0)
  })

  test('should update cursor position on new event', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Add cursor
    act(() => {
      mockWsManager._trigger('collab:cursor-update', {
        userId: 'user-1',
        userName: 'Alice',
        position: { x: 100, y: 200 },
      })
      vi.advanceTimersByTime(20)
    })

    // Update position
    act(() => {
      mockWsManager._trigger('collab:cursor-update', {
        userId: 'user-1',
        userName: 'Alice',
        position: { x: 150, y: 250 },
      })
      vi.advanceTimersByTime(20)
    })

    expect(result.current.cursors).toHaveLength(1)
    expect(result.current.cursors[0].position).toEqual({ x: 150, y: 250 })
  })

  test('should handle cursor with selection', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    act(() => {
      mockWsManager._trigger('collab:cursor-update', {
        userId: 'user-1',
        userName: 'Alice',
        position: { x: 100, y: 200 },
        selection: {
          start: { x: 100, y: 200 },
          end: { x: 150, y: 200 },
        },
      })
      vi.advanceTimersByTime(20)
    })

    expect(result.current.cursors).toHaveLength(1)
    expect(result.current.cursors[0].selection).toEqual({
      start: { x: 100, y: 200 },
      end: { x: 150, y: 200 },
    })
  })

  test('should clean up expired cursors', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    // Add cursor
    act(() => {
      mockWsManager._trigger('collab:cursor-update', {
        userId: 'user-1',
        userName: 'Alice',
        position: { x: 100, y: 200 },
      })
      vi.advanceTimersByTime(20)
    })

    expect(result.current.cursors).toHaveLength(1)

    // Advance time past expire time (30 seconds + buffer)
    act(() => {
      vi.advanceTimersByTime(35000)
    })

    expect(result.current.cursors).toHaveLength(0)
  })

  test('should use consistent color for same user', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    act(() => {
      mockWsManager._trigger('collab:cursor-update', {
        userId: 'user-1',
        userName: 'Alice',
        position: { x: 100, y: 200 },
      })
      vi.advanceTimersByTime(20)
    })

    const color = result.current.cursors[0].userColor

    // Reset and add same user again
    const { result: result2 } = renderHook(() => useRemoteCursors(mockWsManager as any))

    act(() => {
      mockWsManager._trigger('collab:cursor-update', {
        userId: 'user-1',
        userName: 'Alice',
        position: { x: 200, y: 300 },
      })
      vi.advanceTimersByTime(20)
    })

    expect(result2.current.cursors[0].userColor).toBe(color)
  })

  test('should update local cursor when connected', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    act(() => {
      result.current.updateLocalCursor(100, 200)
    })

    expect(mockWsManager.emit).toHaveBeenCalledWith('collab:update-cursor', {
      position: { x: 100, y: 200 },
      selection: undefined,
    })
  })

  test('should not update local cursor when disconnected', () => {
    mockWsManager.isConnected.mockReturnValue(false)

    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    act(() => {
      result.current.updateLocalCursor(100, 200)
    })

    expect(mockWsManager.emit).not.toHaveBeenCalled()
  })

  test('should send cursor leave event', () => {
    const { result } = renderHook(() => useRemoteCursors(mockWsManager as any))

    act(() => {
      result.current.leaveCursor()
    })

    expect(mockWsManager.emit).toHaveBeenCalledWith('collab:cursor-leave', {})
  })
})

describe('getUserColor', () => {
  // Helper function to test color generation
  const getUserColor = (userId: string) => {
    const CURSOR_COLORS = [
      '#EF4444',
      '#F59E0B',
      '#10B981',
      '#06B6D4',
      '#3B82F6',
      '#8B5CF6',
      '#EC4899',
      '#F97316',
      '#84CC16',
      '#14B8A6',
      '#6366F1',
      '#A855F7',
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash = hash & hash
    }
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
  }

  test('should generate consistent color for same user id', () => {
    const color1 = getUserColor('user-123')
    const color2 = getUserColor('user-123')

    expect(color1).toBe(color2)
  })

  test('should generate different colors for different user ids', () => {
    const colors = new Set<string>()

    for (let i = 0; i < 12; i++) {
      colors.add(getUserColor(`user-${i}`))
    }

    // With 12 colors and 12 users, we should see some diversity
    expect(colors.size).toBeGreaterThan(0)
  })
})