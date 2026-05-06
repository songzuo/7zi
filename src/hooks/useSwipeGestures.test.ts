/**
 * @fileoverview Tests for useSwipeGestures hook
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createRef, RefObject } from 'react'
import { useSwipeGestures } from './useSwipeGestures'

// Use fake timers to control time-based swipe detection
// shouldAdvanceTime: true makes Date.now() also advance with fake timers
vi.useFakeTimers({ shouldAdvanceTime: true })

// Helper to create proper Touch objects for TouchEvent
function createTouch(options: { clientX: number; clientY: number }): Touch {
  const touch = {
    identifier: 0,
    clientX: options.clientX,
    clientY: options.clientY,
    pageX: options.clientX,
    pageY: options.clientY,
    screenX: options.clientX,
    screenY: options.clientY,
    target: document.body,
    force: 1,
    radiusX: 1,
    radiusY: 1,
    rotationAngle: 0,
  } as Touch
  return touch
}

// Helper to create TouchEvent with proper touches array
function createTouchEvent(type: string, touchOptions: { clientX: number; clientY: number }[]): TouchEvent {
  const touches = touchOptions.map(createTouch)
  return new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches,
    changedTouches: touches,
    targetTouches: touches,
  })
}

describe('useSwipeGestures', () => {
  let container: HTMLDivElement
  let onSwipeLeft: Mock
  let onSwipeRight: Mock
  let onSwipeUp: Mock
  let onSwipeDown: Mock

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    onSwipeLeft = vi.fn()
    onSwipeRight = vi.fn()
    onSwipeUp = vi.fn()
    onSwipeDown = vi.fn()
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it('should initialize with correct initial state', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
      })
    )

    expect(result.current.swipeState).toEqual({
      isDragging: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
    })
  })

  it('should detect right swipe', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeRight,
      })
    )

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 160,
        clientY: 100,
      })
      container.dispatchEvent(moveEvent)
    })

    // Need to wait for allowed time (default 300ms)
    act(() => {
      vi.advanceTimersByTime(301)
    })

    // Trigger check again after time has passed
    act(() => {
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 160,
        clientY: 100,
      })
      container.dispatchEvent(moveEvent)
    })

    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('should detect left swipe', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeLeft,
      })
    )

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 40,
        clientY: 100,
      })
      container.dispatchEvent(moveEvent)
    })

    act(() => {
      vi.advanceTimersByTime(301)
    })

    act(() => {
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 40,
        clientY: 100,
      })
      container.dispatchEvent(moveEvent)
    })

    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })

  it('should detect up swipe', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeUp,
      })
    )

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 100,
        clientY: 40,
      })
      container.dispatchEvent(moveEvent)
    })

    act(() => {
      vi.advanceTimersByTime(301)
    })

    act(() => {
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 100,
        clientY: 40,
      })
      container.dispatchEvent(moveEvent)
    })

    expect(onSwipeUp).toHaveBeenCalledTimes(1)
  })

  it('should detect down swipe', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeDown,
      })
    )

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 100,
        clientY: 160,
      })
      container.dispatchEvent(moveEvent)
    })

    act(() => {
      vi.advanceTimersByTime(301)
    })

    act(() => {
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 100,
        clientY: 160,
      })
      container.dispatchEvent(moveEvent)
    })

    expect(onSwipeDown).toHaveBeenCalledTimes(1)
  })

  it('should update swipe state during drag', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() => useSwipeGestures(ref as RefObject<HTMLElement>, {}))

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)
    })

    expect(result.current.swipeState.isDragging).toBe(true)
    expect(result.current.swipeState.startX).toBe(100)
    expect(result.current.swipeState.startY).toBe(100)

    act(() => {
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 120,
        clientY: 110,
      })
      container.dispatchEvent(moveEvent)
    })

    expect(result.current.swipeState.deltaX).toBe(20)
    expect(result.current.swipeState.deltaY).toBe(10)
  })

  it('should reset state on mouse leave', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() => useSwipeGestures(ref as RefObject<HTMLElement>, {}))

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)
    })

    expect(result.current.swipeState.isDragging).toBe(true)

    act(() => {
      const leaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
      })
      container.dispatchEvent(leaveEvent)
    })

    expect(result.current.swipeState.isDragging).toBe(false)
    expect(result.current.swipeState.deltaX).toBe(0)
    expect(result.current.swipeState.deltaY).toBe(0)
  })

  it('should reset state on mouse up', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() => useSwipeGestures(ref as RefObject<HTMLElement>, {}))

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 120,
        clientY: 110,
      })
      container.dispatchEvent(moveEvent)
    })

    act(() => {
      const upEvent = new MouseEvent('mouseup', {
        bubbles: true,
      })
      container.dispatchEvent(upEvent)
    })

    expect(result.current.swipeState.isDragging).toBe(false)
  })

  it('should handle touch events', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeRight,
      })
    )

    act(() => {
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
      container.dispatchEvent(touchStart)

      const touchMove = createTouchEvent('touchmove', [{ clientX: 160, clientY: 100 }])
      container.dispatchEvent(touchMove)
    })

    act(() => {
      vi.advanceTimersByTime(301)
    })

    act(() => {
      const touchMove2 = createTouchEvent('touchmove', [{ clientX: 160, clientY: 100 }])
      container.dispatchEvent(touchMove2)
    })

    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('should not trigger swipe below threshold', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 100,
        onSwipeRight,
      })
    )

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 140,
        clientY: 100,
      })
      container.dispatchEvent(moveEvent)
    })

    act(() => {
      vi.advanceTimersByTime(301)
    })

    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('should respect restraint for diagonal movement', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        restraint: 20,
        onSwipeRight,
      })
    )

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)

      // Move right 60px AND down 30px (exceeds restraint)
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 160,
        clientY: 130,
      })
      container.dispatchEvent(moveEvent)
    })

    act(() => {
      vi.advanceTimersByTime(301)
    })

    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('should use custom threshold', () => {
    const ref = createRef<HTMLDivElement>()
    ref.current = container

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 30,
        onSwipeRight,
      })
    )

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
      container.dispatchEvent(startEvent)

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 135,
        clientY: 100,
      })
      container.dispatchEvent(moveEvent)
    })

    act(() => {
      vi.advanceTimersByTime(301)
    })

    act(() => {
      const moveEvent2 = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 135,
        clientY: 100,
      })
      container.dispatchEvent(moveEvent2)
    })

    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })
})
