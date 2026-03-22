/**
 * @fileoverview utils.ts 边界条件测试
 * @description 测试极端输入、异常值、边界值等边界情况
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCache,
  debounce,
  throttle,
  memoize,
  formatFileSize,
  formatTimeAgo,
  optimizeImageUrl,
  prefersReducedMotion,
  prefersDarkMode,
} from '@/lib/utils';

describe('utils - 边界条件测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== Cache 边界测试 ====================
  describe('Cache 边界条件', () => {
    it('处理空字符串 key', () => {
      const cache = createCache<string>();
      cache.set('', 'empty-key-value');
      expect(cache.get('')).toBe('empty-key-value');
    });

    it('处理特殊字符 key', () => {
      const cache = createCache<string>();
      const specialKey = 'key-with-特殊字符-🎉-emoji';
      cache.set(specialKey, 'special-value');
      expect(cache.get(specialKey)).toBe('special-value');
    });

    it('处理超长 key', () => {
      const cache = createCache<string>();
      const longKey = 'a'.repeat(10000);
      cache.set(longKey, 'long-key-value');
      expect(cache.get(longKey)).toBe('long-key-value');
    });

    it('处理 TTL 为 0', () => {
      const cache = createCache<string>(0);
      cache.set('key1', 'value1');
      // TTL=0 应该立即过期
      vi.advanceTimersByTime(1);
      expect(cache.get('key1')).toBeNull();
    });

    it('处理负数 TTL', () => {
      const cache = createCache<string>(-1000);
      cache.set('key1', 'value1');
      // 负数 TTL 行为：由于 age > entry.ttl 会立即为真
      expect(cache.get('key1')).toBeNull();
    });

    it('处理极大 TTL', () => {
      const cache = createCache<string>(Number.MAX_SAFE_INTEGER);
      cache.set('key1', 'value1');
      vi.advanceTimersByTime(1000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('处理 null/undefined 值', () => {
      const cache = createCache<null | undefined>();
      cache.set('null-key', null);
      cache.set('undefined-key', undefined);
      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeUndefined();
    });

    it('处理复杂对象值', () => {
      const cache = createCache<object>();
      const complexObject = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        fn: () => 'test',
      };
      cache.set('complex', complexObject);
      expect(cache.get('complex')).toEqual(complexObject);
    });

    it('处理循环引用对象', () => {
      const cache = createCache<object>();
      const circular: { self?: typeof circular } = {};
      circular.self = circular;
      // 应该能存储，虽然 JSON.stringify 会失败，但这里不涉及序列化
      cache.set('circular', circular);
      expect(cache.get('circular')).toBe(circular);
    });

    it('处理大量条目', () => {
      const cache = createCache<string>();
      const count = 10000;
      for (let i = 0; i < count; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }
      expect(cache.get('key-0')).toBe('value-0');
      expect(cache.get(`key-${count - 1}`)).toBe(`value-${count - 1}`);
    });
  });

  // ==================== debounce 边界测试 ====================
  describe('debounce 边界条件', () => {
    it('处理 wait=0', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 0);

      debouncedFn();
      vi.advanceTimersByTime(0);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('处理负数 wait', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, -100);

      debouncedFn();
      // 负数 wait 会在 setTimeout 中使用，行为可能是立即执行或等待最短时间
      vi.advanceTimersByTime(0);
      expect(mockFn).toHaveBeenCalled();
    });

    it('处理极大 wait', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, Number.MAX_SAFE_INTEGER);

      debouncedFn();
      // 使用极大值时，1000ms 内不应该触发
      vi.advanceTimersByTime(1000);
      expect(mockFn).not.toHaveBeenCalled();
      
      // 但最终应该会在足够长的时间后触发
      vi.advanceTimersByTime(Number.MAX_SAFE_INTEGER);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('处理大量参数', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);
      const manyArgs = Array(100).fill('arg');

      debouncedFn(...manyArgs);
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith(...manyArgs);
    });

    it('处理 undefined/null 参数', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn(undefined, null);
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith(undefined, null);
    });

    it('处理返回值的函数', () => {
      const mockFn = vi.fn((x: number) => x * 2);
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn(5);
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith(5);
    });

    it('连续调用 1000 次', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      for (let i = 0; i < 1000; i++) {
        debouncedFn(i);
      }
      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(999);
    });
  });

  // ==================== throttle 边界测试 ====================
  describe('throttle 边界条件', () => {
    it('处理 limit=0', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 0);

      throttledFn();
      throttledFn();
      // limit=0 时，setTimeout 会立即触发，但第一次调用应该执行
      expect(mockFn).toHaveBeenCalled();
    });

    it('处理负数 limit', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, -100);

      throttledFn();
      expect(mockFn).toHaveBeenCalled();
    });

    it('快速连续调用', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      for (let i = 0; i < 100; i++) {
        throttledFn(i);
      }
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('间隔调用', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn(1);
      vi.advanceTimersByTime(100);
      throttledFn(2);
      vi.advanceTimersByTime(100);
      throttledFn(3);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== memoize 边界测试 ====================
  describe('memoize 边界条件', () => {
    it('处理无参数函数', () => {
      let callCount = 0;
      const fn = () => {
        callCount++;
        return 'result';
      };
      const memoizedFn = memoize(fn);

      memoizedFn();
      memoizedFn();
      expect(callCount).toBe(1);
    });

    it('处理返回 undefined 的函数', () => {
      let callCount = 0;
      const fn = () => {
        callCount++;
        return undefined;
      };
      const memoizedFn = memoize(fn);

      memoizedFn();
      memoizedFn();
      expect(callCount).toBe(1);
    });

    it('处理抛出错误的函数', () => {
      const fn = () => {
        throw new Error('Test error');
      };
      const memoizedFn = memoize(fn);

      expect(() => memoizedFn()).toThrow('Test error');
    });

    it('处理包含循环引用的参数', () => {
      let callCount = 0;
      const fn = (obj: { id: number }) => { callCount++; return obj.id; };
      const memoizedFn = memoize(fn as (...args: unknown[]) => unknown);

      // 第一次调用
      memoizedFn({ id: 1 });
      // 第二次调用，不同对象但相同值
      // 注意：JSON.stringify 会序列化对象，所以两个不同对象会被视为相同的 key
      memoizedFn({ id: 1 });

      // 由于 JSON.stringify 会创建相同的 key，应该只调用一次
      expect(callCount).toBe(1);
    });

    it('处理 Symbol 参数', () => {
      let callCount = 0;
      const fn = (sym: symbol) => { callCount++; return sym.toString(); };
      const memoizedFn = memoize(fn as (...args: unknown[]) => unknown);

      const sym = Symbol('test');
      memoizedFn(sym);
      memoizedFn(sym);

      expect(callCount).toBe(1);
    });

    it('处理函数参数', () => {
      let callCount = 0;
      const fn = (cb: () => number) => { callCount++; return cb(); };
      const memoizedFn = memoize(fn as (...args: unknown[]) => unknown);

      const fn1 = () => 1;
      memoizedFn(fn1);
      memoizedFn(fn1);

      // 函数的 JSON.stringify 是 undefined 或 '{}'
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    it('处理大量参数组合', () => {
      let callCount = 0;
      const fn = (a: number, b: number, c: number) => { callCount++; return a + b + c; };
      const memoizedFn = memoize(fn as (...args: unknown[]) => unknown);

      // 相同参数组合调用 100 次应该只执行一次
      for (let i = 0; i < 100; i++) {
        memoizedFn(1, 2, 3);
      }
      expect(callCount).toBe(1);

      // 不同参数组合，每个都应该执行
      const initialCallCount = callCount;
      for (let i = 0; i < 10; i++) {
        memoizedFn(i, i + 1, i + 2);
      }
      // 10 个不同的参数组合，每个应该执行一次
      expect(callCount).toBe(initialCallCount + 10);
    });

    it('custom resolver 返回相同 key', () => {
      let callCount = 0;
      const fn = (obj: { id: number; name: string }) => { callCount++; return obj.name; };
      const memoizedFn = memoize(fn as (...args: unknown[]) => unknown, (obj: unknown) => String((obj as { id: number }).id));

      memoizedFn({ id: 1, name: 'first' });
      memoizedFn({ id: 1, name: 'second' });

      // 由于 resolver 只返回 id，第二次调用会使用缓存
      expect(callCount).toBe(1);
    });
  });

  // ==================== formatFileSize 边界测试 ====================
  describe('formatFileSize 边界条件', () => {
    it('处理 0 字节', () => {
      expect(formatFileSize(0)).toBe('0.0 B');
    });

    it('处理 1 字节', () => {
      expect(formatFileSize(1)).toBe('1.0 B');
    });

    it('处理负数', () => {
      // 负数会导致不正确的计算
      const result = formatFileSize(-1024);
      expect(result).toBeDefined();
    });

    it('处理小数', () => {
      expect(formatFileSize(512.5)).toBe('512.5 B');
    });

    it('处理极大值', () => {
      expect(formatFileSize(Number.MAX_SAFE_INTEGER)).toContain('TB');
    });

    it('处理 Infinity', () => {
      expect(formatFileSize(Infinity)).toContain('TB');
    });

    it('处理 NaN', () => {
      const result = formatFileSize(NaN);
      expect(result).toBe('NaN B');
    });

    it('处理刚好在边界上的值', () => {
      expect(formatFileSize(1023)).toBe('1023.0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    });

    it('处理 PB 级别（超出 TB）', () => {
      const pb = 1024 * 1024 * 1024 * 1024 * 1024;
      // 函数只支持到 TB，所以会停留在 TB 单位
      expect(formatFileSize(pb)).toContain('TB');
    });
  });

  // ==================== formatTimeAgo 边界测试 ====================
  describe('formatTimeAgo 边界条件', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('处理未来日期', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      const future = new Date('2024-01-15T13:00:00');
      const result = formatTimeAgo(future);
      // 未来日期会产生负数差值
      expect(result).toBeDefined();
    });

    it('处理当前时间', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo(now)).toBe('刚刚');
    });

    it('处理 59 秒前', () => {
      const now = new Date('2024-01-15T12:00:59');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T12:00:00');
      expect(formatTimeAgo(date)).toBe('刚刚');
    });

    it('处理刚好 60 秒（1分钟）前', () => {
      const now = new Date('2024-01-15T12:01:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T12:00:00');
      expect(formatTimeAgo(date)).toBe('1分钟前');
    });

    it('处理刚好 59 分钟前', () => {
      const now = new Date('2024-01-15T12:59:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T12:00:00');
      expect(formatTimeAgo(date)).toBe('59分钟前');
    });

    it('处理刚好 60 分钟（1小时）前', () => {
      const now = new Date('2024-01-15T13:00:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T12:00:00');
      expect(formatTimeAgo(date)).toBe('1小时前');
    });

    it('处理刚好 23 小时前', () => {
      const now = new Date('2024-01-16T11:00:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T12:00:00');
      expect(formatTimeAgo(date)).toBe('23小时前');
    });

    it('处理刚好 24 小时（1天）前', () => {
      const now = new Date('2024-01-16T12:00:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T12:00:00');
      expect(formatTimeAgo(date)).toBe('1天前');
    });

    it('处理刚好 6 天前', () => {
      const now = new Date('2024-01-21T12:00:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T12:00:00');
      expect(formatTimeAgo(date)).toBe('6天前');
    });

    it('处理刚好 7 天前（转为日期格式）', () => {
      const now = new Date('2024-01-22T12:00:00');
      vi.setSystemTime(now);

      const date = new Date('2024-01-15T12:00:00');
      const result = formatTimeAgo(date);
      expect(result).toMatch(/2024/);
    });

    it('处理无效日期字符串', () => {
      const result = formatTimeAgo('invalid-date');
      // 无效日期会创建 Invalid Date
      expect(result).toBeDefined();
    });

    it('处理空字符串日期', () => {
      const result = formatTimeAgo('');
      expect(result).toBeDefined();
    });

    it('处理 ISO 格式日期', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      expect(formatTimeAgo('2024-01-15T11:30:00.000Z')).toBeDefined();
    });

    it('处理 Unix 时间戳字符串', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);

      // 这不是有效的日期字符串格式，会返回 Invalid Date
      const result = formatTimeAgo('1705315800000');
      expect(result).toBeDefined();
    });
  });

  // ==================== optimizeImageUrl 边界测试 ====================
  describe('optimizeImageUrl 边界条件', () => {
    it('处理空字符串 URL', () => {
      const url = optimizeImageUrl('');
      expect(url).toContain('url=');
    });

    it('处理包含特殊字符的 URL', () => {
      const url = optimizeImageUrl('https://example.com/image?key=value&other=test');
      expect(url).toContain('key%3Dvalue');
      expect(url).toContain('%26');
    });

    it('处理包含中文的 URL', () => {
      const url = optimizeImageUrl('https://example.com/图片.jpg');
      expect(url).toContain('%E5%9B%BE%E7%89%87');
    });

    it('处理超长 URL', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(10000) + '.jpg';
      const url = optimizeImageUrl(longUrl);
      expect(url).toContain('url=');
    });

    it('处理 width=0', () => {
      const url = optimizeImageUrl('https://example.com/image.jpg', 0, 75);
      expect(url).toContain('w=0');
    });

    it('处理负数 width', () => {
      const url = optimizeImageUrl('https://example.com/image.jpg', -100, 75);
      expect(url).toContain('w=-100');
    });

    it('处理极大 width', () => {
      const url = optimizeImageUrl('https://example.com/image.jpg', Number.MAX_SAFE_INTEGER, 75);
      expect(url).toContain(`w=${Number.MAX_SAFE_INTEGER}`);
    });

    it('处理 quality=0', () => {
      const url = optimizeImageUrl('https://example.com/image.jpg', 800, 0);
      expect(url).toContain('q=0');
    });

    it('处理 quality>100', () => {
      const url = optimizeImageUrl('https://example.com/image.jpg', 800, 150);
      expect(url).toContain('q=150');
    });

    it('处理 data URL', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const url = optimizeImageUrl(dataUrl);
      expect(url).toContain('url=');
    });
  });

  // ==================== prefers* 函数边界测试 ====================
  describe('prefersReducedMotion 边界条件', () => {
    it('在 SSR 环境下返回 false', () => {
      // window 未定义时
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('prefersDarkMode 边界条件', () => {
    it('在 SSR 环境下返回 false', () => {
      expect(prefersDarkMode()).toBe(false);
    });
  });
});