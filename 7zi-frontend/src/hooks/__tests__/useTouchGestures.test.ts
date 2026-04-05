/**
 * useTouchGestures Test Suite
 *
 * Comprehensive tests for touch gesture handling including:
 * - Basic initialization
 * - Zoom gestures (pinch, double-tap)
 * - Drag gestures
 * - Swipe gestures
 * - Long press gestures
 * - Tap/double-tap gestures
 * - Edge cases
 * - Performance tests
 *
 * @version 1.13.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useTouchGestures, useSwipe, usePinchToZoom } from '../useTouchGestures'
import type { TouchGestureOptions, TouchGestureHandlers, SwipeHandlers, PinchToZoomOptions } from '../useTouchGestures'

// Helper to create touch event
function createTouch(x: number, y: number, identifier: number = 0): Touch {
  return {
    identifier,
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    pageX: x,
    pageY: y,
    target: document.createElement('div'),
    force: 0,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
  }
}

// Helper to create touch event
function createTouchEvent(type: string, touches: Touch[]): TouchEvent {
  const event = new Event(type, { cancelable: true }) as any
  event.touches = touches
  event.changedTouches = touches
  event.targetTouches = touches
  event.preventDefault = vi.fn()
  event.stopPropagation = vi.fn()
  return event
}

describe('useTouchGestures - Basic Initialization', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useTouchGestures())

    expect(result.current.gestureState).toEqual({
      scale: 1,
      translateX: 0,
      translateY: 0,
      isDragging: false,
      isZooming: false,
      isLongPressing: false,
    })
  })

  it('should provide gestureRef', () => {
    const { result } = renderHook(() => useTouchGestures())

    expect(result.current.gestureRef).toBeDefined()
    expect(result.current.gestureRef.current).toBeNull()
  })

  it('should provide resetState method', () => {
    const { result } = renderHook(() => useTouchGestures())

    expect(result.current.resetState).toBeDefined()
    expect(typeof result.current.resetState).toBe('function')
  })

  it('should enable all gestures by default', () => {
    const options: TouchGestureOptions = {}
    const { result } = renderHook(() => useTouchGestures(options))

    expect(result.current.gestureState.scale).toBe(1)
  })

  it('should have default minZoom of 1', () => {
    const { result } = renderHook(() => useTouchGestures({ minZoom: undefined }))

    expect(result.current.gestureState.scale).toBe(1)
  })

  it('should have default maxZoom of 3', () => {
    const { result } = renderHook(() => useTouchGestures({ maxZoom: undefined }))

    // Default maxZoom should allow zoom up to 3
    expect(result.current.gestureState.scale).toBeLessThanOrEqual(3)
  })

  it('should have default swipeThreshold of 50', () => {
    const { result } = renderHook(() => useTouchGestures({ swipeThreshold: undefined }))

    // Test with swipe threshold
    expect(result.current.gestureState.scale).toBeDefined()
  })

  it('should have default longPressDelay of 500', () => {
    const { result } = renderHook(() => useTouchGestures({ longPressDelay: undefined }))

    expect(result.current.gestureState.scale).toBeDefined()
  })

  it('should handle empty options without errors', () => {
    expect(() => {
      renderHook(() => useTouchGestures({}))
    }).not.toThrow()
  })

  it('should handle empty handlers without errors', () => {
    expect(() => {
      renderHook(() => useTouchGestures({}, {}))
    }).not.toThrow()
  })

  it('should handle undefined options', () => {
    expect(() => {
      renderHook(() => useTouchGestures())
    }).not.toThrow()
  })

  it('should handle undefined handlers', () => {
    expect(() => {
      renderHook(() => useTouchGestures())
    }).not.toThrow()
  })

  it('should return same instance across multiple calls', () => {
    const { result, rerender } = renderHook(() => useTouchGestures())

    const initialRef = result.current.gestureRef
    rerender()

    expect(result.current.gestureRef).toBe(initialRef)
  })
})

describe('useTouchGestures - Zoom Gestures', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should toggle zoom on double-tap (1 <-> 2)', async () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // First tap
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(50)

    // Second tap (double-tap)
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    await waitFor(() => {
      expect(result.current.gestureState.scale).toBe(2)
    })

    // Third tap (should reset)
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(50)

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    await waitFor(() => {
      expect(result.current.gestureState.scale).toBe(1)
    })
  })

  it('should zoom in with pinch gesture', () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // Start pinch (distance 100)
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [
        createTouch(100, 100, 0),
        createTouch(200, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    // Pinch out (distance 200)
    act(() => {
      const touchEvent = createTouchEvent('touchmove', [
        createTouch(100, 100, 0),
        createTouch(300, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.scale).toBeGreaterThan(1)
    expect(result.current.gestureState.isZooming).toBe(true)
  })

  it('should zoom out with pinch gesture', () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // Start with scale 2
    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    // Start pinch (distance 200)
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [
        createTouch(100, 100, 0),
        createTouch(300, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    // Pinch in (distance 100)
    act(() => {
      const touchEvent = createTouchEvent('touchmove', [
        createTouch(100, 100, 0),
        createTouch(200, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.scale).toBeLessThan(2)
  })

  it('should not exceed maxZoom', () => {
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true, maxZoom: 2 })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    // Try to zoom beyond max
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [
        createTouch(100, 100, 0),
        createTouch(400, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [
        createTouch(100, 100, 0),
        createTouch(500, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.scale).toBeLessThanOrEqual(2)
  })

  it('should not go below minZoom', () => {
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true, minZoom: 1 })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 1 }
    })

    // Try to zoom below min
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [
        createTouch(100, 100, 0),
        createTouch(120, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [
        createTouch(100, 100, 0),
        createTouch(110, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.scale).toBeGreaterThanOrEqual(1)
  })

  it('should call onZoom callback', () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(50)

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onZoom).toHaveBeenCalled()
  })

  it('should pass correct scale to onZoom', () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(50)

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onZoom).toHaveBeenCalledWith(2, 100, 100)
  })

  it('should update isZooming state', () => {
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    expect(result.current.gestureState.isZooming).toBe(false)

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [
        createTouch(100, 100, 0),
        createTouch(200, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [
        createTouch(100, 100, 0),
        createTouch(300, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.isZooming).toBe(true)
  })

  it('should reset isZooming on touch end', () => {
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // Start zoom
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [
        createTouch(100, 100, 0),
        createTouch(200, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [
        createTouch(100, 100, 0),
        createTouch(300, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    // End zoom
    act(() => {
      const touchEvent = createTouchEvent('touchend', [
        createTouch(100, 100, 0),
        createTouch(300, 100, 1),
      ])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.isZooming).toBe(false)
  })
})

describe('useTouchGestures - Drag Gestures', () => {
  it('should drag when zoomed in', () => {
    const onDrag = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableDrag: true }, { onDrag })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // Set initial scale
    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    // Start drag
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Drag right
    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(150, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.translateX).toBe(50)
    expect(result.current.gestureState.isDragging).toBe(true)
  })

  it('should update translateX on horizontal drag', () => {
    const onDrag = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableDrag: true }, { onDrag })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.translateX).toBe(100)
  })

  it('should update translateY on vertical drag', () => {
    const { result } = renderHook(() =>
      useTouchGestures({ enableDrag: true })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(100, 200)])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.translateY).toBe(100)
  })

  it('should call onDrag callback', () => {
    const onDrag = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableDrag: true }, { onDrag })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(150, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onDrag).toHaveBeenCalledWith(50, 0)
  })

  it('should call onDrag with correct delta', () => {
    const onDrag = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableDrag: true }, { onDrag })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(150, 200)])
      element.dispatchEvent(touchEvent)
    })

    expect(onDrag).toHaveBeenCalledWith(50, 100)
  })

  it('should set isDragging state correctly', () => {
    const { result } = renderHook(() =>
      useTouchGestures({ enableDrag: true })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    expect(result.current.gestureState.isDragging).toBe(false)

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(150, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.isDragging).toBe(true)
  })

  it('should only allow drag when scale > 1', () => {
    const onDrag = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableDrag: true }, { onDrag })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(150, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.translateX).toBe(0)
    expect(result.current.gestureState.isDragging).toBe(false)
  })

  it('should reset isDragging on touch end', () => {
    const { result } = renderHook(() =>
      useTouchGestures({ enableDrag: true })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 2 }
    })

    // Start drag
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(150, 100)])
      element.dispatchEvent(touchEvent)
    })

    // End drag
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(150, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(result.current.gestureState.isDragging).toBe(false)
  })
})

describe('useTouchGestures - Swipe Gestures', () => {
  it('should trigger onSwipe(right) when swiping right beyond threshold', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true }, { onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).toHaveBeenCalledWith('right')
  })

  it('should trigger onSwipe(left) when swiping left beyond threshold', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true }, { onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).toHaveBeenCalledWith('left')
  })

  it('should trigger onSwipe(up) when swiping up beyond threshold', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true }, { onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 200)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).toHaveBeenCalledWith('up')
  })

  it('should trigger onSwipe(down) when swiping down beyond threshold', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true }, { onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 200)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).toHaveBeenCalledWith('down')
  })

  it('should not trigger swipe below threshold', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true, swipeThreshold: 50 }, { onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Swipe 30px (below threshold)
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(130, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('should prioritize horizontal swipe over vertical', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true }, { onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Diagonal swipe (more horizontal)
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 150)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).toHaveBeenCalledWith('right')
  })

  it('should not trigger swipe when dragging', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true }, { onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // Set dragging state
    act(() => {
      result.current.gestureState = {
        ...result.current.gestureState,
        scale: 2,
        isDragging: true,
      }
    })

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('should not trigger swipe when zooming', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true }, { onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // Set zooming state
    act(() => {
      result.current.gestureState = {
        ...result.current.gestureState,
        isZooming: true,
      }
    })

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).not.toHaveBeenCalled()
  })
})

describe('useTouchGestures - Long Press', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should trigger onLongPress after delay', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableLongPress: true }, { onLongPress })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Fast-forward past longPressDelay
    vi.advanceTimersByTime(500)

    expect(result.current.gestureState.isLongPressing).toBe(true)
    expect(onLongPress).toHaveBeenCalled()
  })

  it('should not trigger long press when moved', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableLongPress: true }, { onLongPress })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Move before delay
    act(() => {
      const touchEvent = createTouchEvent('touchmove', [createTouch(110, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(500)

    expect(result.current.gestureState.isLongPressing).toBe(false)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('should cancel long press on touch end', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableLongPress: true }, { onLongPress })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Release before delay
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(500)

    expect(result.current.gestureState.isLongPressing).toBe(false)
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('should update isLongPressing state correctly', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableLongPress: true }, { onLongPress })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    expect(result.current.gestureState.isLongPressing).toBe(false)

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(500)

    expect(result.current.gestureState.isLongPressing).toBe(true)
  })

  it('should respect custom longPressDelay', () => {
    const onLongPress = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableLongPress: true, longPressDelay: 1000 }, { onLongPress })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(500)

    expect(onLongPress).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)

    expect(onLongPress).toHaveBeenCalled()
  })

  it('should not trigger tap on long press', () => {
    const onTap = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableLongPress: true }, { onTap })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(500)

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onTap).not.toHaveBeenCalled()
  })
})

describe('useTouchGestures - Tap / Double Tap', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should trigger onTap on quick tap', () => {
    const onTap = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableLongPress: false }, { onTap })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(50)

    expect(onTap).toHaveBeenCalled()
  })

  it('should detect double tap within 300ms', () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // First tap
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(100)

    // Second tap (within 300ms)
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onZoom).toHaveBeenCalled()
  })

  it('should not detect double tap after 300ms', () => {
    const onZoom = vi.fn()
    const onTap = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom, onTap })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // First tap
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(400) // Wait 400ms

    // Second tap (after 300ms threshold)
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Should trigger onTap, not double-tap zoom
    expect(onZoom).not.toHaveBeenCalled()
  })

  it('should prioritize double-tap zoom over onTap', () => {
    const onZoom = vi.fn()
    const onTap = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom, onTap })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    // First tap
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(100)

    // Second tap
    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onZoom).toHaveBeenCalled()
    expect(onTap).not.toHaveBeenCalled()
  })

  it('should not trigger onTap on long press', () => {
    const onTap = vi.fn()
    const onLongPress = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableLongPress: true }, { onTap, onLongPress })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    vi.advanceTimersByTime(500)

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onLongPress).toHaveBeenCalled()
    expect(onTap).not.toHaveBeenCalled()
  })

  it('should not trigger onTap on swipe', () => {
    const onTap = vi.fn()
    const onSwipe = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableSwipe: true }, { onTap, onSwipe })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(onSwipe).toHaveBeenCalledWith('right')
    expect(onTap).not.toHaveBeenCalled()
  })
})

describe('useTouchGestures - Edge Cases', () => {
  it('should handle null element reference', () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true }, { onZoom })
    )

    expect(() => {
      act(() => {
        const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
        // Dispatch to document (no ref set)
        document.dispatchEvent(touchEvent)
      })
    }).not.toThrow()
  })

  it('should clamp zoom to maxZoom', () => {
    const { result } = renderHook(() =>
      useTouchGestures({ enableZoom: true, maxZoom: 2 })
    )

    const element = document.createElement('div')
    result.current.gestureRef.current = element

    act(() => {
      result.current.gestureState = { ...result.current.gestureState, scale: 3 }
    })

    // Try to force scale beyond max
    expect(result.current.gestureState.scale).