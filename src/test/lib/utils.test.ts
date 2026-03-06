import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
} from '@/lib/utils'

describe('utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Cache', () => {
    it('sets and gets values correctly', () => {
      const cache = createCache<string>()
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('returns null for non-existent keys', () => {
      const cache = createCache<string>()
      expect(cache.get('nonexistent')).toBeNull()
    })

    it('deletes values correctly', () => {
      const cache = createCache<string>()
      cache.set('key1', 'value1')
      cache.delete('key1')
      expect(cache.get('key1')).toBeNull()
    })

    it('checks existence correctly', () => {
      const cache = createCache<string>()
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('expires entries after TTL', () => {
      const cache = createCache<string>(1000) // 1 second TTL
      cache.set('key1', 'value1')
      
      expect(cache.get('key1')).toBe('value1')
      
      vi.advanceTimersByTime(1500)
      
      expect(cache.get('key1')).toBeNull()
    })

    it('has returns false for expired entries', () => {
      const cache = createCache<string>(1000)
      cache.set('key1', 'value1')
      
      vi.advanceTimersByTime(1500)
      
      expect(cache.has('key1')).toBe(false)
    })
  })

  describe('debounce', () => {
    it('delays function execution', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      expect(mockFn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('cancels previous call on rapid invocation', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      debouncedFn()
      debouncedFn()

      vi.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('passes arguments correctly', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1', 'arg2')

      vi.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('throttle', () => {
    it('limits function calls', () => {
      const mockFn = vi.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn()
      throttledFn()
      throttledFn()

      expect(mockFn).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)
      throttledFn()
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('passes arguments correctly', () => {
      const mockFn = vi.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn('arg1', 'arg2')

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })

  describe('memoize', () => {
    it('caches results for same arguments', () => {
      const mockFn = vi.fn((x: number) => x * 2)
      const memoizedFn = memoize(mockFn)

      expect(memoizedFn(5)).toBe(10)
      expect(memoizedFn(5)).toBe(10)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('calls function for different arguments', () => {
      const mockFn = vi.fn((x: number) => x * 2)
      const memoizedFn = memoize(mockFn)

      expect(memoizedFn(5)).toBe(10)
      expect(memoizedFn(10)).toBe(20)
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('uses custom resolver when provided', () => {
      const mockFn = vi.fn((obj: { id: number }) => obj.id * 2)
      const memoizedFn = memoize(mockFn, (obj) => String(obj.id))

      expect(memoizedFn({ id: 5 })).toBe(10)
      expect(memoizedFn({ id: 5 })).toBe(10)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500.0 B')
    })

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(2048)).toBe('2.0 KB')
    })

    it('formats megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB')
    })

    it('formats gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1.0 GB')
    })

    it('formats terabytes correctly', () => {
      expect(formatFileSize(1099511627776)).toBe('1.0 TB')
    })
  })

  describe('formatTimeAgo', () => {
    it('returns "刚刚" for very recent times', () => {
      const now = new Date()
      expect(formatTimeAgo(now)).toBe('刚刚')
    })

    it('returns minutes ago for times within an hour', () => {
      const date = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      expect(formatTimeAgo(date)).toBe('30分钟前')
    })

    it('returns hours ago for times within a day', () => {
      const date = new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      expect(formatTimeAgo(date)).toBe('5小时前')
    })

    it('returns days ago for times within a week', () => {
      const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      expect(formatTimeAgo(date)).toBe('3天前')
    })

    it('returns formatted date for older times', () => {
      const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const result = formatTimeAgo(date)
      expect(result).toMatch(/\d{4}/) // Contains year
    })

    it('handles string dates', () => {
      const dateStr = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      expect(formatTimeAgo(dateStr)).toBe('30分钟前')
    })
  })

  describe('optimizeImageUrl', () => {
    it('creates optimized image URL with default parameters', () => {
      const url = optimizeImageUrl('https://example.com/image.jpg')
      expect(url).toContain('/api/image?')
      expect(url).toContain('url=')
      expect(url).toContain('w=800')
      expect(url).toContain('q=75')
    })

    it('creates optimized image URL with custom parameters', () => {
      const url = optimizeImageUrl('https://example.com/image.jpg', 1200, 90)
      expect(url).toContain('w=1200')
      expect(url).toContain('q=90')
    })

    it('encodes the URL properly', () => {
      const url = optimizeImageUrl('https://example.com/image with spaces.jpg')
      expect(url).toContain('image%20with%20spaces')
    })
  })

  describe('prefersReducedMotion', () => {
    it('returns false when window is undefined', () => {
      expect(prefersReducedMotion()).toBe(false)
    })
  })

  describe('prefersDarkMode', () => {
    it('returns false when window is undefined', () => {
      expect(prefersDarkMode()).toBe(false)
    })
  })
})
