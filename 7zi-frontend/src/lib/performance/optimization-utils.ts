/**
 * Performance optimization utilities and hooks
 * Includes React.memo, useMemo, useCallback patterns and animation utilities
 */

import { useEffect, useRef, useCallback, useMemo, useState, DependencyList } from 'react';

/**
 * Memoize component with deep comparison support
 */
export function memoDeepCompare<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  areEqual?: (prevProps: T, nextProps: T) => boolean
) {
  return React.memo(Component, areEqual || defaultDeepCompare);
}

/**
 * Default deep comparison function
 */
function defaultDeepCompare<T>(prevProps: T, nextProps: T): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];

    // Reference equality
    if (prevValue === nextValue) {
      continue;
    }

    // Array comparison
    if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
      if (!arraysEqual(prevValue, nextValue)) {
        return false;
      }
      continue;
    }

    // Object comparison
    if (isObject(prevValue) && isObject(nextValue)) {
      if (!objectsEqual(prevValue, nextValue)) {
        return false;
      }
      continue;
    }

    // Primitive comparison
    if (prevValue !== nextValue) {
      return false;
    }
  }

  return true;
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (isObject(a[i]) && isObject(b[i])) {
        if (!objectsEqual(a[i], b[i])) return false;
      } else {
        return false;
      }
    }
  }

  return true;
}

function objectsEqual<T extends Record<string, any>>(a: T, b: T): boolean {
  return defaultDeepCompare(a, b);
}

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Use memoized value with deep comparison
 */
export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ deps: DependencyList; value: T }>();

  if (!ref.current || !deepArrayEquals(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

function deepArrayEquals(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];

    if (av === bv) continue;

    if (isObject(av) && isObject(bv)) {
      if (!objectsEqual(av, bv)) return false;
    } else if (Array.isArray(av) && Array.isArray(bv)) {
      if (!arraysEqual(av, bv)) return false;
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Debounce hook
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Throttle hook
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRunRef.current >= delay) {
        lastRunRef.current = now;
        callbackRef.current(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastRunRef.current = Date.now();
          callbackRef.current(...args);
        }, delay - (now - lastRunRef.current));
      }
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Use intersection observer hook
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {},
  callback?: IntersectionObserverCallback
) {
  const [entries, setEntries] = useState<IntersectionObserverEntry[]>([]);
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        setEntries(entries);
        callback?.(entries, observer);
      },
      {
        rootMargin: '0px',
        threshold: 0.1,
        ...options,
      }
    );

    observerRef.current = observer;

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [options, callback]);

  const observe = useCallback((element: HTMLElement | null) => {
    targetRef.current = element;

    if (observerRef.current) {
      observerRef.current.disconnect();

      if (element) {
        observerRef.current.observe(element);
      }
    }
  }, []);

  return { entries, observe, targetRef };
}

/**
 * Use resize observer hook
 */
export function useResizeObserver(
  callback: ResizeObserverCallback,
  options: ResizeObserverOptions = {}
) {
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(callback);
    observerRef.current = observer;

    if (targetRef.current) {
      observer.observe(targetRef.current, options);
    }

    return () => {
      observer.disconnect();
    };
  }, [callback, options]);

  const observe = useCallback((element: HTMLElement | null) => {
    targetRef.current = element;

    if (observerRef.current) {
      observerRef.current.disconnect();

      if (element) {
        observerRef.current.observe(element, options);
      }
    }
  }, [options]);

  return { observe, targetRef };
}

/**
 * High-performance animation utilities
 */

/**
 * Create optimized animation using transform and opacity only
 */
export function createOptimizedAnimation(
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {}
): KeyframeEffect {
  return new KeyframeEffect(null, keyframes, {
    duration: 300,
    easing: 'ease-out',
    ...options,
  });
}

/**
 * Animate element with transform (GPU-accelerated)
 */
