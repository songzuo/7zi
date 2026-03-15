import { describe, it, expect } from 'vitest';
import { createCache, debounce, throttle, memoize, formatFileSize, formatTimeAgo } from './utils';

describe('Cache', () => {
  it('should store and retrieve values', () => {
    const cache = createCache<string>(1000);
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });
  
  it('should return null for expired entries', async () => {
    const cache = createCache<string>(50);
    cache.set('key', 'value');
    await new Promise(r => setTimeout(r, 100));
    expect(cache.get('key')).toBeNull();
  });
  
  it('should check if key exists', () => {
    const cache = createCache<string>(1000);
    cache.set('key', 'value');
    expect(cache.has('key')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });
  
  it('should delete entries', () => {
    const cache = createCache<string>(1000);
    cache.set('key', 'value');
    cache.delete('key');
    expect(cache.get('key')).toBeNull();
  });
});

describe('debounce', () => {
  it('should delay function execution', async () => {
    let count = 0;
    const debouncedFn = debounce(() => count++, 100);
    debouncedFn();
    debouncedFn();
    debouncedFn();
    expect(count).toBe(0);
    await new Promise(r => setTimeout(r, 150));
    expect(count).toBe(1);
  });
});

describe('throttle', () => {
  it('should limit function execution rate', async () => {
    let count = 0;
    const throttledFn = throttle(() => count++, 100);
    throttledFn();
    throttledFn();
    throttledFn();
    expect(count).toBe(1);
    await new Promise(r => setTimeout(r, 150));
    throttledFn();
    expect(count).toBe(2);
  });
});

describe('memoize', () => {
  it('should cache function results', () => {
    let callCount = 0;
    const fn = memoize((a: number, b: number) => {
      callCount++;
      return a + b;
    });
    expect(fn(1, 2)).toBe(3);
    expect(fn(1, 2)).toBe(3);
    expect(callCount).toBe(1);
  });
});

describe('formatFileSize', () => {
  it('should format bytes to human readable', () => {
    expect(formatFileSize(0)).toContain('B');
    expect(formatFileSize(1024)).toContain('KB');
    expect(formatFileSize(1048576)).toContain('MB');
    expect(formatFileSize(1073741824)).toContain('GB');
  });
});

describe('formatTimeAgo', () => {
  it('should format date to time ago string', () => {
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    expect(formatTimeAgo(minuteAgo)).toBeTruthy();
    expect(formatTimeAgo(hourAgo)).toBeTruthy();
  });
});
