/**
 * PWA Utilities Tests
 *
 * @version 1.12.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isPWAInstalled,
  isMobile,
  isIOS,
  isAndroid,
  isOnline,
  listenNetworkStatus,
  formatFileSize,
  debounce,
  throttle,
  safeStorage,
} from '../utils'

describe('PWA Utilities', () => {
  describe('isPWAInstalled', () => {
    it('should return true when display-mode is standalone', () => {
      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      expect(isPWAInstalled()).toBe(true)
    })

    it('should return false when not in standalone mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      expect(isPWAInstalled()).toBe(false)
    })
  })

  describe('isMobile', () => {
    it('should return true for mobile user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true,
      })

      expect(isMobile()).toBe(true)
    })

    it('should return false for desktop user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      })

      expect(isMobile()).toBe(false)
    })
  })

  describe('isIOS', () => {
    it('should return true for iOS user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      })

      expect(isIOS()).toBe(true)
    })

    it('should return false for Android user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        configurable: true,
      })

      expect(isIOS()).toBe(false)
    })
  })

  describe('isAndroid', () => {
    it('should return true for Android user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36',
        configurable: true,
      })

      expect(isAndroid()).toBe(true)
    })

    it('should return false for iOS user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      })

      expect(isAndroid()).toBe(false)
    })
  })

  describe('isOnline', () => {
    it('should return navigator.onLine value', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })

      expect(isOnline()).toBe(true)
    })
  })

  describe('listenNetworkStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should call online callback when online event fires', () => {
      const onlineCallback = vi.fn()
      const offlineCallback = vi.fn()

      const cleanup = listenNetworkStatus(onlineCallback, offlineCallback)

      // Trigger online event
      window.dispatchEvent(new Event('online'))

      expect(onlineCallback).toHaveBeenCalledTimes(1)
      expect(offlineCallback).not.toHaveBeenCalled()

      cleanup()
    })

    it('should call offline callback when offline event fires', () => {
      const onlineCallback = vi.fn()
      const offlineCallback = vi.fn()

      const cleanup = listenNetworkStatus(onlineCallback, offlineCallback)

      // Trigger offline event
      window.dispatchEvent(new Event('offline'))

      expect(offlineCallback).toHaveBeenCalledTimes(1)
      expect(onlineCallback).not.toHaveBeenCalled()

      cleanup()
    })

    it('should remove event listeners on cleanup', () => {
      const onlineCallback = vi.fn()
      const offlineCallback = vi.fn()

      const cleanup = listenNetworkStatus(onlineCallback, offlineCallback)
      cleanup()

      // Trigger events after cleanup
      window.dispatchEvent(new Event('online'))
      window.dispatchEvent(new Event('offline'))

      expect(onlineCallback).not.toHaveBeenCalled()
      expect(offlineCallback).not.toHaveBeenCalled()
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(500)).toBe('500 Bytes')
    })

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1572864)).toBe('1.5 MB')
    })

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB')
      expect(formatFileSize(1610612736)).toBe('1.5 GB')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should delay function execution', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 100)

      debouncedFunc()
      expect(func).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should only call function once for multiple rapid calls', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 100)

      debouncedFunc()
      debouncedFunc()
      debouncedFunc()

      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should execute function immediately on first call', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 100)

      throttledFunc()
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should not execute function again within throttle limit', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 100)

      throttledFunc()
      throttledFunc()
      throttledFunc()

      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should execute function again after throttle limit', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 100)

      throttledFunc()
      expect(func).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)

      throttledFunc()
      expect(func).toHaveBeenCalledTimes(2)
    })
  })

  describe('safeStorage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should get item from localStorage', () => {
      localStorage.setItem('test', 'value')
      expect(safeStorage.getItem('test')).toBe('value')
    })

    it('should return null for non-existent item', () => {
      expect(safeStorage.getItem('non-existent')).toBe(null)
    })

    it('should set item in localStorage', () => {
      const result = safeStorage.setItem('test', 'value')
      expect(result).toBe(true)
      expect(localStorage.getItem('test')).toBe('value')
    })

    it('should remove item from localStorage', () => {
      localStorage.setItem('test', 'value')
      const result = safeStorage.removeItem('test')
      expect(result).toBe(true)
      expect(localStorage.getItem('test')).toBe(null)
    })

    it('should clear all localStorage', () => {
      localStorage.setItem('test1', 'value1')
      localStorage.setItem('test2', 'value2')
      const result = safeStorage.clear()
      expect(result).toBe(true)
      // In jsdom, length may not update immediately, but clear should succeed
      expect(localStorage.getItem('test1')).toBe(null)
      expect(localStorage.getItem('test2')).toBe(null)
    })

    it('should handle errors gracefully', () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(safeStorage.getItem('test')).toBe(null)

      localStorage.getItem = originalGetItem
    })
  })
})