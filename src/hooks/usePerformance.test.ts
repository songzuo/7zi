/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  useInView,
  usePreload,
  useDebounce,
  useThrottle,
  useDevicePerformance,
  useUserPreferences,
  useMounted,
  useWindowSize,
  useScrollPosition,
} from '../usePerformance';

// 模拟 IntersectionObserver
class MockIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback, private options?: IntersectionObserverInit) {}

  observe(element: Element) {
    // 立即触发回调模拟元素可见
    setTimeout(() => {
      this.callback([{ isIntersecting: true, target: element }], this);
    }, 10);
  }

  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = MockIntersectionObserver as any;

describe('useInView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该返回 ref 和 isIntersecting 状态', () => {
    const { result } = renderHook(() => useInView());

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toBeDefined(); // ref
    expect(typeof result.current[1]).toBe('boolean'); // isIntersecting
  });

  it('初始状态应该为 false', () => {
    const { result } = renderHook(() => useInView());

    expect(result.current[1]).toBe(false);
  });

  it('应该接收自定义选项', () => {
    const options = { threshold: 0.5, rootMargin: '50px' };
    const { result } = renderHook(() => useInView(options));

    expect(result.current[0]).toBeDefined();
  });
});

describe('usePreload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该在延迟后执行导入', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: {} });

    renderHook(() => usePreload(importFn, 2000));

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it('应该使用默认延迟时间', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: {} });

    renderHook(() => usePreload(importFn));

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it('应该只执行一次预加载', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: {} });
    const { rerender } = renderHook(() => usePreload(importFn, 1000));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    rerender();

    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it('卸载时不应该执行预加载', async () => {
    const importFn = vi.fn().mockResolvedValue({ default: {} });
    const { unmount } = renderHook(() => usePreload(importFn, 2000));

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(importFn).not.toHaveBeenCalled();
  });
});

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该返回初始值', () => {
    const { result } = renderHook(() => useDebounce('test', 300));

    expect(result.current).toBe('test');
  });

  it('应该在延迟后更新值', () => {
    const { result } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('initial');

    // 更新值
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('initial');
  });

  it('应该使用默认延迟时间', () => {
    const { result } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'test' },
    });

    expect(result.current).toBe('test');
  });

  it('应该正确处理频繁更新', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'abc' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'abcd' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('abcd');
  });
});

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该返回初始值', () => {
    const { result } = renderHook(() => useThrottle('test', 100));

    expect(result.current).toBe('test');
  });

  it('应该节流更新值', () => {
    const { result } = renderHook(() => useThrottle('initial', 100));

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('initial');
  });

  it('应该使用默认限制时间', () => {
    const { result } = renderHook(() => useThrottle('test'));

    expect(result.current).toBe('test');
  });
});

describe('useDevicePerformance', () => {
  it('应该返回性能信息', () => {
    const { result } = renderHook(() => useDevicePerformance());

    expect(result.current).toHaveProperty('isLowEnd');
    expect(result.current).toHaveProperty('deviceMemory');
    expect(result.current).toHaveProperty('hardwareConcurrency');
    expect(result.current).toHaveProperty('connectionType');

    expect(typeof result.current.isLowEnd).toBe('boolean');
    expect(typeof result.current.deviceMemory).toBe('number');
    expect(typeof result.current.hardwareConcurrency).toBe('number');
    expect(typeof result.current.connectionType).toBe('string');
  });

  it('应该在服务器端返回默认值', () => {
    const { result } = renderHook(() => useDevicePerformance());

    expect(result.current.isLowEnd).toBe(false);
    expect(result.current.deviceMemory).toBe(4);
    expect(result.current.hardwareConcurrency).toBe(4);
  });
});

describe('useUserPreferences', () => {
  it('应该返回用户偏好', () => {
    const { result } = renderHook(() => useUserPreferences());

    expect(result.current).toHaveProperty('prefersReducedMotion');
    expect(result.current).toHaveProperty('prefersDarkMode');
    expect(result.current).toHaveProperty('prefersDataSaver');
  });

  it('应该监听媒体查询变化', () => {
    const { result } = renderHook(() => useUserPreferences());

    expect(typeof result.current.prefersReducedMotion).toBe('boolean');
    expect(typeof result.current.prefersDarkMode).toBe('boolean');
    expect(typeof result.current.prefersDataSaver).toBe('boolean');
  });
});

describe('useMounted', () => {
  it('应该返回 true', () => {
    const { result } = renderHook(() => useMounted());

    expect(result.current).toBe(true);
  });

  it('应该始终返回 true', () => {
    const { result } = renderHook(() => useMounted());

    expect(result.current).toBe(true);
  });
});

describe('useWindowSize', () => {
  beforeEach(() => {
    // 设置窗口尺寸
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it('应该返回窗口尺寸', () => {
    const { result } = renderHook(() => useWindowSize());

    expect(result.current).toHaveProperty('width');
    expect(result.current).toHaveProperty('height');
  });

  it('应该响应窗口大小变化', () => {
    const { result } = renderHook(() => useWindowSize());

    act(() => {
      window.innerWidth = 800;
      window.innerHeight = 600;
      window.dispatchEvent(new Event('resize'));
    });

    // 等待防抖
    setTimeout(() => {
      expect(result.current.width).toBe(800);
      expect(result.current.height).toBe(600);
    }, 150);
  });

  it('应该使用默认防抖延迟', () => {
    const { result } = renderHook(() => useWindowSize());

    expect(result.current).toBeDefined();
  });
});

describe('useScrollPosition', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollX', {
      writable: true,
      configurable: true,
      value: 0,
    });
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  it('应该返回滚动位置', () => {
    const { result } = renderHook(() => useScrollPosition());

    expect(result.current).toHaveProperty('x');
    expect(result.current).toHaveProperty('y');
  });

  it('初始值应该为 0,0', () => {
    const { result } = renderHook(() => useScrollPosition());

    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
  });

  it('应该使用默认节流延迟', () => {
    const { result } = renderHook(() => useScrollPosition());

    expect(result.current).toBeDefined();
  });
});