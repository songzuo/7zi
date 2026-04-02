/**
 * Performance Waterfall Analyzer Tests
 * Tests for resource loading waterfall analysis
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  PerformanceWaterfall,
  performanceWaterfall,
  createMockResourceTiming,
  type ResourceTiming,
  type WaterfallAnalysis,
} from './performance-waterfall'

describe('PerformanceWaterfall', () => {
  let analyzer: PerformanceWaterfall

  beforeEach(() => {
    analyzer = new PerformanceWaterfall()
  })

  describe('createMockResourceTiming', () => {
    it('should create a mock resource timing with defaults', () => {
      const resource = createMockResourceTiming()

      expect(resource).toBeDefined()
      expect(resource.name).toBe('https://example.com/script.js')
      expect(resource.startTime).toBe(0)
      expect(resource.duration).toBe(500)
      expect(resource.initiatorType).toBe('script')
      expect(resource.transferSize).toBe(50 * 1024)
      expect(resource.responseStatus).toBe(200)
    })

    it('should allow overriding defaults', () => {
      const resource = createMockResourceTiming({
        name: 'https://cdn.com/style.css',
        duration: 1000,
        initiatorType: 'link',
      })

      expect(resource.name).toBe('https://cdn.com/style.css')
      expect(resource.duration).toBe(1000)
      expect(resource.initiatorType).toBe('link')
    })

    it('should support all resource types', () => {
      const script = createMockResourceTiming({ initiatorType: 'script' })
      const style = createMockResourceTiming({ initiatorType: 'link' })
      const img = createMockResourceTiming({ initiatorType: 'img' })
      const doc = createMockResourceTiming({ initiatorType: 'document' })

      expect(script.initiatorType).toBe('script')
      expect(style.initiatorType).toBe('link')
      expect(img.initiatorType).toBe('img')
      expect(doc.initiatorType).toBe('document')
    })
  })

  describe('addResource', () => {
    it('should add a single resource', () => {
      const resource = createMockResourceTiming()
      analyzer.addResource(resource)

      expect(analyzer.getResources()).toHaveLength(1)
      expect(analyzer.getResources()[0]).toEqual(resource)
    })

    it('should add multiple resources', () => {
      const resource1 = createMockResourceTiming({ name: 'resource1.js' })
      const resource2 = createMockResourceTiming({ name: 'resource2.js' })
      const resource3 = createMockResourceTiming({ name: 'resource3.js' })

      analyzer.addResource(resource1)
      analyzer.addResource(resource2)
      analyzer.addResource(resource3)

      expect(analyzer.getResources()).toHaveLength(3)
    })

    it('should preserve resource order', () => {
      const resource1 = createMockResourceTiming({ startTime: 0 })
      const resource2 = createMockResourceTiming({ startTime: 100 })
      const resource3 = createMockResourceTiming({ startTime: 200 })

      analyzer.addResource(resource3)
      analyzer.addResource(resource1)
      analyzer.addResource(resource2)

      const resources = analyzer.getResources()
      expect(resources[0]).toEqual(resource3)
      expect(resources[1]).toEqual(resource1)
      expect(resources[2]).toEqual(resource2)
    })
  })

  describe('addResources', () => {
    it('should add multiple resources at once', () => {
      const resources = [
        createMockResourceTiming({ name: 'resource1.js' }),
        createMockResourceTiming({ name: 'resource2.js' }),
        createMockResourceTiming({ name: 'resource3.js' }),
      ]

      analyzer.addResources(resources)

      expect(analyzer.getResources()).toHaveLength(3)
    })

    it('should handle empty array', () => {
      analyzer.addResources([])

      expect(analyzer.getResources()).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('should clear all resources', () => {
      analyzer.addResource(createMockResourceTiming())
      analyzer.addResource(createMockResourceTiming())

      analyzer.clear()

      expect(analyzer.getResources()).toHaveLength(0)
    })
  })

  describe('breakdownResource', () => {
    it('should break down resource into phases', () => {
      const resource = createMockResourceTiming({ duration: 1000 })
      const breakdown = analyzer['breakdownResource'](resource)

      expect(breakdown).toHaveLength(6)
      expect(breakdown[0].phase).toBe('DNS Lookup')
      expect(breakdown[1].phase).toBe('TCP Connection')
      expect(breakdown[2].phase).toBe('TLS Handshake')
      expect(breakdown[3].phase).toBe('Request Sent')
      expect(breakdown[4].phase).toBe('Server Processing')
      expect(breakdown[5].phase).toBe('Content Download')
    })

    it('should calculate phase durations correctly', () => {
      const resource = createMockResourceTiming({ duration: 1000 })
      const breakdown = analyzer['breakdownResource'](resource)

      expect(breakdown[0].duration).toBe(100) // 10%
      expect(breakdown[4].duration).toBe(300) // 30%
    })

    it('should include phase percentages', () => {
      const resource = createMockResourceTiming({ duration: 1000 })
      const breakdown = analyzer['breakdownResource'](resource)

      breakdown.forEach(phase => {
        expect(phase.percentage).toBeGreaterThanOrEqual(0)
        expect(phase.percentage).toBeLessThanOrEqual(100)
      })
    })

    it('should assign colors to phases', () => {
      const resource = createMockResourceTiming({ duration: 1000 })
      const breakdown = analyzer['breakdownResource'](resource)

      breakdown.forEach(phase => {
        expect(phase.color).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })

    it('should handle zero duration', () => {
      const resource = createMockResourceTiming({ duration: 0 })
      const breakdown = analyzer['breakdownResource'](resource)

      expect(breakdown).toBeDefined()
      // Each phase duration should be calculated from the 0ms total
      expect(breakdown.length).toBe(6)
      breakdown.forEach(phase => {
        expect(phase.duration).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('analyzeResource', () => {
    it('should analyze a single resource', () => {
      const resource = createMockResourceTiming({ duration: 1000 })
      const entry = analyzer.analyzeResource(resource)

      expect(entry).toBeDefined()
      expect(entry.resource).toEqual(resource)
      expect(entry.breakdown).toBeDefined()
      expect(entry.breakdown.length).toBeGreaterThan(0)
      expect(entry.critical).toBeDefined()
      expect(entry.onCriticalPath).toBeDefined()
    })

    it('should mark large resources as critical', () => {
      const resource = createMockResourceTiming({
        transferSize: 1024 * 1024, // 1MB
      })
      const entry = analyzer.analyzeResource(resource)

      expect(entry.critical).toBe(true)
    })

    it('should mark failed resources as critical', () => {
      const resource = createMockResourceTiming({
        responseStatus: 500,
      })
      const entry = analyzer.analyzeResource(resource)

      expect(entry.critical).toBe(true)
    })

    it('should mark document resources as on critical path', () => {
      const resource = createMockResourceTiming({
        initiatorType: 'document',
        name: 'https://example.com/index.html',
      })
      const entry = analyzer.analyzeResource(resource)

      expect(entry.onCriticalPath).toBe(true)
    })

    it('should mark blocking scripts as on critical path', () => {
      const resource = createMockResourceTiming({
        initiatorType: 'script',
        name: 'https://example.com/script.js',
      })
      const entry = analyzer.analyzeResource(resource)

      expect(entry.onCriticalPath).toBe(true)
    })

    it('should mark async scripts as not on critical path', () => {
      const resource = createMockResourceTiming({
        initiatorType: 'script',
        name: 'https://example.com/script-async.js',
      })
      const entry = analyzer.analyzeResource(resource)

      // Not on critical path because it has "async" in the name
      expect(entry.onCriticalPath).toBe(false)
    })
  })

  describe('identifyCriticalPath', () => {
    it('should identify sequential resources', () => {
      const resource1 = createMockResourceTiming({ startTime: 0, duration: 100 })
      const resource2 = createMockResourceTiming({ startTime: 100, duration: 100 })
      const resource3 = createMockResourceTiming({ startTime: 200, duration: 100 })

      analyzer.addResource(resource1)
      analyzer.addResource(resource2)
      analyzer.addResource(resource3)

      const segments = analyzer.identifyCriticalPath()

      expect(segments).toBeDefined()
      expect(segments.length).toBeGreaterThan(0)
    })

    it('should identify parallel resources', () => {
      const resource1 = createMockResourceTiming({ startTime: 0, duration: 200 })
      const resource2 = createMockResourceTiming({ startTime: 50, duration: 150 })
      const resource3 = createMockResourceTiming({ startTime: 250, duration: 100 })

      analyzer.addResource(resource1)
      analyzer.addResource(resource2)
      analyzer.addResource(resource3)

      const segments = analyzer.identifyCriticalPath()

      expect(segments).toBeDefined()
    })

    it('should identify bottlenecks in segments', () => {
      const resource1 = createMockResourceTiming({ startTime: 0, duration: 600 })
      const resource2 = createMockResourceTiming({ startTime: 50, duration: 100 })
      const resource3 = createMockResourceTiming({ startTime: 700, duration: 100 })

      analyzer.addResource(resource1)
      analyzer.addResource(resource2)
      analyzer.addResource(resource3)

      const segments = analyzer.identifyCriticalPath()

      const segmentWithBottleneck = segments.find(s => s.bottleneck !== undefined)
      expect(segmentWithBottleneck).toBeDefined()
      if (segmentWithBottleneck?.bottleneck) {
        expect(segmentWithBottleneck.bottleneck.resource).toBeDefined()
        expect(segmentWithBottleneck.bottleneck.phase).toBeDefined()
        expect(segmentWithBottleneck.bottleneck.impact).toBeGreaterThan(0)
      }
    })

    it('should calculate segment durations correctly', () => {
      const resource1 = createMockResourceTiming({ startTime: 0, duration: 100 })
      const resource2 = createMockResourceTiming({ startTime: 100, duration: 100 })

      analyzer.addResource(resource1)
      analyzer.addResource(resource2)

      const segments = analyzer.identifyCriticalPath()

      segments.forEach(segment => {
        expect(segment.totalDuration).toBeGreaterThan(0)
        expect(segment.resources.length).toBeGreaterThan(0)
      })
    })
  })

  describe('analyzeWaterfall', () => {
    it('should analyze complete waterfall with multiple resources', () => {
      const resources = [
        createMockResourceTiming({
          name: 'index.html',
          startTime: 0,
          duration: 200,
          initiatorType: 'document',
        }),
        createMockResourceTiming({
          name: 'style.css',
          startTime: 200,
          duration: 100,
          initiatorType: 'link',
        }),
        createMockResourceTiming({
          name: 'script.js',
          startTime: 300,
          duration: 150,
          initiatorType: 'script',
        }),
        createMockResourceTiming({
          name: 'image.jpg',
          startTime: 450,
          duration: 300,
          initiatorType: 'img',
        }),
      ]

      analyzer.addResources(resources)
      const analysis = analyzer.analyzeWaterfall()

      expect(analysis).toBeDefined()
      expect(analysis.entries).toHaveLength(4)
      expect(analysis.totalPageLoadTime).toBeGreaterThan(0)
      expect(analysis.networkTime).toBeGreaterThan(0)
      expect(analysis.parallelism).toBeGreaterThan(0)
      expect(analysis.recommendations).toBeInstanceOf(Array)
      expect(analysis.criticalPath).toBeInstanceOf(Array)
    })

    it('should calculate total page load time', () => {
      const resources = [
        createMockResourceTiming({ startTime: 0, duration: 100 }),
        createMockResourceTiming({ startTime: 100, duration: 200 }),
        createMockResourceTiming({ startTime: 300, duration: 150 }),
      ]

      analyzer.addResources(resources)
      const analysis = analyzer.analyzeWaterfall()

      expect(analysis.totalPageLoadTime).toBe(450)
    })

    it('should calculate network time', () => {
      const resources = [
        createMockResourceTiming({ duration: 100 }),
        createMockResourceTiming({ duration: 200 }),
        createMockResourceTiming({ duration: 150 }),
      ]

      analyzer.addResources(resources)
      const analysis = analyzer.analyzeWaterfall()

      expect(analysis.networkTime).toBe(450)
    })

    it('should calculate parallelism', () => {
      const resources = [
        createMockResourceTiming({ startTime: 0, duration: 200 }),
        createMockResourceTiming({ startTime: 0, duration: 200 }),
        createMockResourceTiming({ startTime: 200, duration: 100 }),
      ]

      analyzer.addResources(resources)
      const analysis = analyzer.analyzeWaterfall()

      // Parallel resources load faster total time
      expect(analysis.parallelism).toBeGreaterThan(0)
      expect(analysis.parallelism).toBeLessThanOrEqual(1)
    })

    it('should generate recommendations', () => {
      const resources = [
        createMockResourceTiming({
          transferSize: 1024 * 1024,
          duration: 1000,
        }),
        createMockResourceTiming({
          initiatorType: 'link',
          duration: 500,
        }),
      ]

      analyzer.addResources(resources)
      const analysis = analyzer.analyzeWaterfall()

      expect(analysis.recommendations.length).toBeGreaterThan(0)
      expect(analysis.recommendations).toContainEqual(expect.stringContaining('500KB'))
    })

    it('should identify critical path resources', () => {
      const resources = [
        createMockResourceTiming({ initiatorType: 'document' }),
        createMockResourceTiming({ initiatorType: 'link' }),
        createMockResourceTiming({ initiatorType: 'script' }),
        createMockResourceTiming({ initiatorType: 'img' }),
      ]

      analyzer.addResources(resources)
      const analysis = analyzer.analyzeWaterfall()

      expect(analysis.criticalPath.length).toBeGreaterThan(0)
      analysis.criticalPath.forEach(resource => {
        expect(['document', 'link', 'script']).toContain(resource.initiatorType)
      })
    })

    it('should calculate main thread blocking time', () => {
      const resources = [
        createMockResourceTiming({ initiatorType: 'script', duration: 100 }),
        createMockResourceTiming({ initiatorType: 'script', duration: 200 }),
      ]

      analyzer.addResources(resources)
      const analysis = analyzer.analyzeWaterfall()

      expect(analysis.mainThreadBlockingTime).toBeGreaterThan(0)
      // Should be around 50% of total script time
      expect(analysis.mainThreadBlockingTime).toBe(150)
    })

    it('should handle empty resources', () => {
      const analysis = analyzer.analyzeWaterfall()

      expect(analysis).toBeDefined()
      expect(analysis.entries).toHaveLength(0)
      expect(analysis.totalPageLoadTime).toBe(0)
      expect(analysis.networkTime).toBe(0)
    })
  })

  describe('findSlowestResources', () => {
    it('should return slowest resources sorted by duration', () => {
      const resources = [
        createMockResourceTiming({ name: 'fast', duration: 100 }),
        createMockResourceTiming({ name: 'medium', duration: 500 }),
        createMockResourceTiming({ name: 'slow', duration: 1000 }),
      ]

      analyzer.addResources(resources)
      const slowest = analyzer.findSlowestResources(2)

      expect(slowest).toHaveLength(2)
      expect(slowest[0].resource.name).toBe('slow')
      expect(slowest[1].resource.name).toBe('medium')
    })

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.addResource(
          createMockResourceTiming({
            name: `resource${i}`,
            duration: i * 100,
          })
        )
      }

      const slowest = analyzer.findSlowestResources(5)

      expect(slowest).toHaveLength(5)
    })

    it('should return empty array when no resources', () => {
      const slowest = analyzer.findSlowestResources()

      expect(slowest).toHaveLength(0)
    })
  })

  describe('findLargestResources', () => {
    it('should return largest resources sorted by size', () => {
      const resources = [
        createMockResourceTiming({
          name: 'small',
          transferSize: 10 * 1024,
        }),
        createMockResourceTiming({
          name: 'medium',
          transferSize: 100 * 1024,
        }),
        createMockResourceTiming({
          name: 'large',
          transferSize: 1000 * 1024,
        }),
      ]

      analyzer.addResources(resources)
      const largest = analyzer.findLargestResources(2)

      expect(largest).toHaveLength(2)
      expect(largest[0].resource.name).toBe('large')
      expect(largest[1].resource.name).toBe('medium')
    })

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.addResource(
          createMockResourceTiming({
            name: `resource${i}`,
            transferSize: i * 50 * 1024,
          })
        )
      }

      const largest = analyzer.findLargestResources(5)

      expect(largest).toHaveLength(5)
    })

    it('should return empty array when no resources', () => {
      const largest = analyzer.findLargestResources()

      expect(largest).toHaveLength(0)
    })
  })

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(performanceWaterfall).toBeInstanceOf(PerformanceWaterfall)
    })

    it('should persist state across uses', () => {
      performanceWaterfall.clear()
      performanceWaterfall.addResource(createMockResourceTiming())

      expect(performanceWaterfall.getResources()).toHaveLength(1)

      // Clear for other tests
      performanceWaterfall.clear()
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative durations', () => {
      const resource = createMockResourceTiming({ duration: -100 })
      analyzer.addResource(resource)

      expect(() => analyzer.analyzeWaterfall()).not.toThrow()
    })

    it('should handle very large durations', () => {
      const resource = createMockResourceTiming({ duration: 60000 }) // 60 seconds
      analyzer.addResource(resource)

      expect(() => analyzer.analyzeWaterfall()).not.toThrow()
    })

    it('should handle zero transfer size', () => {
      const resource = createMockResourceTiming({
        transferSize: 0,
        duration: 500,
      })
      analyzer.addResource(resource)

      const analysis = analyzer.analyzeWaterfall()
      expect(analysis.entries[0].resource.transferSize).toEqual(0)
    })

    it('should handle duplicate resource names', () => {
      analyzer.addResource(createMockResourceTiming({ name: 'dup.js' }))
      analyzer.addResource(createMockResourceTiming({ name: 'dup.js' }))
      analyzer.addResource(createMockResourceTiming({ name: 'dup.js' }))

      expect(analyzer.getResources()).toHaveLength(3)
    })

    it('should handle resources with no initiator type', () => {
      const resource = createMockResourceTiming({ initiatorType: '' })
      analyzer.addResource(resource)

      expect(() => analyzer.analyzeWaterfall()).not.toThrow()
    })
  })
})
