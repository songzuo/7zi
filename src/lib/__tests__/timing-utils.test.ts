/**
 * Tests for Timing Utility Functions
 * 测试性能相关的工具函数
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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

    const result = require('../timing').performanceMark('test-mark')

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

    const result = require('../timing').performanceMark('test-mark', { detail })

    expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark', { detail })
    expect(result).toEqual(mark)
  })

  it('should return null when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    const result = require('../timing').performanceMark('test-mark')

    expect(result).toBeNull()
  })

  it('should return null on error', () => {
    mockPerformance.mark.mockImplementation(() => {
      throw new Error('Mark error')
    })

    const result = require('../timing').performanceMark('test-mark')

    expect(result).toBeNull()
  })
})

describe('performanceClearMark', () => {
  it('should clear a specific mark', () => {
    require('../timing').performanceClearMark('test-mark')

    expect(mockPerformance.clearMarks).toHaveBeenCalledWith('test-mark')
  })

  it('should clear all marks when no name provided', () => {
    require('../timing').performanceClearMark()

    expect(mockPerformance.clearMarks).toHaveBeenCalled()
  })

  it('should return early when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    require('../timing').performanceClearMark('test-mark')

    expect(mockPerformance.clearMarks).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', () => {
    mockPerformance.clearMarks.mockImplementation(() => {
      throw new Error('Clear error')
    })

    expect(() => {
      require('../timing').performanceClearMark('test-mark')
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

    const result = require('../timing').performanceMeasure('test-measure', 'start-mark', 'end-mark')

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

    const result = require('../timing').performanceMeasure('test-measure', 'start-mark')

    expect(mockPerformance.measure).toHaveBeenCalledWith('test-measure', 'start-mark', undefined)
    expect(result).toEqual(measure)
  })

  it('should return null when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    const result = require('../timing').performanceMeasure('test', 'start')

    expect(result).toBeNull()
  })

  it('should return null on error', () => {
    mockPerformance.measure.mockImplementation(() => {
      throw new Error('Measure error')
    })

    const result = require('../timing').performanceMeasure('test', 'start')

    expect(result).toBeNull()
  })
})

describe('performanceClearMeasure', () => {
  it('should clear a specific measure', () => {
    require('../timing').performanceClearMeasure('test-measure')

    expect(mockPerformance.clearMeasures).toHaveBeenCalledWith('test-measure')
  })

  it('should clear all measures when no name provided', () => {
    require('../timing').performanceClearMeasure()

    expect(mockPerformance.clearMeasures).toHaveBeenCalled()
  })

  it('should return early when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    require('../timing').performanceClearMeasure('test-measure')

    expect(mockPerformance.clearMeasures).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', () => {
    mockPerformance.clearMeasures.mockImplementation(() => {
      throw new Error('Clear error')
    })

    expect(() => {
      require('../timing').performanceClearMeasure('test-measure')
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

    const result = require('../timing').getPerformanceEntries('mark')

    expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('mark')
    expect(result).toEqual(entries)
  })

  it('should get entries by name', () => {
    const entries = [{ name: 'test-entry', duration: 100 }]
    mockPerformance.getEntriesByName.mockReturnValue(entries as unknown as PerformanceEntryList)

    const result = require('../timing').getPerformanceEntriesByName('test-entry')

    expect(mockPerformance.getEntriesByName).toHaveBeenCalledWith('test-entry')
    expect(result).toEqual(entries)
  })

  it('should get all entries', () => {
    const entries = [
      { name: 'entry1', entryType: 'mark' },
      { name: 'entry2', entryType: 'measure' },
    ]
    mockPerformance.getEntries.mockReturnValue(entries as unknown as PerformanceEntryList)

    const result = require('../timing').getPerformanceEntries()

    expect(mockPerformance.getEntries).toHaveBeenCalled()
    expect(result).toEqual(entries)
  })

  it('should return null when performance is not supported', () => {
    global.performance = undefined as unknown as Performance

    const result = require('../timing').getPerformanceEntries()

    expect(result).toBeNull()
  })
})

// ============================================
// Performance Observer Tests
// ============================================

describe('createPerformanceObserver', () => {
  it('should create a performance observer', () => {
    const observer = { observe: vi.fn(), disconnect: vi.fn() }
    mockPerformanceObserver.mockReturnValue(observer as unknown as PerformanceObserver)

    const result = require('../timing').createPerformanceObserver()

    expect(mockPerformanceObserver).toHaveBeenCalledWith(expect.any(Function))
    expect(result).toEqual(observer)
  })

  it('should return null when PerformanceObserver is not supported', () => {
    global.PerformanceObserver = undefined as unknown as typeof PerformanceObserver

    const result = require('../timing').createPerformanceObserver()

    expect(result).toBeNull()
  })

  it('should return null on error', () => {
    mockPerformanceObserver.mockImplementation(() => {
      throw new Error('Observer error')
    })

    const result = require('../timing').createPerformanceObserver()

    expect(result).toBeNull()
  })
})

// ============================================
// Utility Function Tests
// ============================================

describe('formatTime', () => {
  it('should format microseconds', () => {
    const result = require('../timing').formatTime(500)
    expect(result).toMatch(/\d+μs/)
  })

  it('should format milliseconds', () => {
    const result = require('../timing').formatTime(1500)
    expect(result).toMatch(/\d+\.\d+ms/)
  })

  it('should format seconds', () => {
    const result = require('../timing').formatTime(2500000)
    expect(result).toMatch(/\d+\.\d+s/)
  })

  it('should format minutes', () => {
    const result = require('../timing').formatTime(150000000)
    expect(result).toMatch(/\d+m/)
  })

  it('should handle zero duration', () => {
    const result = require('../timing').formatTime(0)
    expect(result).toBe('0ms')
  })

  it('should handle very large duration', () => {
    const result = require('../timing').formatTime(999999999999)
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

    const result = require('../timing').getNavigationTiming()

    expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('navigation')
    expect(result).toEqual([navEntry])
  })

  it('should return null when no navigation entries', () => {
    mockPerformance.getEntriesByType.mockReturnValue([])

    const result = require('../timing').getNavigationTiming()

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

    const result = require('../timing').getResourceTiming()

    expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('resource')
    expect(result).toEqual(resources)
  })

  it('should filter resources by pattern', () => {
    const resources = [
      { name: 'api/data.js', duration: 50, transferSize: 1024 },
      { name: 'styles.css', duration: 30, transferSize: 512 },
    ]
    mockPerformance.getEntriesByType.mockReturnValue(resources as unknown as PerformanceEntryList)

    const result = require('../timing').getResourceTiming(/\.js$/)

    expect(result).toEqual([{ name: 'api/data.js', duration: 50, transferSize: 1024 }])
  })
})
