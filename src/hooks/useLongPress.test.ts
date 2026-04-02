/**
 * @fileoverview Tests for useLongPress hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLongPress } from './useLongPress'

describe('useLongPress', () => {
  let mockOnLongPress: any
  let mockOnClick: any

  beforeEach(() => {
    mockOnLongPress = vi.fn()

    mockOnClick = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return handlers and isLongPressing state', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
      })
    )

    expect(result.current).toHaveProperty('handlers')
    expect(result.current).toHaveProperty('isLongPressing')
    expect(result.current.isLongPressing).toBe(false)
  })

  it('should trigger long press after default delay', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
      } as any)
    })

    expect(mockOnLongPress).not.toHaveBeenCalled()
    expect(result.current.isLongPressing).toBe(false)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockOnLongPress).toHaveBeenCalledTimes(1)
    expect(result.current.isLongPressing).toBe(true)
  })

  it('should trigger long press with custom delay', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
        delay: 1000,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockOnLongPress).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockOnLongPress).toHaveBeenCalledTimes(1)
  })

  it('should not trigger long press if movement exceeds threshold', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
        threshold: 10,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      result.current.handlers.onMouseMove({
        clientX: 15,
        clientY: 0,
      } as any)
      vi.advanceTimersByTime(500)
    })

    expect(mockOnLongPress).not.toHaveBeenCalled()
  })

  it('should trigger click instead of long press if released early', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      result.current.handlers.onMouseUp({
        preventDefault: vi.fn(),
      } as any)
    })

    expect(mockOnClick).toHaveBeenCalledTimes(1)
    expect(mockOnLongPress).not.toHaveBeenCalled()
  })

  it('should not trigger click after long press', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.handlers.onMouseUp({
        preventDefault: vi.fn(),
      } as any)
    })

    expect(mockOnLongPress).toHaveBeenCalledTimes(1)
    expect(mockOnClick).not.toHaveBeenCalled()
  })

  it('should work with touch events', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
      })
    )

    act(() => {
      result.current.handlers.onTouchStart({
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockOnLongPress).toHaveBeenCalledTimes(1)
  })

  it('should cancel long press on touch cancel', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
      })
    )

    act(() => {
      result.current.handlers.onTouchStart({
        touches: [{ clientX: 0, clientY: 0 }],
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      result.current.handlers.onTouchCancel()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockOnLongPress).not.toHaveBeenCalled()
  })

  it('should handle movement within threshold', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
        threshold: 20,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      result.current.handlers.onMouseMove({
        clientX: 15,
        clientY: 5,
      } as any)
      vi.advanceTimersByTime(500)
    })

    expect(mockOnLongPress).toHaveBeenCalledTimes(1)
  })

  it('should clear timeout on mouse leave', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      result.current.handlers.onMouseLeave()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(mockOnLongPress).not.toHaveBeenCalled()
  })

  it('should reset isLongPressing to false after release', () => {
    const { result } = renderHook(() =>
      useLongPress({
        onLongPress: mockOnLongPress,
        onClick: mockOnClick,
      })
    )

    act(() => {
      result.current.handlers.onMouseDown({
        clientX: 0,
        clientY: 0,
        preventDefault: vi.fn(),
      } as any)
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.isLongPressing).toBe(true)

    act(() => {
      result.current.handlers.onMouseUp({
        preventDefault: vi.fn(),
      } as any)
    })

    expect(result.current.isLongPressing).toBe(false)
  })
})
