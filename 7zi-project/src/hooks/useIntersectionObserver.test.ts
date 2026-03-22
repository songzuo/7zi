import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useIntersectionObserver,
  useAnimateOnView,
  useCountUp,
} from './useIntersectionObserver';

describe('IntersectionObserver Hooks', () => {
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    originalIntersectionObserver = window.IntersectionObserver;
    
    // Simple mock that doesn't require real DOM
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    window.IntersectionObserver = originalIntersectionObserver;
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('useIntersectionObserver', () => {
    it('应该返回 ref、isIntersecting 和 entry', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      expect(result.current).toHaveProperty('ref');
      expect(result.current).toHaveProperty('isIntersecting');
      expect(result.current).toHaveProperty('entry');
      expect(result.current.isIntersecting).toBe(false);
      expect(result.current.entry).toBeUndefined();
    });

    it('初始时 isIntersecting 应该为 false', () => {
      const { result } = renderHook(() => useIntersectionObserver());
      expect(result.current.isIntersecting).toBe(false);
    });

    it('应该接受默认选项', () => {
      const { result } = renderHook(() => useIntersectionObserver({}));
      // Verify hook returns proper structure
      expect(result.current.ref).toBeDefined();
      expect(typeof result.current.isIntersecting).toBe('boolean');
    });

    it('应该接受 threshold 选项', () => {
      const { result } = renderHook(() => useIntersectionObserver({ threshold: 0.5 }));
      expect(result.current.ref).toBeDefined();
    });

    it('应该接受 rootMargin 选项', () => {
      const { result } = renderHook(() => useIntersectionObserver({ rootMargin: '10px' }));
      expect(result.current.ref).toBeDefined();
    });

    it('应该接受 triggerOnce 选项', () => {
      const { result } = renderHook(() => useIntersectionObserver({ triggerOnce: true }));
      expect(result.current.ref).toBeDefined();
    });

    it('应该接受 freezeOnceVisible 选项', () => {
      const { result } = renderHook(() => useIntersectionObserver({ freezeOnceVisible: true }));
      expect(result.current.ref).toBeDefined();
    });

    it('应该接受多个选项', () => {
      const { result } = renderHook(() => useIntersectionObserver({
        threshold: 0.5,
        rootMargin: '20px',
        triggerOnce: true,
      }));
      expect(result.current.ref).toBeDefined();
    });

    it('组件卸载时应该正确清理', () => {
      const { unmount } = renderHook(() => useIntersectionObserver());
      unmount();
      // 测试确保没有错误抛出
    });
  });

  describe('useAnimateOnView', () => {
    it('应该返回 ref、isVisible 和 className', () => {
      const { result } = renderHook(() => useAnimateOnView());

      expect(result.current).toHaveProperty('ref');
      expect(result.current).toHaveProperty('isVisible');
      expect(result.current).toHaveProperty('className');
    });

    it('初始时 isVisible 应该为 false，className 应该包含 opacity-0', () => {
      const { result } = renderHook(() => useAnimateOnView());

      expect(result.current.isVisible).toBe(false);
      expect(result.current.className).toBe('opacity-0');
    });

    it('应该使用默认动画类', () => {
      const { result } = renderHook(() => useAnimateOnView());
      expect(result.current.className).toBe('opacity-0');
    });

    it('应该支持自定义动画类参数', () => {
      const { result } = renderHook(() =>
        useAnimateOnView('custom-animation')
      );
      // 初始仍然是 opacity-0
      expect(result.current.className).toBe('opacity-0');
    });

    it('应该支持自定义选项', () => {
      const { result } = renderHook(() => useAnimateOnView('animate', { threshold: 0.5 }));
      expect(result.current.ref).toBeDefined();
    });

    it('应该接受默认选项参数', () => {
      const { result } = renderHook(() => useAnimateOnView());
      expect(result.current.className).toBe('opacity-0');
      expect(result.current.isVisible).toBe(false);
    });
  });

  describe('useCountUp', () => {
    it('应该返回 ref、count 和 isAnimating', () => {
      const { result } = renderHook(() => useCountUp(100));

      expect(result.current).toHaveProperty('ref');
      expect(result.current).toHaveProperty('count');
      expect(result.current).toHaveProperty('isAnimating');
      expect(result.current.count).toBe(0);
      expect(result.current.isAnimating).toBe(false);
    });

    it('初始时 count 应该为 0', () => {
      const { result } = renderHook(() => useCountUp(1000));
      expect(result.current.count).toBe(0);
    });

    it('动画完成前 isAnimating 应该为 false', () => {
      const { result } = renderHook(() => useCountUp(100));
      expect(result.current.isAnimating).toBe(false);
    });

    it('应该接受自定义持续时间', () => {
      const { result } = renderHook(() => useCountUp(100, 5000));
      expect(result.current.count).toBe(0);
    });

    it('应该接受自定义 threshold 选项', () => {
      const { result } = renderHook(() => useCountUp(100, 2000, { threshold: 0.8 }));
      expect(result.current.ref).toBeDefined();
      expect(result.current.count).toBe(0);
    });

    it('应该接受自定义 rootMargin 选项', () => {
      const { result } = renderHook(() => useCountUp(100, 2000, { rootMargin: '10px' }));
      expect(result.current.ref).toBeDefined();
      expect(result.current.count).toBe(0);
    });

    it('应该接受完整的自定义选项', () => {
      const { result } = renderHook(() => useCountUp(100, 2000, {
        threshold: 0.5,
        rootMargin: '20px',
      }));
      expect(result.current.ref).toBeDefined();
      expect(result.current.count).toBe(0);
    });

    it('组件卸载时应该正确清理', () => {
      const { unmount } = renderHook(() => useCountUp(100));
      unmount();
      // 测试确保没有错误抛出
    });
  });
});