export function animateTransform(
  element: HTMLElement,
  from: { x: number; y: number; scale?: number; rotate?: number },
  to: { x: number; y: number; scale?: number; rotate?: number },
  duration: number = 300,
  easing: string = 'ease-out'
): Animation {
  const animation = element.animate(
    [
      {
        transform: `translate(${from.x}px, ${from.y}px) scale(${from.scale ?? 1}) rotate(${from.rotate ?? 0}deg)`,
      },
      {
        transform: `translate(${to.x}px, ${to.y}px) scale(${to.scale ?? 1}) rotate(${to.rotate ?? 0}deg)`,
      },
    ],
    {
      duration,
      easing,
      fill: 'forwards',
    }
  );

  return animation;
}

/**
 * Animate opacity (GPU-accelerated)
 */
export function animateOpacity(
  element: HTMLElement,
  from: number,
  to: number,
  duration: number = 300,
  easing: string = 'ease-out'
): Animation {
  const animation = element.animate(
    [
      { opacity: from },
      { opacity: to },
    ],
    {
      duration,
      easing,
      fill: 'forwards',
    }
  );

  return animation;
}

/**
 * Fade in animation
 */
export function fadeIn(
  element: HTMLElement,
  duration: number = 300,
  delay: number = 0
): Animation {
  const animation = element.animate(
    [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    {
      duration,
      delay,
      easing: 'ease-out',
      fill: 'forwards',
    }
  );

  return animation;
}

/**
 * Fade out animation
 */
export function fadeOut(
  element: HTMLElement,
  duration: number = 300,
  delay: number = 0
): Animation {
  const animation = element.animate(
    [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(10px)' },
    ],
    {
      duration,
      delay,
      easing: 'ease-in',
      fill: 'forwards',
    }
  );

  return animation;
}

/**
 * Slide in animation
 */
export function slideIn(
  element: HTMLElement,
  direction: 'left' | 'right' | 'up' | 'down' = 'right',
  duration: number = 300
): Animation {
  const transforms = {
    left: 'translateX(-100%)',
    right: 'translateX(100%)',
    up: 'translateY(-100%)',
    down: 'translateY(100%)',
  };

  const animation = element.animate(
    [
      { transform: transforms[direction] },
      { transform: 'translate(0)' },
    ],
    {
      duration,
      easing: 'ease-out',
      fill: 'forwards',
    }
  );

  return animation;
}

/**
 * Scale animation
 */
export function scaleIn(
  element: HTMLElement,
  from: number = 0.8,
  to: number = 1,
  duration: number = 300
): Animation {
  const animation = element.animate(
    [
      { transform: `scale(${from})`, opacity: 0 },
      { transform: `scale(${to})`, opacity: 1 },
    ],
    {
      duration,
      easing: 'ease-out',
      fill: 'forwards',
    }
  );

  return animation;
}

/**
 * Use idle callback hook - schedules work during browser idle periods
 */
export function useIdleCallback(
  callback: () => void,
  deps: DependencyList = []
) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('requestIdleCallback' in window)) {
      callback();
      return;
    }

    const id = requestIdleCallback(() => {
      callback();
    });

    return () => {
      cancelIdleCallback(id);
    };
  }, deps);
}

/**
 * Use animation frame hook - schedules work for next repaint
 */
export function useAnimationFrame(callback: () => void, deps: DependencyList = []) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      callback();
    });

    return () => {
      cancelAnimationFrame(id);
    };
  }, deps);
}

/**
 * Measure layout with minimal reflows
 */
export function measureLayout(element: HTMLElement): {
  width: number;
  height: number;
  top: number;
  left: number;
} {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
  };
}

/**
 * Batch DOM reads and writes
 */
export function batchDOMUpdates(reads: (() => void)[], writes: (() => void)[]): void {
  // Perform all reads first
  const readResults = reads.map(read => read());

  // Then perform all writes
  requestAnimationFrame(() => {
    writes.forEach((write, index) => {
      write();
    });
  });

  return readResults as any;
}

/**
 * Prevent layout thrashing by batching DOM operations
 */
export function useLayoutStabilizer<T>(
  fn: () => T,
  deps: DependencyList
): T {
  const [result, setResult] = useState<T>(fn());

  useEffect(() => {
    requestAnimationFrame(() => {
      setResult(fn());
    });
  }, deps);

  return result;
}
