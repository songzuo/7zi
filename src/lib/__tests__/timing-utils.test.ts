/**
 * Tests for Timing Utility Functions
 * 测试性能相关的工具函数
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// 静态 import。
// 之前用 `require('../timing')`：
//   - '../timing' 从 src/lib/__tests__/ 解析成 src/lib/timing —— 对的
//     但 require() 在 Vitest 里解析不了 TS 模块，报
//     "Cannot find module '../timing'"，整文件 33 个用例全挂。
import {
  performanceMark,
  performanceClearMark,
  performanceMeasure,
  performanceClearMeasure,
  createPerformanceObserver,
  formatTime,
  getNavigationTimingEntries,
  getPerformanceEntries,
  getPerformanceEntriesByName,
  getResourceTiming,
} from '../timing'

// Mock performance API
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  getEntries: vi.fn(),
  getEntriesByType: vi.fn(),
  getEntriesByName: vi.fn(),
  now: vi.fn(() => Date.now()),
}

const mockPerformanceObserver = vi.fn()

// Store original values
const originalPerformance = global.performance
const originalPerformanceObserver = global.PerformanceObserver

beforeEach(() => {
  vi.clearAllMocks()
  global.performance = mockPerformance as unknown as Performance
  global.PerformanceObserver = mockPerformanceObserver as unknown as typeof PerformanceObserver
})

afterEach(() => {
  // Restore original values
  global.performance = originalPerformance
  global.PerformanceObserver = originalPerformanceObserver
})

// ============================================
// Performance Mark Tests
// ============================================

describe('performanceMark', () => {
  it('should create a performance mark with name', () => {
    const mark = {
      name: 'test-mark',
      startTime: performance.now(),
      duration: 0,
    }
    mockPerformance.mark.mockReturnValue(mark as unknown as PerformanceMark)

    const result = performanceMark('test-mark')

    expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark', undefined)
    expect(result).toEqual(mark)
  })

  it('should create a performance mark with detail', () => {
    const detail = { custom: 'data' }
    const mark = {
      name: 'test-mark',
      startTime: performance.now(),
      duration: 0,
      detail,
    }
    mockPerformance.mark.mockReturnValue(mark as unknown as PerformanceMark)

    const result = performanceMark('test-mark', { detail })

    expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark', { detail })
    expect(result).toEqual(mark)
  })

  it('should return null when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    const result = performanceMark('test-mark')

    expect(result).toBeNull()
  })

  it('should return null on error', () => {
    mockPerformance.mark.mockImplementation(() => {
      throw new Error('Mark error')
    })

    const result = performanceMark('test-mark')

    expect(result).toBeNull()
  })
})

describe('performanceClearMark', () => {
  it('should clear a specific mark', () => {
    performanceClearMark('test-mark')

    expect(mockPerformance.clearMarks).toHaveBeenCalledWith('test-mark')
  })

  it('should clear all marks when no name provided', () => {
    performanceClearMark()

    expect(mockPerformance.clearMarks).toHaveBeenCalled()
  })

  it('should return early when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    performanceClearMark('test-mark')

    expect(mockPerformance.clearMarks).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', () => {
    mockPerformance.clearMarks.mockImplementation(() => {
      throw new Error('Clear error')
    })

    expect(() => {
      performanceClearMark('test-mark')
    }).not.toThrow()
  })
})

// ============================================
// Performance Measure Tests
// ============================================

describe('performanceMeasure', () => {
  it('should measure between two marks', () => {
    const measure = {
      name: 'test-measure',
      duration: 100,
      startTime: 0,
      endTime: 100,
    }
    mockPerformance.measure.mockReturnValue(measure as unknown as PerformanceMeasure)

    const result = performanceMeasure('test-measure', 'start-mark', 'end-mark')

    expect(mockPerformance.measure).toHaveBeenCalledWith('test-measure', 'start-mark', 'end-mark')
    expect(result).toEqual(measure)
  })

  it('should measure from mark to current time', () => {
    const measure = {
      name: 'test-measure',
      duration: 50,
      startTime: 0,
      endTime: 50,
    }
    mockPerformance.measure.mockReturnValue(measure as unknown as PerformanceMeasure)

    const result = performanceMeasure('test-measure', 'start-mark')

    // 生产实现（src/lib/timing.ts:104）在没传 endMark 时调的是
    // performance.measure(name, startMark) —— **两个**参数。
    // toHaveBeenCalledWith 对参数个数是严格的，写成三个（第三个 undefined）
    // 会不匹配。断言改成匹配实际调用。
    expect(mockPerformance.measure).toHaveBeenCalledWith('test-measure', 'start-mark')
    expect(result).toEqual(measure)
  })

  it('should return null when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    const result = performanceMeasure('test', 'start')

    expect(result).toBeNull()
  })

  it('should return null on error', () => {
    mockPerformance.measure.mockImplementation(() => {
      throw new Error('Measure error')
    })

    const result = performanceMeasure('test', 'start')

    expect(result).toBeNull()
  })
})

describe('performanceClearMeasure', () => {
  it('should clear a specific measure', () => {
    performanceClearMeasure('test-measure')

    expect(mockPerformance.clearMeasures).toHaveBeenCalledWith('test-measure')
  })

  it('should clear all measures when no name provided', () => {
    performanceClearMeasure()

    expect(mockPerformance.clearMeasures).toHaveBeenCalled()
  })

  it('should return early when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    performanceClearMeasure('test-measure')

    expect(mockPerformance.clearMeasures).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', () => {
    mockPerformance.clearMeasures.mockImplementation(() => {
      throw new Error('Clear error')
    })

    expect(() => {
      performanceClearMeasure('test-measure')
    }).not.toThrow()
  })
})

// ============================================
// Performance Entry Tests
// ============================================

describe('getPerformanceEntries', () => {
  it('should get entries by type', () => {
    const entries = [
      { name: 'entry1', entryType: 'mark' },
      { name: 'entry2', entryType: 'mark' },
    ]
    mockPerformance.getEntriesByType.mockReturnValue(entries as unknown as PerformanceEntryList)

    const result = getPerformanceEntries('mark')

    expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('mark')
    expect(result).toEqual(entries)
  })

  it('should get entries by name', () => {
    const entries = [{ name: 'test-entry', duration: 100 }]
    mockPerformance.getEntriesByName.mockReturnValue(entries as unknown as PerformanceEntryList)

    const result = getPerformanceEntriesByName('test-entry')

    expect(mockPerformance.getEntriesByName).toHaveBeenCalledWith('test-entry')
    expect(result).toEqual(entries)
  })

  it('should get all entries', () => {
    const entries = [
      { name: 'entry1', entryType: 'mark' },
      { name: 'entry2', entryType: 'measure' },
    ]
    mockPerformance.getEntries.mockReturnValue(entries as unknown as PerformanceEntryList)

    const result = getPerformanceEntries()

    expect(mockPerformance.getEntries).toHaveBeenCalled()
    expect(result).toEqual(entries)
  })

  it('should return null when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    const result = getPerformanceEntries()

    expect(result).toBeNull()
  })
})

// ============================================
// Performance Observer Tests
// ============================================

describe('createPerformanceObserver', () => {
  it('should create a performance observer', () => {
    const observer = { observe: vi.fn(), disconnect: vi.fn() }
    // 生产代码用 `new PerformanceObserver(cb)` 构造。
    // vi.fn().mockReturnValue(x) 只能用于**普通调用**；
    // 被 `new` 调用时 Vitest 抛
    //   TypeError: Cannot use `mockReturnValue` when called with `new`.
    // 要用 mockImplementation 返回一个构造函数。
    mockPerformanceObserver.mockImplementation(function (
      this: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> },
      _callback: unknown
    ) {
      this.observe = observer.observe
      this.disconnect = observer.disconnect
      return observer
    })

    const result = createPerformanceObserver()

    expect(mockPerformanceObserver).toHaveBeenCalledWith(expect.any(Function))
    expect(result).toEqual(observer)
  })

  it('should return null when PerformanceObserver is not supported', () => {
    global.PerformanceObserver = undefined as unknown as typeof PerformanceObserver

    const result = createPerformanceObserver()

    expect(result).toBeNull()
  })

  it('should return null on error', () => {
    mockPerformanceObserver.mockImplementation(() => {
      throw new Error('Observer error')
    })

    const result = createPerformanceObserver()

    expect(result).toBeNull()
  })
})

// ============================================
// Utility Function Tests
// ============================================

describe('formatTime', () => {
  it('should format microseconds', () => {
    const result = formatTime(500)
    expect(result).toMatch(/\d+μs/)
  })

  it('should format milliseconds', () => {
    const result = formatTime(1500)
    expect(result).toMatch(/\d+\.\d+ms/)
  })

  it('should format seconds', () => {
    const result = formatTime(2500000)
    expect(result).toMatch(/\d+\.\d+s/)
  })

  it('should format minutes', () => {
    const result = formatTime(150000000)
    expect(result).toMatch(/\d+m/)
  })

  it('should handle zero duration', () => {
    const result = formatTime(0)
    expect(result).toBe('0ms')
  })

  it('should handle very large duration', () => {
    const result = formatTime(999999999999)
    expect(result).toBeTruthy()
  })
})

describe('getNavigationTiming', () => {
  it('should get navigation timing entries', () => {
    const navEntry = {
      entryType: 'navigation',
      name: 'document',
      startTime: 0,
      duration: 1000,
      domContentLoadedEventEnd: 800,
      loadEventEnd: 1000,
    }
    mockPerformance.getEntriesByType.mockReturnValue([navEntry] as unknown as PerformanceEntryList)

    const result = getNavigationTimingEntries()

    expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('navigation')
    expect(result).toEqual([navEntry])
  })

  it('should return null when no navigation entries', () => {
    mockPerformance.getEntriesByType.mockReturnValue([])

    const result = getNavigationTimingEntries()

    expect(result).toBeNull()
  })
})

describe('getResourceTiming', () => {
  it('should get resource timing entries', () => {
    const resources = [
      { name: 'script.js', duration: 50, transferSize: 1024 },
      { name: 'style.css', duration: 30, transferSize: 512 },
    ]
    mockPerformance.getEntriesByType.mockReturnValue(resources as unknown as PerformanceEntryList)

    const result = getResourceTiming()

    expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('resource')
    expect(result).toEqual(resources)
  })

  it('should filter resources by pattern', () => {
    const resources = [
      { name: 'api/data.js', duration: 50, transferSize: 1024 },
      { name: 'styles.css', duration: 30, transferSize: 512 },
    ]
    mockPerformance.getEntriesByType.mockReturnValue(resources as unknown as PerformanceEntryList)

    const result = getResourceTiming(/\.js$/)

    expect(result).toEqual([{ name: 'api/data.js', duration: 50, transferSize: 1024 }])
  })
})
