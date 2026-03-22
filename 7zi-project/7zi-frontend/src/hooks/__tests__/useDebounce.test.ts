import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useDebounceWithCancel } from '../useDebounce';

describe('useDebounceWithCancel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该防抖值更新', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, options }) => useDebounceWithCancel(value, options),
      {
        initialProps: {
          value: 'initial',
          options: { delay: 500, onChange },
        },
      }
    );

    expect(result.current[0]).toBe('initial');

    // 更新值
    rerender({ value: 'updated', options: { delay: 500, onChange } });

    // 立即检查，值还没更新
    expect(result.current[0]).toBe('initial');
    expect(onChange).not.toHaveBeenCalled();

    // 推进时间到 delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 现在值应该更新了
    expect(result.current[0]).toBe('updated');
    expect(onChange).toHaveBeenCalledWith('updated');

    vi.useRealTimers();
  });

  it('应该能取消待处理的更新', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, options }) => useDebounceWithCancel(value, options),
      {
        initialProps: {
          value: 'initial',
          options: { delay: 500, onChange },
        },
      }
    );

    expect(result.current[0]).toBe('initial');

    // 触发一个值更新
    rerender({ value: 'updated', options: { delay: 500, onChange } });

    expect(result.current[0]).toBe('initial');
    expect(onChange).not.toHaveBeenCalled();

    // 调用 cancel 函数取消待处理的更新
    act(() => {
      result.current[1]();
    });

    // 推进时间，确保 onChange 不会被调用
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current[0]).toBe('initial');

    vi.useRealTimers();
  });

  it('取消后立即生效，不再等待 timeout', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, options }) => useDebounceWithCancel(value, options),
      {
        initialProps: {
          value: 'initial',
          options: { delay: 500, onChange },
        },
      }
    );

    // 更新值
    rerender({ value: 'updated', options: { delay: 500, onChange } });

    // 等待 400ms，timeout 还未触发
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current[0]).toBe('initial');
    expect(onChange).not.toHaveBeenCalled();

    // 取消更新
    act(() => {
      result.current[1]();
    });

    // 立即验证 timeout 已被清除（再等 100ms）
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current[0]).toBe('initial');

    vi.useRealTimers();
  });

  it('连续多次取消不应该有副作用', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, options }) => useDebounceWithCancel(value, options),
      {
        initialProps: {
          value: 'initial',
          options: { delay: 500, onChange },
        },
      }
    );

    rerender({ value: 'value1', options: { delay: 500, onChange } });

    // 连续多次取消
    act(() => {
      result.current[1]();
      result.current[1]();
      result.current[1]();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onChange).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('取消后再更新应该正常工作', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, options }) => useDebounceWithCancel(value, options),
      {
        initialProps: {
          value: 'initial',
          options: { delay: 500, onChange },
        },
      }
    );

    // 第一次更新
    rerender({ value: 'value1', options: { delay: 500, onChange } });

    // 取消
    act(() => {
      result.current[1]();
    });

    // 第二次更新
    rerender({ value: 'value2', options: { delay: 500, onChange } });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current[0]).toBe('value2');
    expect(onChange).toHaveBeenCalledWith('value2');

    vi.useRealTimers();
  });

  it('应该支持 maxWait', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, options }) => useDebounceWithCancel(value, options),
      {
        initialProps: {
          value: 'initial',
          options: { delay: 500, maxWait: 1000, onChange },
        },
      }
    );

    rerender({ value: 'updated', options: { delay: 500, maxWait: 1000, onChange } });

    // 等待 maxWait 时间，应该触发更新
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current[0]).toBe('updated');
    expect(onChange).toHaveBeenCalledWith('updated');

    vi.useRealTimers();
  });

  it('maxWait 也可以被取消', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, options }) => useDebounceWithCancel(value, options),
      {
        initialProps: {
          value: 'initial',
          options: { delay: 500, maxWait: 1000, onChange },
        },
      }
    );

    rerender({ value: 'updated', options: { delay: 500, maxWait: 1000, onChange } });

    // 等待 600ms（超过 delay 但未到 maxWait）
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // 取消
    act(() => {
      result.current[1]();
    });

    // 继续等到 maxWait
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onChange).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('enabled=false 时应该直接返回值', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value, options }) => useDebounceWithCancel(value, options),
      {
        initialProps: {
          value: 'initial',
          options: { delay: 500, enabled: false, onChange },
        },
      }
    );

    expect(result.current[0]).toBe('initial');

    rerender({ value: 'updated', options: { delay: 500, enabled: false, onChange } });

    // 立即更新，不需要等待
    expect(result.current[0]).toBe('updated');
    expect(onChange).toHaveBeenCalledWith('updated');

    vi.useRealTimers();
  });
});
