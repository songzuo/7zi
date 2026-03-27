/**
 * useDebounce Hook Tests
 * Tests for src/hooks/useDebounce.ts
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic debouncing', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));
      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      expect(result.current).toBe('initial');

      rerender({ value: 'updated', delay: 500 });
      expect(result.current).toBe('initial'); // Still debouncing

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid value changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'a', delay: 500 } }
      );

      rerender({ value: 'b' });
      act(() => { vi.advanceTimersByTime(200); });
      expect(result.current).toBe('a');

      rerender({ value: 'c' });
      act(() => { vi.advanceTimersByTime(200); });
      expect(result.current).toBe('a');

      act(() => { vi.advanceTimersByTime(500); });
      expect(result.current).toBe('c');
    });
  });

  describe('with 0ms delay', () => {
    it('should return value immediately with 0ms delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'a', delay: 0 } }
      );
      expect(result.current).toBe('a');
      rerender({ value: 'b', delay: 0 });
      // With delay=0, setTimeout(fn, 0) still schedules async, but effect runs
      act(() => { vi.runAllTimers(); });
      expect(result.current).toBe('b');
    });
  });

  describe('with different value types', () => {
    it('should handle number values', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 42, delay: 500 } }
      );
      expect(result.current).toBe(42);
      rerender({ value: 100, delay: 500 });
      act(() => { vi.advanceTimersByTime(500); });
      expect(result.current).toBe(100);
    });

    it('should handle object values', () => {
      const obj = { key: 'value' };
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: obj, delay: 500 } }
      );
      expect(result.current).toEqual(obj);
    });

    it('should handle array values', () => {
      const arr = [1, 2, 3];
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: arr, delay: 500 } }
      );
      expect(result.current).toEqual(arr);
    });
  });
});
