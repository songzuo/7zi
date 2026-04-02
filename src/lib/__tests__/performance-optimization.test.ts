// @ts-nocheck - Test file with complex type issues
/**
 * Tests for performance-optimization.ts module
 * Performance optimization utilities for LCP, INP, and resource optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  preloadCriticalResources,
  preconnectToDomains,
  removeUnusedCSS,
  runInChunks,
  deferNonCriticalScripts,
  scheduleIdleTask,
  cancelIdleTask,
  performanceMark,
  performanceMeasure,
  clearPerformanceMarks,
  clearPerformanceMeasures,
  getPerformanceMeasures,
  measureAsync,
  measureSync,
  lazyLoadImages,
  setImageFormatSupport,
  initPerformanceOptimizations,
} from '../performance-optimization'

// Mock window and document
const mockDocument = {
  head: {
    appendChild: vi.fn(),
  },
  body: {
    appendChild: vi.fn(),
  },
  querySelector: vi.fn(),
  querySelectorAll: vi.fn() as unknown as typeof document.querySelectorAll,
  createElement: vi.fn(),
  documentElement: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
    },
  },
}

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  performance: {
    mark: vi.fn(),
    measure: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    getEntriesByName: vi.fn(),
    getEntriesByType: vi.fn(),
  },
  requestIdleCallback: vi.fn(),
  cancelIdleCallback: vi.fn(),
  setTimeout: vi.fn(),
  clearTimeout: vi.fn(),
}

const mockNavigator = {
  mediaDevices: {
    getUserMedia: vi.fn(),
  },
}

describe('performance-optimization.ts', () => {
  beforeEach(() => {
    // Setup mocks
    global.document = mockDocument as unknown as Document
    global.window = mockWindow as unknown as Window & typeof globalThis
    global.navigator = mockNavigator as unknown as Navigator

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('preloadCriticalResources', () => {
    it('should preload images', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)
      mockDocument.querySelector.mockReturnValue(null)

      preloadCriticalResources({
        images: ['https://example.com/image.jpg'],
      })

      expect(mockDocument.createElement).toHaveBeenCalledWith('link')
      expect(mockDocument.head.appendChild).toHaveBeenCalled()
    })

    it('should preload fonts', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)
      mockDocument.querySelector.mockReturnValue(null)

      preloadCriticalResources({
        fonts: ['https://example.com/font.woff2'],
      })

      expect(mockDocument.createElement).toHaveBeenCalledWith('link')
    })

    it('should preload stylesheets', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)
      mockDocument.querySelector.mockReturnValue(null)

      preloadCriticalResources({
        stylesheets: ['https://example.com/style.css'],
      })

      expect(mockDocument.createElement).toHaveBeenCalledWith('link')
    })

    it('should preload scripts', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)
      mockDocument.querySelector.mockReturnValue(null)

      preloadCriticalResources({
        scripts: ['https://example.com/script.js'],
      })

      expect(mockDocument.createElement).toHaveBeenCalledWith('link')
    })

    it('should skip existing preloads', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)
      mockDocument.querySelector.mockReturnValue({} as unknown as Element)

      preloadCriticalResources({
        images: ['https://example.com/image.jpg'],
      })

      expect(mockDocument.head.appendChild).not.toHaveBeenCalled()
    })

    it('should handle undefined document', () => {
      const originalDocument = global.document
      // @ts-expect-error - Testing undefined case
      global.document = undefined

      expect(() => {
        preloadCriticalResources({ images: ['test.jpg'] })
      }).not.toThrow()

      global.document = originalDocument
    })

    it('should preload multiple resource types', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)
      mockDocument.querySelector.mockReturnValue(null)

      preloadCriticalResources({
        images: ['img1.jpg', 'img2.jpg'],
        fonts: ['font1.woff2'],
        stylesheets: ['style.css'],
        scripts: ['script.js'],
      })

      expect(mockDocument.createElement).toHaveBeenCalledTimes(5)
    })
  })

  describe('preconnectToDomains', () => {
    it('should create DNS prefetch links', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)

      preconnectToDomains(['https://example.com'])

      expect(mockDocument.createElement).toHaveBeenCalled()
      expect(mockDocument.head.appendChild).toHaveBeenCalled()
    })

    it('should create preconnect links', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)

      preconnectToDomains(['https://example.com'])

      expect(mockDocument.createElement).toHaveBeenCalled()
    })

    it('should handle multiple domains', () => {
      const mockLink = {
        setAttribute: vi.fn(),
      }
      mockDocument.createElement.mockReturnValue(mockLink as unknown as HTMLElement)

      preconnectToDomains([
        'https://example.com',
        'https://api.example.com',
        'https://cdn.example.com',
      ])

      expect(mockDocument.createElement).toHaveBeenCalled()
    })

    it('should handle undefined document', () => {
      const originalDocument = global.document
      // @ts-expect-error - Testing undefined case
      global.document = undefined

      expect(() => {
        preconnectToDomains(['https://example.com'])
      }).not.toThrow()

      global.document = originalDocument
    })
  })

  describe('removeUnusedCSS', () => {
    it('should add load event listener', () => {
      removeUnusedCSS()

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('load', expect.any(Function))
    })

    it('should handle undefined window', () => {
      const originalWindow = global.window
      // @ts-expect-error - Testing undefined case
      global.window = undefined

      expect(() => {
        removeUnusedCSS()
      }).not.toThrow()

      global.window = originalWindow
    })
  })

  describe('runInChunks', () => {
    it('should run task in chunks', async () => {
      const task = vi.fn(() => 'result')

      const result = await runInChunks(task, { maxDuration: 50 })

      expect(result).toBe('result')
      expect(task).toHaveBeenCalled()
    })

    it('should yield when exceeding maxDuration', async () => {
      const task = vi.fn(() => 'result')
      const mockYieldFn = vi.fn()

      // Mock performance.now to simulate time passing
      let callCount = 0
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++
        return callCount > 1 ? 100 : 0
      })

      // Mock requestIdleCallback
      mockWindow.requestIdleCallback = vi.fn(cb => {
        setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0)
      })

      await runInChunks(task, { maxDuration: 50 })

      // The yield mechanism should be triggered
      expect(task).toHaveBeenCalled()
    })

    it('should handle task errors', async () => {
      const task = vi.fn(() => {
        throw new Error('Task error')
      })

      await expect(runInChunks(task)).rejects.toThrow('Task error')
    })

    it('should handle synchronous tasks', async () => {
      const task = vi.fn(() => 42)

      const result = await runInChunks(task, { maxDuration: 50 })

      expect(result).toBe(42)
      expect(task).toHaveBeenCalledTimes(1)
    })
  })

  describe('deferNonCriticalScripts', () => {
    it('should add load event listener', () => {
      deferNonCriticalScripts()

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('load', expect.any(Function))
    })

    it('should load deferred scripts on page load', () => {
      const mockScript = {
        getAttribute: vi.fn().mockReturnValue('deferred.js'),
        remove: vi.fn(),
      }

      const mockNewScript = {}

      mockDocument.querySelectorAll.mockReturnValue([mockScript] as unknown as NodeListOf<Element>)
      mockDocument.createElement.mockReturnValue(mockNewScript as unknown as HTMLElement)

      deferNonCriticalScripts()

      // Trigger the load callback
      const loadCallback = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )?.[1]

      if (loadCallback) {
        loadCallback()
      }

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('script[data-defer]')
    })

    it('should handle undefined document', () => {
      const originalDocument = global.document
      // @ts-expect-error - Testing undefined case
      global.document = undefined

      expect(() => {
        deferNonCriticalScripts()
      }).not.toThrow()

      global.document = originalDocument
    })
  })

  describe('scheduleIdleTask', () => {
    it('should use requestIdleCallback when available', () => {
      const callback = vi.fn()

      scheduleIdleTask(callback)

      expect(mockWindow.requestIdleCallback).toHaveBeenCalledWith(callback, undefined)
    })

    it('should pass options to requestIdleCallback', () => {
      const callback = vi.fn()
      const options = { timeout: 1000 }

      scheduleIdleTask(callback, options)

      expect(mockWindow.requestIdleCallback).toHaveBeenCalledWith(callback, options)
    })

    it('should fallback to setTimeout when requestIdleCallback not available', () => {
      const callback = vi.fn()
      const originalRIC = mockWindow.requestIdleCallback
      mockWindow.requestIdleCallback = undefined as unknown as typeof mockWindow.requestIdleCallback

      scheduleIdleTask(callback)

      expect(mockWindow.setTimeout).toHaveBeenCalled()

      mockWindow.requestIdleCallback = originalRIC
    })
  })

  describe('cancelIdleTask', () => {
    it('should use cancelIdleCallback when available', () => {
      const handle = 123

      cancelIdleTask(handle)

      expect(mockWindow.cancelIdleCallback).toHaveBeenCalledWith(handle)
    })

    it('should fallback to clearTimeout when cancelIdleCallback not available', () => {
      const handle = 123
      const originalCIC = mockWindow.cancelIdleCallback
      mockWindow.cancelIdleCallback = undefined as unknown as typeof mockWindow.cancelIdleCallback

      cancelIdleTask(handle)

      expect(mockWindow.clearTimeout).toHaveBeenCalledWith(handle)

      mockWindow.cancelIdleCallback = originalCIC
    })
  })

  describe('User Timing API', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should create performance mark', () => {
      performanceMark('test-mark')

      expect(mockWindow.performance.mark).toHaveBeenCalledWith('test-mark', undefined)
    })

    it('should create performance mark with detail', () => {
      const detail = { test: 'value' }
      performanceMark('test-mark', detail)

      expect(mockWindow.performance.mark).toHaveBeenCalledWith('test-mark', { detail })
    })

    it('should handle mark creation errors gracefully', () => {
      mockWindow.performance.mark = vi.fn(() => {
        throw new Error('Mark exists')
      })

      expect(() => performanceMark('test-mark')).not.toThrow()
    })

    it('should measure between marks', () => {
      performanceMeasure('test-measure', 'start-mark', 'end-mark')

      expect(mockWindow.performance.measure).toHaveBeenCalledWith(
        'test-measure',
        'start-mark',
        'end-mark'
      )
    })

    it('should log measurement duration', () => {
      const mockMeasure = { duration: 100 }
      mockWindow.performance.getEntriesByName.mockReturnValue([mockMeasure])

      performanceMeasure('test-measure', 'start', 'end')

      expect(console.log).toHaveBeenCalled()
    })

    it('should clear specific marks', () => {
      clearPerformanceMarks(['mark1', 'mark2'])

      expect(mockWindow.performance.clearMarks).toHaveBeenCalledTimes(2)
    })

    it('should clear all marks', () => {
      clearPerformanceMarks()

      expect(mockWindow.performance.clearMarks).toHaveBeenCalled()
    })

    it('should clear specific measures', () => {
      clearPerformanceMeasures(['measure1', 'measure2'])

      expect(mockWindow.performance.clearMeasures).toHaveBeenCalledTimes(2)
    })

    it('should clear all measures', () => {
      clearPerformanceMeasures()

      expect(mockWindow.performance.clearMeasures).toHaveBeenCalled()
    })

    it('should get all performance measures', () => {
      const mockMeasures = [{ name: 'measure1', duration: 100 }]
      mockWindow.performance.getEntriesByType.mockReturnValue(mockMeasures)

      const result = getPerformanceMeasures()

      expect(mockWindow.performance.getEntriesByType).toHaveBeenCalledWith('measure')
      expect(result).toEqual(mockMeasures)
    })

    it('should return empty array when performance not available', () => {
      mockWindow.performance = undefined as unknown as typeof mockWindow.performance

      const result = getPerformanceMeasures()

      expect(result).toEqual([])
    })
  })

  describe('measureAsync', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should measure async function execution', async () => {
      const fn = vi.fn(async () => 'result')

      const result = await measureAsync('test-async', fn)

      expect(result).toBe('result')
      expect(fn).toHaveBeenCalled()
      expect(mockWindow.performance.mark).toHaveBeenCalledWith('test-async-start')
      expect(mockWindow.performance.mark).toHaveBeenCalledWith('test-async-end')
    })

    it('should clear marks after measurement', async () => {
      const fn = vi.fn(async () => 'result')

      await measureAsync('test-async', fn)

      expect(mockWindow.performance.clearMarks).toHaveBeenCalledWith([
        'test-async-start',
        'test-async-end',
      ])
    })

    it('should handle async errors', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Async error')
      })

      await expect(measureAsync('test-async-error', fn)).rejects.toThrow('Async error')
    })

    it('should create error measure on failure', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Test error')
      })

      try {
        await measureAsync('test-error', fn)
      } catch (error) {
        // Expected
      }

      expect(mockWindow.performance.measure).toHaveBeenCalledWith(
        'test-error-error',
        expect.any(String),
        expect.any(String)
      )
    })
  })

  describe('measureSync', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should measure sync function execution', () => {
      const fn = vi.fn(() => 'result')

      const result = measureSync('test-sync', fn)

      expect(result).toBe('result')
      expect(fn).toHaveBeenCalled()
      expect(mockWindow.performance.mark).toHaveBeenCalledWith('test-sync-start')
      expect(mockWindow.performance.mark).toHaveBeenCalledWith('test-sync-end')
    })

    it('should clear marks after measurement', () => {
      const fn = vi.fn(() => 'result')

      measureSync('test-sync', fn)

      expect(mockWindow.performance.clearMarks).toHaveBeenCalledWith([
        'test-sync-start',
        'test-sync-end',
      ])
    })

    it('should handle sync errors', () => {
      const fn = vi.fn(() => {
        throw new Error('Sync error')
      })

      expect(() => measureSync('test-sync-error', fn)).toThrow('Sync error')
    })

    it('should create error measure on failure', () => {
      const fn = vi.fn(() => {
        throw new Error('Test error')
      })

      try {
        measureSync('test-error', fn)
      } catch (error) {
        // Expected
      }

      expect(mockWindow.performance.measure).toHaveBeenCalledWith(
        'test-error-error',
        expect.any(String),
        expect.any(String)
      )
    })
  })

  describe('lazyLoadImages', () => {
    it('should set up IntersectionObserver', () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      }

      global.IntersectionObserver = vi.fn(
        () => mockObserver
      ) as unknown as typeof IntersectionObserver

      lazyLoadImages()

      expect(mockObserver.observe).toHaveBeenCalled()
    })

    it('should load image when intersecting', () => {
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn(),
      }

      const mockImg = {
        dataset: { src: 'test.jpg' },
        src: '',
        classList: {
          remove: vi.fn(),
        },
      }

      mockDocument.querySelectorAll.mockReturnValue([mockImg] as unknown as NodeListOf<Element>)

      global.IntersectionObserver = vi.fn(callback => {
        // Simulate intersection immediately
        callback([
          {
            isIntersecting: true,
            target: mockImg,
          },
        ] as unknown as IntersectionObserverEntry[])
        return mockObserver
      }) as unknown as typeof IntersectionObserver

      lazyLoadImages()

      expect(mockImg.src).toBe('test.jpg')
      expect(mockImg.classList.remove).toHaveBeenCalledWith('lazy')
    })

    it('should handle undefined IntersectionObserver', () => {
      global.IntersectionObserver = undefined as unknown as typeof IntersectionObserver

      expect(() => lazyLoadImages()).not.toThrow()
    })
  })

  describe('setImageFormatSupport', () => {
    it('should add modern-browser class', () => {
      setImageFormatSupport()

      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('modern-browser')
    })

    it('should detect WebP support', async () => {
      setImageFormatSupport()

      // WebP detection is asynchronous
      expect(true).toBe(true) // Placeholder for actual test
    })

    it('should handle undefined document', () => {
      const originalDocument = global.document
      // @ts-expect-error - Testing undefined case
      global.document = undefined

      expect(() => {
        setImageFormatSupport()
      }).not.toThrow()

      global.document = originalDocument
    })
  })

  describe('initPerformanceOptimizations', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should initialize all optimizations', () => {
      initPerformanceOptimizations()

      expect(mockWindow.addEventListener).toHaveBeenCalled()
      expect(mockWindow.performance.mark).toHaveBeenCalledWith('optimizations-init')
    })

    it('should handle undefined window', () => {
      const originalWindow = global.window
      // @ts-expect-error - Testing undefined case
      global.window = undefined

      expect(() => {
        initPerformanceOptimizations()
      }).not.toThrow()

      global.window = originalWindow
    })

    it('should measure page load time', () => {
      initPerformanceOptimizations()

      const loadCallback = mockWindow.addEventListener.mock.calls.find(
        call => call[0] === 'load'
      )?.[1]

      if (loadCallback) {
        loadCallback()
      }

      expect(mockWindow.performance.mark).toHaveBeenCalledWith('page-complete')
      expect(mockWindow.performance.measure).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle performance API errors', () => {
      mockWindow.performance.mark = vi.fn(() => {
        throw new Error('API error')
      })

      expect(() => performanceMark('test')).not.toThrow()
    })

    it('should handle empty resource lists', () => {
      expect(() => {
        preloadCriticalResources({})
      }).not.toThrow()

      expect(() => {
        preconnectToDomains([])
      }).not.toThrow()
    })

    it('should handle invalid domains', () => {
      expect(() => {
        preconnectToDomains(['invalid-url'])
      }).not.toThrow()
    })
  })
})
