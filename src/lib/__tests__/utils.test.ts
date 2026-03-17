/**
 * Unit tests for utils.ts
 * @module lib/__tests__/utils.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import all functions to test
import {
  generateId,
  formatFileSize,
  formatNumber,
  isEmpty,
  deepClone,
  retry,
  batch,
  shuffle,
  randomItem,
  unique,
  groupBy,
  pick,
  omit,
  clamp,
  mapRange,
  lerp,
  isClient,
  isServer,
  isBrowser,
  isNode,
  prefersReducedMotion,
  prefersDarkMode,
  prefersLightMode,
  isTouchDevice,
  getDeviceType,
  getViewportSize,
  copyToClipboard,
  readFromClipboard,
  getQueryParams,
  createCache,
  isValidEmail,
  isValidUrl,
} from '../utils';

// Import LRUCache class
import { LRUCache } from '../utils';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('clipboard content'),
  },
});

describe('generateId', () => {
  it('should generate a valid UUID', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should generate id with prefix', () => {
    const id = generateId('user');
    expect(id).toMatch(/^user-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should generate unique ids', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('should respect decimal places', () => {
    expect(formatFileSize(1536, 0)).toBe('2 KB');
    // Note: JS removes trailing zeros, so 1.50 becomes 1.5
    expect(formatFileSize(1536, 2)).toBe('1.5 KB');
  });
});

describe('formatNumber', () => {
  it('should format with default separator', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(100)).toBe('100');
  });

  it('should format with custom separator', () => {
    expect(formatNumber(1000000, '.')).toBe('1.000.000');
  });
});

describe('isEmpty', () => {
  it('should return true for empty values', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('   ')).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);
  });

  it('should return false for non-empty values', () => {
    expect(isEmpty('hello')).toBe(false);
    expect(isEmpty([1, 2, 3])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
  });
});

describe('deepClone', () => {
  it('should clone primitives', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('should clone arrays', () => {
    const original = [1, 2, 3];
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it('should clone nested objects', () => {
    const original = { a: { b: { c: 1 } } };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned.a).not.toBe(original.a);
  });

  it('should handle circular references', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    const cloned = deepClone(obj);
    expect(cloned.a).toBe(1);
    expect(cloned.self).not.toBe(obj.self);
  });

  it('should clone Date objects', () => {
    const date = new Date('2024-01-01');
    const cloned = deepClone(date);
    expect(cloned).toEqual(date);
    expect(cloned).not.toBe(date);
  });

  it('should clone RegExp objects', () => {
    const regex = /test/gi;
    const cloned = deepClone(regex);
    expect(cloned.source).toBe(regex.source);
    expect(cloned.flags).toBe(regex.flags);
  });

  it('should clone Map objects', () => {
    const map = new Map([['key', 'value']]);
    const cloned = deepClone(map);
    expect(cloned.get('key')).toBe('value');
    expect(cloned).not.toBe(map);
  });

  it('should clone Set objects', () => {
    const set = new Set([1, 2, 3]);
    const cloned = deepClone(set);
    expect(cloned.has(1)).toBe(true);
    expect(cloned).not.toBe(set);
  });
});

describe('retry', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retry(fn, 3, 100);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const result = await retry(fn, 3, 10);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    
    await expect(retry(fn, 3, 10)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('batch', () => {
  it('should batch array into chunks', () => {
    expect(batch([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(batch([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
    expect(batch([], 2)).toEqual([]);
  });

  it('should handle batch size of 1', () => {
    expect(batch([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });
});

describe('shuffle', () => {
  it('should return array with same length', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffle(original);
    expect(shuffled.length).toBe(original.length);
  });

  it('should contain all original elements', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffle(original);
    expect(shuffled.sort()).toEqual(original);
  });

  it('should not mutate original array', () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffle(original);
    expect(original).toEqual(copy);
  });
});

describe('randomItem', () => {
  it('should return an item from array', () => {
    const arr = [1, 2, 3, 4, 5];
    const item = randomItem(arr);
    expect(arr).toContain(item);
  });

  it('should return undefined for empty array', () => {
    expect(randomItem([])).toBeUndefined();
  });
});

describe('unique', () => {
  it('should remove duplicates', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  it('should handle empty array', () => {
    expect(unique([])).toEqual([]);
  });

  it('should preserve order of first occurrence', () => {
    expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
  });
});

describe('groupBy', () => {
  it('should group by key function', () => {
    const items = [
      { id: 1, type: 'a' },
      { id: 2, type: 'b' },
      { id: 3, type: 'a' },
    ];
    const grouped = groupBy(items, item => item.type);
    expect(grouped.get('a')).toHaveLength(2);
    expect(grouped.get('b')).toHaveLength(1);
  });

  it('should handle empty array', () => {
    expect(groupBy([], item => item).size).toBe(0);
  });
});

describe('pick', () => {
  it('should pick specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('should ignore non-existent keys', () => {
    const obj = { a: 1 };
    expect(pick(obj, ['a', 'b'])).toEqual({ a: 1 });
  });
});

describe('omit', () => {
  it('should omit specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });
});

describe('clamp', () => {
  it('should clamp value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('mapRange', () => {
  it('should map value from one range to another', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
    expect(mapRange(0, 0, 1, 0, 360)).toBe(0);
    expect(mapRange(1, 0, 1, 0, 360)).toBe(360);
  });
});

describe('lerp', () => {
  it('should interpolate between values', () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(0, 100, 1)).toBe(100);
  });
});

describe('Environment checks', () => {
  describe('isClient', () => {
    it('should detect client environment', () => {
      expect(isClient()).toBe(typeof window !== 'undefined');
    });
  });

  describe('isServer', () => {
    it('should detect server environment', () => {
      expect(isServer()).toBe(typeof window === 'undefined');
    });
  });

  describe('isBrowser', () => {
    it('should detect browser environment', () => {
      const result = typeof window !== 'undefined' && typeof document !== 'undefined';
      expect(isBrowser()).toBe(result);
    });
  });

  describe('isNode', () => {
    it('should detect Node.js environment', () => {
      const result = typeof process !== 'undefined' && 
                     process.versions != null && 
                     process.versions.node != null;
      expect(isNode()).toBe(result);
    });
  });
});

describe('User preferences', () => {
  it('prefersReducedMotion should return boolean', () => {
    const result = prefersReducedMotion();
    expect(typeof result).toBe('boolean');
  });

  it('prefersDarkMode should return boolean', () => {
    const result = prefersDarkMode();
    expect(typeof result).toBe('boolean');
  });

  it('prefersLightMode should return boolean', () => {
    const result = prefersLightMode();
    expect(typeof result).toBe('boolean');
  });
});

describe('Device detection', () => {
  it('isTouchDevice should return boolean', () => {
    const result = isTouchDevice();
    expect(typeof result).toBe('boolean');
  });

  it('getDeviceType should return valid type', () => {
    const result = getDeviceType();
    expect(['desktop', 'tablet', 'mobile']).toContain(result);
  });
});

describe('getViewportSize', () => {
  it('should return viewport dimensions', () => {
    const { width, height } = getViewportSize();
    expect(typeof width).toBe('number');
    expect(typeof height).toBe('number');
  });
});

describe('Clipboard operations', () => {
  it('copyToClipboard should copy text', async () => {
    const result = await copyToClipboard('test');
    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test');
  });

  it('readFromClipboard should read text', async () => {
    const result = await readFromClipboard();
    expect(result).toBe('clipboard content');
  });
});

describe('getQueryParams', () => {
  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: new URL('http://test.com?search=hello&page=1'),
      writable: true,
    });
  });

  it('should return query params as object', () => {
    const params = getQueryParams();
    expect(params.search).toBe('hello');
    expect(params.page).toBe('1');
  });

  it('should return empty object when no params', () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://test.com'),
      writable: true,
    });
    const params = getQueryParams();
    expect(Object.keys(params).length).toBe(0);
  });
});

describe('LRUCache', () => {
  let cache: LRUCache<number>;

  beforeEach(() => {
    cache = new LRUCache<number>(3);
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 100);
      expect(cache.get('key1')).toBe(100);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should store values with custom TTL', () => {
      cache.set('key1', 100, 1000); // 1 second TTL
      expect(cache.get('key1')).toBe(100);
    });

    it('should return null for expired entries', () => {
      cache.set('key1', 100, 10); // 10ms TTL
      // Wait for expiration
      const waitForExpiration = new Promise(resolve => setTimeout(resolve, 20));
      return waitForExpiration.then(() => {
        expect(cache.get('key1')).toBeNull();
      });
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired keys', () => {
      cache.set('key1', 100);
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', () => {
      cache.set('key1', 100, 10); // 10ms TTL
      const waitForExpiration = new Promise(resolve => setTimeout(resolve, 20));
      return waitForExpiration.then(() => {
        expect(cache.has('key1')).toBe(false);
      });
    });
  });

  describe('delete', () => {
    it('should delete a specific entry', () => {
      cache.set('key1', 100);
      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
      expect(cache.has('key1')).toBe(false);
    });

    it('should not affect other entries', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.delete('key1');
      expect(cache.get('key2')).toBe(200);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      expect(cache.size).toBe(3);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('size', () => {
    it('should return correct size', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 100);
      expect(cache.size).toBe(1);
      cache.set('key2', 200);
      expect(cache.size).toBe(2);
      cache.delete('key1');
      expect(cache.size).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entry when at capacity', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      expect(cache.size).toBe(3);
      
      // Access key1 and key2 to update their access order
      cache.get('key1');
      cache.get('key2');
      
      // Add a new entry, key3 should be evicted
      cache.set('key4', 400);
      expect(cache.size).toBe(3);
      expect(cache.get('key3')).toBeNull();
      expect(cache.get('key1')).toBe(100);
      expect(cache.get('key2')).toBe(200);
      expect(cache.get('key4')).toBe(400);
    });

    it('should update access order on get', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      
      // Access key1 to make it most recently used
      cache.get('key1');
      
      // Add THREE entries to exceed capacity (maxSize=3), key2 should be evicted
      cache.set('key3', 300);
      cache.set('key4', 400); // This triggers eviction of oldest (key2)
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key1')).toBe(100); // key1 was accessed via get, so not evicted
      expect(cache.get('key3')).toBe(300);
      expect(cache.get('key4')).toBe(400);
    });

    it('should update access order on set for existing key', () => {
      cache.set('key1', 100);
      cache.set('key2', 200);
      cache.set('key3', 300);
      
      // Update key1 (should make it most recently used)
      cache.set('key1', 150);
      
      // Add a fourth entry, key2 should be evicted
      cache.set('key4', 400);
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key1')).toBe(150);
      expect(cache.get('key3')).toBe(300);
      expect(cache.get('key4')).toBe(400);
    });
  });

  describe('complex objects', () => {
    it('should store and retrieve complex objects', () => {
      interface ComplexObject {
        nested: { value: number };
        array: string[];
      }
      const objCache = new LRUCache<ComplexObject>(3);
      const obj: ComplexObject = {
        nested: { value: 42 },
        array: ['a', 'b', 'c'],
      };
      
      objCache.set('obj1', obj);
      const retrieved = objCache.get('obj1');
      expect(retrieved).toEqual(obj);
      expect(retrieved?.nested.value).toBe(42);
      expect(retrieved?.array).toEqual(['a', 'b', 'c']);
    });
  });

  describe('boundary cases', () => {
    it('should handle empty string keys', () => {
      cache.set('', 100);
      expect(cache.get('')).toBe(100);
    });

    it('should handle special character keys', () => {
      cache.set('key-with-dash', 100);
      cache.set('key.with.dot', 200);
      cache.set('key_with_underscore', 300);
      expect(cache.get('key-with-dash')).toBe(100);
      expect(cache.get('key.with.dot')).toBe(200);
      expect(cache.get('key_with_underscore')).toBe(300);
    });

    it('should handle null and undefined values', () => {
      const nullCache = new LRUCache<number | null>(3);
      nullCache.set('null', null);
      expect(nullCache.get('null')).toBeNull();
    });

    it('should handle maxSize of 1', () => {
      const tinyCache = new LRUCache<number>(1);
      tinyCache.set('key1', 100);
      tinyCache.set('key2', 200);
      expect(tinyCache.size).toBe(1);
      expect(tinyCache.get('key1')).toBeNull();
      expect(tinyCache.get('key2')).toBe(200);
    });

    it('should handle very large maxSize', () => {
      const largeCache = new LRUCache<number>(10000);
      for (let i = 0; i < 100; i++) {
        largeCache.set(`key${i}`, i);
      }
      expect(largeCache.size).toBe(100);
      expect(largeCache.get('key50')).toBe(50);
    });
  });
});

describe('createCache', () => {
  it('should create a cache with set, get, delete, has, clear methods', () => {
    const cache = createCache<number>(5000);
    
    expect(typeof cache.set).toBe('function');
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.delete).toBe('function');
    expect(typeof cache.has).toBe('function');
    expect(typeof cache.clear).toBe('function');
  });

  it('should store and retrieve values', () => {
    const cache = createCache<number>();
    cache.set('key1', 100);
    expect(cache.get('key1')).toBe(100);
  });

  it('should check if key exists', () => {
    const cache = createCache<number>();
    cache.set('key1', 100);
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should delete entries', () => {
    const cache = createCache<number>();
    cache.set('key1', 100);
    cache.delete('key1');
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear all entries', () => {
    const cache = createCache<number>();
    cache.set('key1', 100);
    cache.set('key2', 200);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should respect custom TTL', () => {
    const cache = createCache<number>(100); // 100ms TTL
    cache.set('key1', 100);
    expect(cache.get('key1')).toBe(100);
    
    const waitForExpiration = new Promise(resolve => setTimeout(resolve, 150));
    return waitForExpiration.then(() => {
      expect(cache.get('key1')).toBeNull();
    });
  });
});

describe('isValidEmail', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user-name@example.co.uk')).toBe(true);
    expect(isValidEmail('user123@example.org')).toBe(true);
    expect(isValidEmail('first.last@subdomain.example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user example.com')).toBe(false);
    expect(isValidEmail('user@@example.com')).toBe(false);
    expect(isValidEmail('user@example..com')).toBe(false);
    // Note: 'user@com' is technically valid per RFC (single-label domain)
    expect(isValidEmail('user@.com')).toBe(false);
    expect(isValidEmail('@')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isValidEmail(null as unknown as string)).toBe(false);
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
    expect(isValidEmail(123 as unknown as string)).toBe(false);
    expect(isValidEmail(' ')).toBe(false);
    expect(isValidEmail('a@b.c')).toBe(true); // Minimal valid email
  });

  it('should accept special characters in local part', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user.tag@example.com')).toBe(true);
    expect(isValidEmail('user_tag@example.com')).toBe(true);
    expect(isValidEmail('user!#$%&*+/=?^_`{|}~-@example.com')).toBe(true);
  });

  it('should accept subdomains', () => {
    expect(isValidEmail('user@subdomain.example.com')).toBe(true);
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
    expect(isValidEmail('user@dept.company.example.org')).toBe(true);
  });
});

describe('isValidUrl', () => {
  it('should validate correct URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('https://www.example.com')).toBe(true);
    expect(isValidUrl('https://example.com/path')).toBe(true);
    expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    expect(isValidUrl('https://example.com:8080')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('https://example.com/path#section')).toBe(true);
    expect(isValidUrl('ftp://example.com')).toBe(true);
    expect(isValidUrl('ftps://example.com')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false); // Missing protocol
    expect(isValidUrl('www.example.com')).toBe(false); // Missing protocol
    expect(isValidUrl('ftp://example.com')).toBe(true); // ftp is valid
    expect(isValidUrl('file://example.com')).toBe(false); // file protocol not allowed
    expect(isValidUrl('javascript:void(0)')).toBe(false); // javascript protocol not allowed
    expect(isValidUrl('data:text/plain,hello')).toBe(false); // data protocol not allowed
  });

  it('should handle edge cases', () => {
    expect(isValidUrl(null as unknown as string)).toBe(false);
    expect(isValidUrl(undefined as unknown as string)).toBe(false);
    expect(isValidUrl(123 as unknown as string)).toBe(false);
    expect(isValidUrl(' ')).toBe(false);
  });

  it('should accept URLs with complex paths', () => {
    expect(isValidUrl('https://example.com/path/to/resource')).toBe(true);
    expect(isValidUrl('https://example.com/path/to/resource?param1=value1&param2=value2')).toBe(true);
    expect(isValidUrl('https://example.com/path/to/resource#section')).toBe(true);
    expect(isValidUrl('https://example.com/path/to/resource?param=value#section')).toBe(true);
  });

  it('should accept IP addresses', () => {
    expect(isValidUrl('http://192.168.1.1')).toBe(true);
    expect(isValidUrl('https://127.0.0.1:8080')).toBe(true);
  });

  it('should accept URLs with authentication', () => {
    expect(isValidUrl('https://user:pass@example.com')).toBe(true);
  });
});
