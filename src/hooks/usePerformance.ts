'use client';

/**
 * @fileoverview 性能优化 Hook
 * @description 提供性能监控和优化相关的 React Hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 视口检测 Hook
 * @param options IntersectionObserver 配置
 * @returns [ref, isIntersecting]
 */
export function useInView(options: IntersectionObserverInit = {}) {
  const ref = useRef<Element>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { rootMargin: '100px', threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return [ref, isIntersecting] as const;
}

/**
 * 组件预加载 Hook
 * @param importFn 动态导入函数
 * @param delay 预加载延迟(ms)
 */
export function usePreload(
  importFn: () => Promise<unknown>,
  delay: number = 2000
) {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    if (hasPreloaded.current) return;

    const timer = setTimeout(() => {
      importFn();
      hasPreloaded.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [importFn, delay]);
}

/**
 * 防抖 Hook
 * @param value 需要防抖的值
 * @param delay 延迟时间(ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流 Hook
 * @param value 需要节流的值
 * @param limit 时间限制(ms)
 */
export function useThrottle<T>(value: T, limit: number = 100): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

/**
 * 检测设备性能 Hook
 * @returns 设备性能等级和相关信息
 */
export function useDevicePerformance() {
  const [performance, setPerformance] = useState({
    isLowEnd: false,
    deviceMemory: 4,
    hardwareConcurrency: 4,
    connectionType: 'unknown',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
      connection?: { effectiveType?: string };
    };

    const deviceMemory = nav.deviceMemory || 4;
    const hardwareConcurrency = nav.hardwareConcurrency || 4;
    const connectionType = nav.connection?.effectiveType || 'unknown';
    const isLowEnd = deviceMemory < 4 || hardwareConcurrency < 4;

    setPerformance({
      isLowEnd,
      deviceMemory,
      hardwareConcurrency,
      connectionType,
    });
  }, []);

  return performance;
}

/**
 * 检测用户偏好 Hook
 * @returns 用户偏好设置
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState({
    prefersReducedMotion: false,
    prefersDarkMode: false,
    prefersDataSaver: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
    const dataSaver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData || false;

    const updatePreferences = () => {
      setPreferences({
        prefersReducedMotion: reducedMotion.matches,
        prefersDarkMode: darkMode.matches,
        prefersDataSaver: dataSaver,
      });
    };

    updatePreferences();

    reducedMotion.addEventListener('change', updatePreferences);
    darkMode.addEventListener('change', updatePreferences);

    return () => {
      reducedMotion.removeEventListener('change', updatePreferences);
      darkMode.removeEventListener('change', updatePreferences);
    };
  }, []);

  return preferences;
}

/**
 * 组件挂载状态 Hook
 * @returns 是否已挂载
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted;
}

/**
 * 窗口尺寸 Hook (优化版)
 * @param debounceMs 防抖延迟
 */
export function useWindowSize(debounceMs: number = 100) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const updateSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, debounceMs);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeoutId);
    };
  }, [debounceMs]);

  return size;
}

/**
 * 滚动位置 Hook (节流优化)
 * @param throttleMs 节流延迟
 */
export function useScrollPosition(throttleMs: number = 100) {
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const lastCall = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastCall.current < throttleMs) return;

      lastCall.current = now;
      setScroll({
        x: window.scrollX,
        y: window.scrollY,
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [throttleMs]);

  return scroll;
}

export default {
  useInView,
  usePreload,
  useDebounce,
  useThrottle,
  useDevicePerformance,
  useUserPreferences,
  useMounted,
  useWindowSize,
  useScrollPosition,
};