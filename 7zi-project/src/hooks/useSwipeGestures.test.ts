/**
 * @fileoverview Tests for useSwipeGestures hook
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef, RefObject } from 'react';
import { useSwipeGestures } from './useSwipeGestures';

// Use fake timers to control time-based swipe detection
vi.useFakeTimers();

describe('useSwipeGestures', () => {
  let container: HTMLDivElement;
  let onSwipeLeft: Mock;
  let onSwipeRight: Mock;
  let onSwipeUp: Mock;
  let onSwipeDown: Mock;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onSwipeLeft = vi.fn();
    onSwipeRight = vi.fn();
    onSwipeUp = vi.fn();
    onSwipeDown = vi.fn();
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  it('should initialize with correct initial state', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
      })
    );

    expect(result.current.swipeState).toEqual({
      isDragging: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0,
    });
  });

  it('should detect right swipe', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeRight,
      })
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 160,
        clientY: 100,
      });
      container.dispatchEvent(moveEvent);
    });

    // Need to wait for allowed time (default 300ms)
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('should detect left swipe', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeLeft,
      })
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 40,
        clientY: 100,
      });
      container.dispatchEvent(moveEvent);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('should detect up swipe', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeUp,
      })
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 100,
        clientY: 40,
      });
      container.dispatchEvent(moveEvent);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onSwipeUp).toHaveBeenCalledTimes(1);
  });

  it('should detect down swipe', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeDown,
      })
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 100,
        clientY: 160,
      });
      container.dispatchEvent(moveEvent);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onSwipeDown).toHaveBeenCalledTimes(1);
  });

  it('should update swipe state during drag', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {})
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);
    });

    expect(result.current.swipeState.isDragging).toBe(true);
    expect(result.current.swipeState.startX).toBe(100);
    expect(result.current.swipeState.startY).toBe(100);

    act(() => {
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 120,
        clientY: 110,
      });
      container.dispatchEvent(moveEvent);
    });

    expect(result.current.swipeState.deltaX).toBe(20);
    expect(result.current.swipeState.deltaY).toBe(10);
  });

  it('should reset state on mouse leave', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {})
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);
    });

    expect(result.current.swipeState.isDragging).toBe(true);

    act(() => {
      const leaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
      });
      container.dispatchEvent(leaveEvent);
    });

    expect(result.current.swipeState.isDragging).toBe(false);
    expect(result.current.swipeState.deltaX).toBe(0);
    expect(result.current.swipeState.deltaY).toBe(0);
  });

  it('should reset state on mouse up', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {})
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 120,
        clientY: 110,
      });
      container.dispatchEvent(moveEvent);
    });

    act(() => {
      const upEvent = new MouseEvent('mouseup', {
        bubbles: true,
      });
      container.dispatchEvent(upEvent);
    });

    expect(result.current.swipeState.isDragging).toBe(false);
  });

  it('should handle touch events', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        onSwipeRight,
      })
    );

    act(() => {
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [{ clientX: 100, clientY: 100 } as any],
      });
      container.dispatchEvent(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [{ clientX: 160, clientY: 100 } as any],
      });
      container.dispatchEvent(touchMove);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('should not trigger swipe below threshold', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 100,
        onSwipeRight,
      })
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 140,
        clientY: 100,
      });
      container.dispatchEvent(moveEvent);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('should respect restraint for diagonal movement', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 50,
        restraint: 20,
        onSwipeRight,
      })
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);

      // Move right 60px AND down 30px (exceeds restraint)
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 160,
        clientY: 130,
      });
      container.dispatchEvent(moveEvent);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('should use custom threshold', () => {
    const ref = createRef<HTMLDivElement>();
    ref.current = container;

    const { result } = renderHook(() =>
      useSwipeGestures(ref as RefObject<HTMLElement>, {
        threshold: 30,
        onSwipeRight,
      })
    );

    act(() => {
      const startEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      container.dispatchEvent(startEvent);

      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 135,
        clientY: 100,
      });
      container.dispatchEvent(moveEvent);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });
});
