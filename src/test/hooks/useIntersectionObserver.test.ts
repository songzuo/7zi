/**
 * @fileoverview useIntersectionObserver hook tests
 * 
 * Tests for intersection observer hooks with mocked IntersectionObserver API.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useIntersectionObserver,
  useAnimateOnView,
  useCountUp,
} from '../../hooks/useIntersectionObserver';

describe('useIntersectionObserver', () => {
  let observerCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null;
  const mockObserve = vi.fn();
  const mockUnobserve = vi.fn();
  const mockDisconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;

    const MockIntersectionObserver = vi.fn().mockImplementation((callback: (entries: IntersectionObserverEntry[]) => void) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
      };
    });

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ref, isIntersecting, and entry', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    expect(result.current.ref).toBeDefined();
    expect(result.current.ref.current).toBeNull();
    expect(result.current.isIntersecting).toBe(false);
    expect(result.current.entry).toBeUndefined();
  });

  it('returns correct initial state', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    expect(result.current.isIntersecting).toBe(false);
    expect(result.current.entry).toBeUndefined();
  });

  it('accepts options without error', () => {
    const { result: r1 } = renderHook(() => useIntersectionObserver({ threshold: 0.5 }));
    expect(r1.current.isIntersecting).toBe(false);

    const { result: r2 } = renderHook(() => useIntersectionObserver({ rootMargin: '10px' }));
    expect(r2.current.isIntersecting).toBe(false);

    const { result: r3 } = renderHook(() => useIntersectionObserver({ triggerOnce: true }));
    expect(r3.current.isIntersecting).toBe(false);

    const { result: r4 } = renderHook(() => useIntersectionObserver({ freezeOnceVisible: true }));
    expect(r4.current.isIntersecting).toBe(false);
  });

  it('updates isIntersecting when element intersects', async () => {
    const { result, rerender } = renderHook(() => useIntersectionObserver());

    const mockElement = document.createElement('div');
    result.current.ref.current = mockElement;
    rerender();

    await waitFor(() => expect(mockObserve).toHaveBeenCalled());

    act(() => {
      if (observerCallback) {
        observerCallback([{
          isIntersecting: true,
          target: mockElement,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }]);
      }
    });

    expect(result.current.isIntersecting).toBe(true);
    expect(result.current.entry).toBeDefined();
    expect(result.current.entry?.isIntersecting).toBe(true);
  });

  it('updates isIntersecting when element leaves viewport', async () => {
    const { result, rerender } = renderHook(() => useIntersectionObserver());

    const mockElement = document.createElement('div');
    result.current.ref.current = mockElement;
    rerender();

    await waitFor(() => expect(mockObserve).toHaveBeenCalled());

    // Enter viewport
    act(() => {
      if (observerCallback) {
        observerCallback([{
          isIntersecting: true,
          target: mockElement,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }]);
      }
    });

    expect(result.current.isIntersecting).toBe(true);

    // Leave viewport
    act(() => {
      if (observerCallback) {
        observerCallback([{
          isIntersecting: false,
          target: mockElement,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 0,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }]);
      }
    });

    expect(result.current.isIntersecting).toBe(false);
  });

  it('unobserves element when triggerOnce is true and element intersects', async () => {
    const { result, rerender } = renderHook(() =>
      useIntersectionObserver({ triggerOnce: true })
    );

    const mockElement = document.createElement('div');
    result.current.ref.current = mockElement;
    rerender();

    await waitFor(() => expect(mockObserve).toHaveBeenCalled());

    act(() => {
      if (observerCallback) {
        observerCallback([{
          isIntersecting: true,
          target: mockElement,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }]);
      }
    });

    expect(mockUnobserve).toHaveBeenCalled();
  });

  it('unobserves element when freezeOnceVisible is true and element intersects', async () => {
    const { result, rerender } = renderHook(() =>
      useIntersectionObserver({ freezeOnceVisible: true })
    );

    const mockElement = document.createElement('div');
    result.current.ref.current = mockElement;
    rerender();

    await waitFor(() => expect(mockObserve).toHaveBeenCalled());

    act(() => {
      if (observerCallback) {
        observerCallback([{
          isIntersecting: true,
          target: mockElement,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }]);
      }
    });

    expect(mockUnobserve).toHaveBeenCalled();
  });

  it('cleans up observer on unmount', async () => {
    const { result, unmount, rerender } = renderHook(() => useIntersectionObserver());

    const mockElement = document.createElement('div');
    result.current.ref.current = mockElement;
    rerender();

    await waitFor(() => expect(mockObserve).toHaveBeenCalled());

    unmount();

    expect(mockUnobserve).toHaveBeenCalled();
  });
});

describe('useAnimateOnView', () => {
  let observerCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null;
  const mockObserve = vi.fn();
  const mockUnobserve = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;

    vi.useFakeTimers();

    const MockIntersectionObserver = vi.fn().mockImplementation((callback: (entries: IntersectionObserverEntry[]) => void) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: vi.fn(),
      };
    });

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns ref, isVisible, and className', () => {
    const { result } = renderHook(() => useAnimateOnView());

    expect(result.current.ref).toBeDefined();
    expect(result.current.isVisible).toBe(false);
    expect(result.current.className).toBe('opacity-0');
  });

  it('starts with opacity-0 class', () => {
    const { result } = renderHook(() => useAnimateOnView());

    expect(result.current.className).toBe('opacity-0');
  });

  it('accepts custom animation class parameter', () => {
    const { result } = renderHook(() =>
      useAnimateOnView('custom-animation')
    );

    expect(result.current.className).toBe('opacity-0');
    expect(result.current.isVisible).toBe(false);
  });

  it('uses default animation class when no argument provided', () => {
    const { result } = renderHook(() => useAnimateOnView());

    expect(result.current.className).toBe('opacity-0');
  });

  it('updates isVisible when element intersects', async () => {
    const { result, rerender } = renderHook(() => useAnimateOnView());

    const mockElement = document.createElement('div');
    result.current.ref.current = mockElement;
    rerender();

    await waitFor(() => expect(mockObserve).toHaveBeenCalled());

    act(() => {
      if (observerCallback) {
        observerCallback([{
          isIntersecting: true,
          target: mockElement,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }]);
      }
    });

    act(() => {
      vi.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.isVisible).toBe(true);
    });

    expect(result.current.className).toBe('animate-in fade-in slide-up-8');
  });

  it('applies custom animation class when visible', async () => {
    const { result, rerender } = renderHook(() =>
      useAnimateOnView('my-custom-animation')
    );

    const mockElement = document.createElement('div');
    result.current.ref.current = mockElement;
    rerender();

    await waitFor(() => expect(mockObserve).toHaveBeenCalled());

    act(() => {
      if (observerCallback) {
        observerCallback([{
          isIntersecting: true,
          target: mockElement,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }]);
      }
    });

    act(() => {
      vi.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.isVisible).toBe(true);
    });

    expect(result.current.className).toBe('my-custom-animation');
  });
});

describe('useCountUp', () => {
  let observerCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null;
  const mockObserve = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;

    const MockIntersectionObserver = vi.fn().mockImplementation((callback: (entries: IntersectionObserverEntry[]) => void) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      };
    });

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ref, count, and isAnimating', () => {
    const { result } = renderHook(() => useCountUp(100));

    expect(result.current.ref).toBeDefined();
    expect(result.current.count).toBe(0);
    expect(result.current.isAnimating).toBe(false);
  });

  it('starts count at 0', () => {
    const { result } = renderHook(() => useCountUp(100));

    expect(result.current.count).toBe(0);
  });

  it('accepts end value', () => {
    const { result } = renderHook(() => useCountUp(500));

    expect(result.current.count).toBe(0);
  });

  it('accepts custom duration', () => {
    const { result } = renderHook(() => useCountUp(100, 1000));

    expect(result.current.count).toBe(0);
    expect(result.current.isAnimating).toBe(false);
  });

  it('isAnimating is false initially', () => {
    const { result } = renderHook(() => useCountUp(100));

    expect(result.current.isAnimating).toBe(false);
  });

  it('initializes hook without errors', async () => {
    const { result, rerender } = renderHook(() => useCountUp(100));

    const mockElement = document.createElement('div');
    result.current.ref.current = mockElement;
    rerender();

    await waitFor(() => expect(mockObserve).toHaveBeenCalled());

    // Trigger intersection
    act(() => {
      if (observerCallback) {
        observerCallback([{
          isIntersecting: true,
          target: mockElement,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: Date.now(),
        }]);
      }
    });

    // Hook should handle the intersection without errors
    expect(result.current.ref).toBeDefined();
  });
});