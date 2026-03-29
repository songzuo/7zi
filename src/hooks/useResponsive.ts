/**
 * @fileoverview Responsive Utility Hooks
 * @description 响应式设计和移动端优化的 Hooks
 *
 * Features:
 * - 屏幕尺寸检测
 * - 触摸设备检测
 * - 手势支持（滑动、捏合等）
 * - 响应式断点
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ScreenSize {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface SwipeGestureState {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  deltaX: number;
  deltaY: number;
  startX: number;
  startY: number;
}

export interface TouchTargetConfig {
  minSize: number; // 最小触摸目标大小 (px)
  padding: number; // 触摸目标内边距 (px)
}

// ============================================================================
// Breakpoint Configuration
// ============================================================================

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// ============================================================================
// useScreenSize Hook
// ============================================================================

/**
 * 获取当前屏幕尺寸和断点信息
 */
export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        breakpoint: 'lg',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width);

    return {
      width,
      height,
      breakpoint,
      isMobile: breakpoint === 'xs' || breakpoint === 'sm',
      isTablet: breakpoint === 'md',
      isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const breakpoint = getBreakpoint(width);

      setScreenSize({
        width,
        height,
        breakpoint,
        isMobile: breakpoint === 'xs' || breakpoint === 'sm',
        isTablet: breakpoint === 'md',
        isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

// ============================================================================
// useIsTouchDevice Hook
// ============================================================================

/**
 * 检测是否为触摸设备
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  return isTouch;
}

// ============================================================================
// useMediaQuery Hook
// ============================================================================

/**
 * 响应式媒体查询 Hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// ============================================================================
// useSwipeGesture Hook
// ============================================================================

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // 滑动阈值 (px)
  preventDefaultOnSwipe?: boolean;
}

/**
 * 滑动手势 Hook
 *
 * @example
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => handleNext(),
 *   onSwipeRight: () => handlePrev(),
 * });
 *
 * <div {...swipeHandlers}>...</div>
 */
export function useSwipeGesture(config: SwipeConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultOnSwipe = false,
  } = config;

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchEnd.x - touchStart.current.x;
    const deltaY = touchEnd.y - touchStart.current.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // 水平滑动
    if (absX > absY && absX > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
      if (preventDefaultOnSwipe) {
        e.preventDefault();
      }
    }
    // 垂直滑动
    else if (absY > absX && absY > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
      if (preventDefaultOnSwipe) {
        e.preventDefault();
      }
    }

    touchStart.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, preventDefaultOnSwipe]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

// ============================================================================
// useTouchTarget Hook
// ============================================================================

/**
 * 确保触摸目标大小符合可访问性标准
 * 最小触摸目标大小应为 44x44px (WCAG 2.1)
 */
export function useTouchTarget(config: TouchTargetConfig = { minSize: 44, padding: 8 }) {
  const { minSize, padding } = config;

  return {
    style: {
      minWidth: `${minSize}px`,
      minHeight: `${minSize}px`,
      padding: `${padding}px`,
    },
    'data-touch-target': 'true',
  };
}

// ============================================================================
// useLongPress Hook
// ============================================================================

interface LongPressConfig {
  onLongPress: () => void;
  delay?: number; // 长按延迟 (ms)
  onPressStart?: () => void;
  onPressEnd?: () => void;
}

/**
 * 长按手势 Hook
 */
export function useLongPress(config: LongPressConfig) {
  const { onLongPress, delay = 500, onPressStart, onPressEnd } = config;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleStart = useCallback(() => {
    isLongPress.current = false;
    onPressStart?.();

    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay, onPressStart]);

  const handleEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onPressEnd?.();
  }, [onPressEnd]);

  const handleMove = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchMove: handleMove,
  };
}

// ============================================================================
// usePrefersReducedMotion Hook
// ============================================================================

/**
 * 检测用户是否偏好减少动画
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

// ============================================================================
// useBreakpoint Hook
// ============================================================================

/**
 * 检测当前断点
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
}

// ============================================================================
// useResponsiveValue Hook
// ============================================================================

/**
 * 根据断点返回不同的值
 *
 * @example
 * const columns = useResponsiveValue({
 *   xs: 1,
 *   md: 2,
 *   lg: 3,
 * });
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
  const { breakpoint } = useScreenSize();

  // 按断点优先级查找值
  const priority: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = priority.indexOf(breakpoint);

  for (let i = currentIndex; i < priority.length; i++) {
    const bp = priority[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  useScreenSize,
  useIsTouchDevice,
  useMediaQuery,
  useSwipeGesture,
  useTouchTarget,
  useLongPress,
  usePrefersReducedMotion,
  useBreakpoint,
  useResponsiveValue,
};
