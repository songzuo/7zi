/**
 * useSwipe Test Suite
 *
 * Tests for simplified swipe gesture detection
 *
 * @version 1.13.0
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSwipe } from '../useTouchGestures'
import type { SwipeHandlers } from '../useTouchGestures'

// Helper to create touch event
function createTouch(x: number, y: number): Touch {
  return {
    identifier: 0,
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

describe('useSwipe - Basic Swipe Detection', () => {
  it('should call onRight when swiping right', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).toHaveBeenCalled()
  })

  it('should call onLeft when swiping left', () => {
    const handlers: SwipeHandlers = {
      onLeft: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onLeft).toHaveBeenCalled()
  })

  it('should call onUp when swiping up', () => {
    const handlers: SwipeHandlers = {
      onUp: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 200)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onUp).toHaveBeenCalled()
  })

  it('should call onDown when swiping down', () => {
    const handlers: SwipeHandlers = {
      onDown: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 200)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onDown).toHaveBeenCalled()
  })

  it('should not trigger swipe below threshold', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Swipe 30px (below threshold)
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(130, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).not.toHaveBeenCalled()
  })

  it('should not throw error when handlers are undefined', () => {
    expect(() => {
      renderHook(() => useSwipe({}, 50))
    }).not.toThrow()
  })

  it('should not throw error when onRight is undefined', () => {
    const handlers: SwipeHandlers = {}
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    expect(() => {
      act(() => {
        const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
        element.dispatchEvent(touchEvent)
      })

      act(() => {
        const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
        element.dispatchEvent(touchEvent)
      })
    }).not.toThrow()
  })

  it('should not throw error when onLeft is undefined', () => {
    const handlers: SwipeHandlers = {}
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    expect(() => {
      act(() => {
        const touchEvent = createTouchEvent('touchstart', [createTouch(200, 100)])
        element.dispatchEvent(touchEvent)
      })

      act(() => {
        const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
        element.dispatchEvent(touchEvent)
      })
    }).not.toThrow()
  })

  it('should not throw error when onUp is undefined', () => {
    const handlers: SwipeHandlers = {}
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    expect(() => {
      act(() => {
        const touchEvent = createTouchEvent('touchstart', [createTouch(100, 200)])
        element.dispatchEvent(touchEvent)
      })

      act(() => {
        const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
        element.dispatchEvent(touchEvent)
      })
    }).not.toThrow()
  })

  it('should not throw error when onDown is undefined', () => {
    const handlers: SwipeHandlers = {}
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    expect(() => {
      act(() => {
        const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
        element.dispatchEvent(touchEvent)
      })

      act(() => {
        const touchEvent = createTouchEvent('touchend', [createTouch(100, 200)])
        element.dispatchEvent(touchEvent)
      })
    }).not.toThrow()
  })
})

describe('useSwipe - Direction Detection', () => {
  it('should prioritize horizontal over vertical', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
      onDown: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Diagonal swipe (more horizontal)
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 150)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).toHaveBeenCalled()
    expect(handlers.onDown).not.toHaveBeenCalled()
  })

  it('should handle diagonal swipe correctly', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
      onDown: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Equal X and Y distance
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 200)])
      element.dispatchEvent(touchEvent)
    })

    // Should choose X direction (horizontal priority)
    expect(handlers.onRight).toHaveBeenCalled()
  })

  it('should not trigger on zero distance', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // No movement
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).not.toHaveBeenCalled()
  })

  it('should handle negative X direction (left)', () => {
    const handlers: SwipeHandlers = {
      onLeft: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onLeft).toHaveBeenCalled()
  })

  it('should handle positive X direction (right)', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).toHaveBeenCalled()
  })

  it('should handle negative Y direction (up)', () => {
    const handlers: SwipeHandlers = {
      onUp: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 200)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onUp).toHaveBeenCalled()
  })

  it('should handle positive Y direction (down)', () => {
    const handlers: SwipeHandlers = {
      onDown: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(100, 200)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onDown).toHaveBeenCalled()
  })
})

describe('useSwipe - Threshold Control', () => {
  it('should respect custom threshold', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 100))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Swipe 50px (below custom threshold of 100)
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(150, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).not.toHaveBeenCalled()
  })

  it('should trigger on threshold boundary', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Swipe exactly 50px (at threshold)
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(150, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).toHaveBeenCalled()
  })

  it('should trigger above threshold', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    // Swipe 100px (above threshold)
    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).toHaveBeenCalled()
  })

  it('should use default threshold of 50', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(200, 100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).toHaveBeenCalled()
  })
})

describe('useSwipe - Edge Cases', () => {
  it('should handle extreme coordinates', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(10000, 10000)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(10500, 10000)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).toHaveBeenCalled()
  })

  it('should handle negative coordinates', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    const element = document.createElement('div')
    result.current.current = element

    act(() => {
      const touchEvent = createTouchEvent('touchstart', [createTouch(-100, -100)])
      element.dispatchEvent(touchEvent)
    })

    act(() => {
      const touchEvent = createTouchEvent('touchend', [createTouch(-50, -100)])
      element.dispatchEvent(touchEvent)
    })

    expect(handlers.onRight).toHaveBeenCalled()
  })

  it('should clean up event listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useSwipe({}, 50))

    const element = document.createElement('div')
    result.current.current = element

    const removeEventListenerSpy = vi.spyOn(element, 'removeEventListener')

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalled()
  })

  it('should not throw error with null element', () => {
    const handlers: SwipeHandlers = {
      onRight: vi.fn(),
    }
    const { result } = renderHook(() => useSwipe(handlers, 50))

    // Don't set element ref
    expect(() => {
      act(() => {
        const touchEvent = createTouchEvent('touchstart', [createTouch(100, 100)])
        // Dispatch to document (no ref set)
        document.dispatchEvent(touchEvent)
      })
    }).not.toThrow()
  })
})
