/**
 * @fileoverview useIntersectionObserver hook tests
 * 
 * Note: These tests verify the hook's API and initial state.
 * The IntersectionObserver is only created when ref.current is set,
 * so we only test the initial state and API here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useIntersectionObserver,
  useAnimateOnView,
  useCountUp,
} from '../../hooks/useIntersectionObserver';

// Mock IntersectionObserver
vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})));

// Mock requestAnimationFrame and cancelAnimationFrame
vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
  return setTimeout(() => cb(Date.now()), 16);
}));
vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
  clearTimeout(id);
}));

describe('useIntersectionObserver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    // Just verify hooks can be created with various options
    const { result: r1 } = renderHook(() => useIntersectionObserver({ threshold: 0.5 }));
    expect(r1.current.isIntersecting).toBe(false);

    const { result: r2 } = renderHook(() => useIntersectionObserver({ rootMargin: '10px' }));
    expect(r2.current.isIntersecting).toBe(false);

    const { result: r3 } = renderHook(() => useIntersectionObserver({ triggerOnce: true }));
    expect(r3.current.isIntersecting).toBe(false);

    const { result: r4 } = renderHook(() => useIntersectionObserver({ freezeOnceVisible: true }));
    expect(r4.current.isIntersecting).toBe(false);
  });
});

describe('useAnimateOnView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    // Initially invisible with opacity-0
    expect(result.current.className).toBe('opacity-0');
    expect(result.current.isVisible).toBe(false);
  });

  it('uses default animation class when no argument provided', () => {
    const { result } = renderHook(() => useAnimateOnView());

    // Initially invisible
    expect(result.current.className).toBe('opacity-0');
  });
});

describe('useCountUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
