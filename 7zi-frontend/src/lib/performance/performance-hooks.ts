/**
 * Performance optimization hooks for mobile optimization
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export { useDebounce, useThrottle } from './optimization-utils';

/**
 * useNetworkStatus - Monitor network connectivity status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connection, setConnection] = useState<{
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get connection info if available
    const nav = navigator as any;
    if (nav.connection) {
      const updateConnection = () => {
        const conn = nav.connection;
        setConnection({
          effectiveType: conn.effectiveType || 'unknown',
          downlink: conn.downlink || 0,
          rtt: conn.rtt || 0,
          saveData: conn.saveData || false,
        });
      };

      updateConnection();
      nav.connection.addEventListener('change', updateConnection);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connection };
}

/**
 * useMediaQuery - Responsive design hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * useViewportSize - Get current viewport dimensions
 */
export function useViewportSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * useIsMobile - Detect mobile device
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}

/**
 * useIsTablet - Detect tablet device
 */
export function useIsTablet(breakpoint: number = 768, tabletBreakpoint: number = 1024): boolean {
  const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
  const isTablet = useMediaQuery(
    `(min-width: ${breakpoint}px) and (max-width: ${tabletBreakpoint - 1}px)`
  );

  return !isMobile && isTablet;
}

/**
 * useIsTouchDevice - Detect touch device
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

/**
 * usePrefersReducedMotion - Detect reduced motion preference
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * useIdle - Detect user idle state
 */
export function useIdle(timeout: number = 60000): boolean {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resetTimer = () => {
      setIsIdle(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, timeout);
    };

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Start timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeout]);

  return isIdle;
}

/**
 * useLocalStorage - Sync state with localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/**
 * useSessionStorage - Sync state with sessionStorage
 */
export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/**
 * useDevicePerformance - Get device performance metrics
 */
export function useDevicePerformance() {
  const [performance, setPerformance] = useState({
    hardwareConcurrency: 0,
    deviceMemory: 0,
    connectionSpeed: 'unknown',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nav = navigator as any;

    setPerformance({
      hardwareConcurrency: nav.hardwareConcurrency || 0,
      deviceMemory: nav.deviceMemory || 0,
      connectionSpeed: nav.connection?.effectiveType || 'unknown',
    });
  }, []);

  return performance;
}

/**
 * usePageVisibility - Track page visibility
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * useMemoryUsage - Track memory usage (Chrome only)
 */
export function useMemoryUsage() {
  const [memory, setMemory] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nav = navigator as any;

    if (nav.deviceMemory) {
      const updateMemory = () => {
        if ('memory' in nav.performance) {
          const mem = (nav.performance as any).memory;
          setMemory({
            usedJSHeapSize: mem.usedJSHeapSize,
            totalJSHeapSize: mem.totalJSHeapSize,
            jsHeapSizeLimit: mem.jsHeapSizeLimit,
          });
        }
      };

      updateMemory();

      const interval = setInterval(updateMemory, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  return memory;
}

/**
 * useAsyncImport - Dynamic import with loading state
 */
export function useAsyncImport<T>(importFn: () => Promise<{ default: T }>) {
  const [state, setState] = useState<{
    component: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    component: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    importFn()
      .then(module => {
        if (mounted) {
          setState({ component: module.default, loading: false, error: null });
        }
      })
      .catch(error => {
        if (mounted) {
          setState({ component: null, loading: false, error });
        }
      });

    return () => {
      mounted = false;
    };
  }, [importFn]);

  return state;
}

/**
 * useIntersection - Simple intersection observer hook
 */
export function useIntersection(
  elementRef: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !elementRef.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [elementRef, options]);

  return isIntersecting;
}

/**
 * useScrollPosition - Track scroll position with throttling
 */
export function useScrollPosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const updatePosition = () => {
      setPosition({ x: window.scrollX, y: window.scrollY });
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updatePosition);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updatePosition();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return position;
}
