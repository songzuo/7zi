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
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    mockDisconnect = vi.fn();
    observerCallback = null;

    // Use a proper class mock
    const MockIntersectionObserver = vi.fn().mockImplementation(
      function(this: IntersectionObserver, callback: (entries: IntersectionObserverEntry[]) => void) {
        observerCallback = callback;
        this.observe = mockObserve;
        this.unobserve = mockUnobserve;
        this.disconnect = mockDisconnect;
        return this;
      }
    );

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ref, isIntersecting, and entry', () => {
    const { result } = renderHook(() => useIntersectionObserver());

    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.ref).toBe('function');
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
    const { result } = renderHook(() => useIntersectionObserver());

    const mockElement = document.createElement('div');
    
    // Call the callback ref with the element
    act(() => {
      result.current.ref(mockElement);
    });

    // Wait for the effect to run and observe to be called
    await waitFor(
      () => expect(mockObserve).toHaveBeenCalled(),
      { timeout: 1000 }
    );

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
    const { result } = renderHook(() => useIntersectionObserver());

    const mockElement = document.createElement('div');
    
    act(() => {
      result.current.ref(mockElement);
    });

    await waitFor(
      () => expect(mockObserve).toHaveBeenCalled(),
      { timeout: 1000 }
    );

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
    const { result } = renderHook(() =>
      useIntersectionObserver({ triggerOnce: true })
    );

    const mockElement = document.createElement('div');
    
    act(() => {
      result.current.ref(mockElement);
    });

    await waitFor(
      () => expect(mockObserve).toHaveBeenCalled(),
      { timeout: 1000 }
    );

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
    const { result } = renderHook(() =>
      useIntersectionObserver({ freezeOnceVisible: true })
    );

    const mockElement = document.createElement('div');
    
    act(() => {
      result.current.ref(mockElement);
    });

    await waitFor(
      () => expect(mockObserve).toHaveBeenCalled(),
      { timeout: 1000 }
    );

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
    const { result, unmount } = renderHook(() => useIntersectionObserver());

    const mockElement = document.createElement('div');
    
    act(() => {
      result.current.ref(mockElement);
    });

    await waitFor(
      () => expect(mockObserve).toHaveBeenCalled(),
      { timeout: 1000 }
    );

    unmount();

    expect(mockUnobserve).toHaveBeenCalled();
  });
});

describe('useAnimateOnView', () => {
  let observerCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null;
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let rafCallbacks: Array<() => void> = [];

  beforeEach(() => {
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    observerCallback = null;
    rafCallbacks = [];

    // Mock requestAnimationFrame to capture callbacks
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const MockIntersectionObserver = vi.fn().mockImplementation(
      function(this: IntersectionObserver, callback: (entries: IntersectionObserverEntry[]) => void) {
        observerCallback = callback;
        this.observe = mockObserve;
        this.unobserve = mockUnobserve;
        this.disconnect = vi.fn();
        return this;
      }
    );

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Helper to flush RAF callbacks
  const flushRaf = () => {
    while (rafCallbacks.length > 0) {
      const cb = rafCallbacks.shift();
      if (cb) cb();
    }
  };

  it('returns ref, isVisible, and className', () => {
    const { result } = renderHook(() => useAnimateOnView());

    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.ref).toBe('function');
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
    const { result } = renderHook(() => useAnimateOnView());

    const mockElement = document.createElement('div');
    
    act(() => {
      result.current.ref(mockElement);
    });

    await waitFor(
      () => expect(mockObserve).toHaveBeenCalled(),
      { timeout: 1000 }
    );

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

    // Flush requestAnimationFrame callbacks
    act(() => {
      flushRaf();
    });

    await waitFor(() => {
      expect(result.current.isVisible).toBe(true);
    });

    expect(result.current.className).toBe('animate-in fade-in slide-up-8');
  });

  it('applies custom animation class when visible', async () => {
    const { result } = renderHook(() =>
      useAnimateOnView('my-custom-animation')
    );

    const mockElement = document.createElement('div');
    
    act(() => {
      result.current.ref(mockElement);
    });

    await waitFor(
      () => expect(mockObserve).toHaveBeenCalled(),
      { timeout: 1000 }
    );

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

    // Flush requestAnimationFrame callbacks
    act(() => {
      flushRaf();
    });

    await waitFor(() => {
      expect(result.current.isVisible).toBe(true);
    });

    expect(result.current.className).toBe('my-custom-animation');
  });
});

describe('useCountUp', () => {
  let observerCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null;
  let mockObserve: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockObserve = vi.fn();
    observerCallback = null;

    const MockIntersectionObserver = vi.fn().mockImplementation(
      function(this: IntersectionObserver, callback: (entries: IntersectionObserverEntry[]) => void) {
        observerCallback = callback;
        this.observe = mockObserve;
        this.unobserve = vi.fn();
        this.disconnect = vi.fn();
        return this;
      }
    );

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ref, count, and isAnimating', () => {
    const { result } = renderHook(() => useCountUp(100));

    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.ref).toBe('function');
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
    const { result } = renderHook(() => useCountUp(100));

    const mockElement = document.createElement('div');
    
    act(() => {
      result.current.ref(mockElement);
    });

    await waitFor(
      () => expect(mockObserve).toHaveBeenCalled(),
      { timeout: 1000 }
    );

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