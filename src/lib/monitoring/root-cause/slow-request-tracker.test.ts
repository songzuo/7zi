/**
 * Slow Request Tracker Tests
 * Tests for slow request tracking and analysis
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SlowRequestTracker,
  slowRequestTracker,
  createMockRequestTiming,
  type RequestTiming,
  type SlowRequestAnalysis,
} from './slow-request-tracker'

describe('SlowRequestTracker', () => {
  let tracker: SlowRequestTracker

  beforeEach(() => {
    tracker = new SlowRequestTracker()
  })

  describe('createMockRequestTiming', () => {
    it('should create a mock request timing with defaults', () => {
      const request = createMockRequestTiming()

      expect(request).toBeDefined()
      expect(request.url).toBe('https://api.example.com/data')
      expect(request.method).toBe('GET')
      expect(request.status).toBe(200)
      expect(request.duration).toBe(1000)
      expect(request.cached).toBe(false)
    })

    it('should allow overriding defaults', () => {
      const request = createMockRequestTiming({
        url: 'https://custom.api/endpoint',
        method: 'POST',
        status: 201,
        duration: 500,
      })

      expect(request.url).toBe('https://custom.api/endpoint')
      expect(request.method).toBe('POST')
      expect(request.status).toBe(201)
      expect(request.duration).toBe(500)
    })

    it('should generate timing breakdown based on duration', () => {
      const request = createMockRequestTiming({ duration: 1000 })

      expect(request.dnsLookup).toBeCloseTo(50, -1) // ~5%
      expect(request.tcpConnection).toBeCloseTo(50, -1) // ~5%
      expect(request.tlsHandshake).toBeCloseTo(100, -1) // ~10%
      expect(request.serverProcessing).toBeCloseTo(500, -1) // ~50%
    })

    it('should calculate start and end times from duration', () => {
      const request = createMockRequestTiming({ duration: 2000 })

      expect(request.endTime - request.startTime).toBe(2000)
    })

    it('should support custom timing breakdown', () => {
      const request = createMockRequestTiming({
        duration: 1000,
        dnsLookup: 200,
        tcpConnection: 150,
        tlsHandshake: 100,
        serverProcessing: 400,
      })

      expect(request.dnsLookup).toBe(200)
      expect(request.tcpConnection).toBe(150)
      expect(request.tlsHandshake).toBe(100)
      expect(request.serverProcessing).toBe(400)
    })

    it('should support all HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

      methods.forEach(method => {
        const request = createMockRequestTiming({ method })
        expect(request.method).toBe(method)
      })
    })

    it('should support all status codes', () => {
      const statusCodes = [200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 503]

      statusCodes.forEach(status => {
        const request = createMockRequestTiming({ status })
        expect(request.status).toBe(status)
      })
    })

    it('should support error scenarios', () => {
      const request = createMockRequestTiming({
        status: 500,
        error: 'Internal Server Error',
      })

      expect(request.status).toBe(500)
      expect(request.error).toBe('Internal Server Error')
    })
  })

  describe('trackRequest', () => {
    it('should track a single request', () => {
      const request = createMockRequestTiming()
      tracker.trackRequest(request)

      expect(tracker.getRequests()).toHaveLength(1)
      expect(tracker.getRequests()[0]).toEqual(request)
    })

    it('should track multiple requests', () => {
      const request1 = createMockRequestTiming({ url: 'url1' })
      const request2 = createMockRequestTiming({ url: 'url2' })
      const request3 = createMockRequestTiming({ url: 'url3' })

      tracker.trackRequest(request1)
      tracker.trackRequest(request2)
      tracker.trackRequest(request3)

      expect(tracker.getRequests()).toHaveLength(3)
    })

    it('should limit maximum tracked requests', () => {
      const maxRequests = 100
      const trackerLimited = new SlowRequestTracker()
      trackerLimited['maxRequests'] = maxRequests

      for (let i = 0; i < maxRequests + 50; i++) {
        trackerLimited.trackRequest(createMockRequestTiming())
      }

      expect(trackerLimited.getRequests().length).toBe(maxRequests)
    })

    it('should maintain insertion order', () => {
      const request1 = createMockRequestTiming({ url: 'first' })
      const request2 = createMockRequestTiming({ url: 'second' })
      const request3 = createMockRequestTiming({ url: 'third' })

      tracker.trackRequest(request1)
      tracker.trackRequest(request2)
      tracker.trackRequest(request3)

      const requests = tracker.getRequests()
      expect(requests[0].url).toBe('first')
      expect(requests[1].url).toBe('second')
      expect(requests[2].url).toBe('third')
    })
  })

  describe('trackRequests', () => {
    it('should track multiple requests at once', () => {
      const requests = [
        createMockRequestTiming({ url: 'url1' }),
        createMockRequestTiming({ url: 'url2' }),
        createMockRequestTiming({ url: 'url3' }),
      ]

      tracker.trackRequests(requests)

      expect(tracker.getRequests()).toHaveLength(3)
    })

    it('should handle empty array', () => {
      tracker.trackRequests([])

      expect(tracker.getRequests()).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('should clear all tracked requests', () => {
      tracker.trackRequest(createMockRequestTiming())
      tracker.trackRequest(createMockRequestTiming())

      tracker.clear()

      expect(tracker.getRequests()).toHaveLength(0)
    })
  })

  describe('getSlowRequests', () => {
    it('should return requests above total duration threshold', () => {
      const slowRequest = createMockRequestTiming({ duration: 3000 })
      const fastRequest = createMockRequestTiming({ duration: 500 })

      tracker.trackRequest(slowRequest)
      tracker.trackRequest(fastRequest)

      const slowRequests = tracker.getSlowRequests()

      expect(slowRequests).toHaveLength(1)
      expect(slowRequests[0].duration).toBe(3000)
    })

    it('should use custom thresholds', () => {
      const customTracker = new SlowRequestTracker({
        totalDuration: 500,
      })

      customTracker.trackRequest(createMockRequestTiming({ duration: 600 }))
      customTracker.trackRequest(createMockRequestTiming({ duration: 400 }))

      const slowRequests = customTracker.getSlowRequests()

      expect(slowRequests).toHaveLength(1)
    })

    it('should return empty array when no slow requests', () => {
      tracker.trackRequest(createMockRequestTiming({ duration: 500 }))
      tracker.trackRequest(createMockRequestTiming({ duration: 600 }))

      const slowRequests = tracker.getSlowRequests()

      expect(slowRequests).toHaveLength(0)
    })
  })

  describe('analyzeRequest', () => {
    it('should analyze a single request', () => {
      const request = createMockRequestTiming({ duration: 2000 })
      const analysis = tracker.analyzeRequest(request)

      expect(analysis).toBeDefined()
      expect(analysis.request).toEqual(request)
      expect(analysis.bottlenecks).toBeInstanceOf(Array)
      expect(analysis.totalDuration).toBe(2000)
      expect(analysis.primaryBottleneck).toBeDefined()
      expect(analysis.recommendations).toBeInstanceOf(Array)
    })

    it('should identify bottlenecks in slow requests', () => {
      const request = createMockRequestTiming({
        duration: 5000,
        serverProcessing: 3000,
      })

      const analysis = tracker.analyzeRequest(request)

      expect(analysis.bottlenecks.length).toBeGreaterThan(0)
      expect(analysis.primaryBottleneck).toBe('Server Processing')
    })

    it('should calculate bottleneck percentages', () => {
      const request = createMockRequestTiming({ duration: 1000 })
      const analysis = tracker.analyzeRequest(request)

      analysis.bottlenecks.forEach(bottleneck => {
        expect(bottleneck.percentage).toBeGreaterThanOrEqual(0)
        expect(bottleneck.percentage).toBeLessThanOrEqual(100)
      })
    })

    it('should determine bottleneck severity', () => {
      const request = createMockRequestTiming({
        duration: 5000,
        dnsLookup: 500, // 5x threshold
        serverProcessing: 3000, // 6x threshold
      })

      const analysis = tracker.analyzeRequest(request)

      const criticalBottlenecks = analysis.bottlenecks.filter(b => b.severity === 'critical')
      expect(criticalBottlenecks.length).toBeGreaterThan(0)
    })

    it('should generate recommendations', () => {
      const request = createMockRequestTiming({
        duration: 5000,
        serverProcessing: 3000,
      })

      const analysis = tracker.analyzeRequest(request)

      expect(analysis.recommendations.length).toBeGreaterThan(0)
      expect(analysis.recommendations[0].toLowerCase()).toContain('server')
    })

    it('should handle requests with no bottlenecks', () => {
      const request = createMockRequestTiming({
        duration: 100,
        dnsLookup: 10,
        tcpConnection: 10,
        serverProcessing: 50,
      })

      const analysis = tracker.analyzeRequest(request)

      expect(analysis.primaryBottleneck).toBe('None')
      expect(analysis.recommendations).toHaveLength(0)
    })
  })

  describe('identifyBottlenecks', () => {
    it('should identify DNS lookup bottleneck', () => {
      const request = createMockRequestTiming({
        duration: 2000,
        dnsLookup: 150, // 1.5x threshold of 100ms = warning
      })

      const bottlenecks = tracker['identifyBottlenecks'](request)
      const dnsBottleneck = bottlenecks.find(b => b.phase === 'DNS Lookup')

      expect(dnsBottleneck).toBeDefined()
      expect(dnsBottleneck?.severity).toBe('warning')
    })

    it('should identify TCP connection bottleneck', () => {
      const request = createMockRequestTiming({
        duration: 2000,
        tcpConnection: 150, // 1.5x threshold of 100ms = warning
      })

      const bottlenecks = tracker['identifyBottlenecks'](request)
      const tcpBottleneck = bottlenecks.find(b => b.phase === 'TCP Connection')

      expect(tcpBottleneck).toBeDefined()
      expect(tcpBottleneck?.severity).toBe('warning')
    })

    it('should identify TLS handshake bottleneck', () => {
      const request = createMockRequestTiming({
        duration: 2000,
        tlsHandshake: 300, // 1.5x threshold of 200ms = warning
      })

      const bottlenecks = tracker['identifyBottlenecks'](request)
      const tlsBottleneck = bottlenecks.find(b => b.phase === 'TLS Handshake')

      expect(tlsBottleneck).toBeDefined()
      expect(tlsBottleneck?.severity).toBe('warning')
    })

    it('should identify server processing bottleneck', () => {
      const request = createMockRequestTiming({
        duration: 2000,
        serverProcessing: 750, // 1.5x threshold of 500ms = warning
      })

      const bottlenecks = tracker['identifyBottlenecks'](request)
      const serverBottleneck = bottlenecks.find(b => b.phase === 'Server Processing')

      expect(serverBottleneck).toBeDefined()
      expect(serverBottleneck?.severity).toBe('warning')
    })

    it('should identify content transfer bottleneck', () => {
      const request = createMockRequestTiming({
        duration: 3000,
        contentTransfer: 1500, // 1.5x threshold of 1000ms = warning
      })

      const bottlenecks = tracker['identifyBottlenecks'](request)
      const contentBottleneck = bottlenecks.find(b => b.phase === 'Content Transfer')

      expect(contentBottleneck).toBeDefined()
      expect(contentBottleneck?.severity).toBe('warning')
    })

    it('should identify critical bottlenecks (2x threshold)', () => {
      const request = createMockRequestTiming({
        duration: 5000,
        dnsLookup: 300, // 3x threshold of 100ms
      })

      const bottlenecks = tracker['identifyBottlenecks'](request)
      const dnsBottleneck = bottlenecks.find(b => b.phase === 'DNS Lookup')

      expect(dnsBottleneck?.severity).toBe('critical')
    })

    it('should return bottlenecks sorted by duration', () => {
      const request = createMockRequestTiming({
        duration: 5000,
        dnsLookup: 200,
        serverProcessing: 2000,
        contentTransfer: 1500,
      })

      const bottlenecks = tracker['identifyBottlenecks'](request)

      for (let i = 1; i < bottlenecks.length; i++) {
        expect(bottlenecks[i - 1].duration).toBeGreaterThanOrEqual(bottlenecks[i].duration)
      }
    })

    it('should handle missing timing phases', () => {
      const request: RequestTiming = {
        url: 'https://example.com',
        method: 'GET',
        status: 200,
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        size: 1024,
        cached: false,
        // No detailed timing
      }

      const bottlenecks = tracker['identifyBottlenecks'](request)

      expect(bottlenecks).toHaveLength(0)
    })
  })

  describe('getStats', () => {
    it('should calculate statistics for tracked requests', () => {
      tracker.trackRequest(createMockRequestTiming({ duration: 100 }))
      tracker.trackRequest(createMockRequestTiming({ duration: 200 }))
      tracker.trackRequest(createMockRequestTiming({ duration: 300 }))
      tracker.trackRequest(createMockRequestTiming({ duration: 3000 })) // Slow

      const stats = tracker.getStats()

      expect(stats.totalRequests).toBe(4)
      expect(stats.slowRequests).toBe(1)
      expect(stats.averageDuration).toBe(900)
      expect(stats.p50Duration).toBeDefined()
      expect(stats.p95Duration).toBeDefined()
      expect(stats.p99Duration).toBeDefined()
    })

    it('should calculate percentiles correctly', () => {
      for (let i = 1; i <= 100; i++) {
        tracker.trackRequest(createMockRequestTiming({ duration: i * 10 }))
      }

      const stats = tracker.getStats()

      expect(stats.p50Duration).toBe(500)
      expect(stats.p95Duration).toBe(950)
      expect(stats.p99Duration).toBe(990)
    })

    it('should handle empty tracker', () => {
      const stats = tracker.getStats()

      expect(stats.totalRequests).toBe(0)
      expect(stats.slowRequests).toBe(0)
      expect(stats.averageDuration).toBe(0)
    })

    it('should return slowest requests', () => {
      tracker.trackRequest(createMockRequestTiming({ duration: 100 }))
      tracker.trackRequest(createMockRequestTiming({ duration: 3000 }))
      tracker.trackRequest(createMockRequestTiming({ duration: 5000 }))

      const stats = tracker.getStats()

      expect(stats.slowestRequests.length).toBeGreaterThan(0)
      expect(stats.slowestRequests[0].duration).toBe(5000)
    })
  })

  describe('findByUrl', () => {
    it('should find requests by URL string pattern', () => {
      tracker.trackRequest(createMockRequestTiming({ url: 'https://api.example.com/users' }))
      tracker.trackRequest(createMockRequestTiming({ url: 'https://api.example.com/posts' }))
      tracker.trackRequest(createMockRequestTiming({ url: 'https://cdn.example.com/script.js' }))

      const found = tracker.findByUrl('api.example.com')

      expect(found).toHaveLength(2)
    })

    it('should find requests by regex pattern', () => {
      tracker.trackRequest(createMockRequestTiming({ url: 'https://api.example.com/users/1' }))
      tracker.trackRequest(createMockRequestTiming({ url: 'https://api.example.com/users/2' }))
      tracker.trackRequest(createMockRequestTiming({ url: 'https://api.example.com/posts' }))

      const found = tracker.findByUrl(/users\/\d+/)

      expect(found).toHaveLength(2)
    })

    it('should return empty array when no matches', () => {
      tracker.trackRequest(createMockRequestTiming({ url: 'https://api.example.com' }))

      const found = tracker.findByUrl('notfound.com')

      expect(found).toHaveLength(0)
    })
  })

  describe('findByStatus', () => {
    it('should find requests by single status code', () => {
      tracker.trackRequest(createMockRequestTiming({ status: 200 }))
      tracker.trackRequest(createMockRequestTiming({ status: 404 }))
      tracker.trackRequest(createMockRequestTiming({ status: 200 }))

      const found = tracker.findByStatus(200)

      expect(found).toHaveLength(2)
    })

    it('should find requests by multiple status codes', () => {
      tracker.trackRequest(createMockRequestTiming({ status: 200 }))
      tracker.trackRequest(createMockRequestTiming({ status: 404 }))
      tracker.trackRequest(createMockRequestTiming({ status: 500 }))
      tracker.trackRequest(createMockRequestTiming({ status: 201 }))

      const found = tracker.findByStatus([404, 500])

      expect(found).toHaveLength(2)
    })

    it('should return empty array when no matches', () => {
      tracker.trackRequest(createMockRequestTiming({ status: 200 }))

      const found = tracker.findByStatus(404)

      expect(found).toHaveLength(0)
    })
  })

  describe('getWorstPerformingUrls', () => {
    it('should return URLs sorted by average duration', () => {
      tracker.trackRequest(createMockRequestTiming({ url: 'api1', duration: 100 }))
      tracker.trackRequest(createMockRequestTiming({ url: 'api1', duration: 200 }))
      tracker.trackRequest(createMockRequestTiming({ url: 'api2', duration: 500 }))
      tracker.trackRequest(createMockRequestTiming({ url: 'api2', duration: 700 }))

      const worst = tracker.getWorstPerformingUrls()

      expect(worst).toHaveLength(2)
      expect(worst[0].url).toBe('api2')
      expect(worst[0].avgDuration).toBe(600)
    })

    it('should respect limit parameter', () => {
      for (let i = 0; i < 20; i++) {
        tracker.trackRequest(
          createMockRequestTiming({
            url: `api${i}`,
            duration: i * 100,
          })
        )
      }

      const worst = tracker.getWorstPerformingUrls(5)

      expect(worst).toHaveLength(5)
    })

    it('should aggregate by URL correctly', () => {
      tracker.trackRequest(createMockRequestTiming({ url: 'api1', duration: 100 }))
      tracker.trackRequest(createMockRequestTiming({ url: 'api1', duration: 200 }))
      tracker.trackRequest(createMockRequestTiming({ url: 'api1', duration: 300 }))

      const worst = tracker.getWorstPerformingUrls()

      expect(worst[0].count).toBe(3)
      expect(worst[0].avgDuration).toBe(200)
    })
  })

  describe('Threshold Management', () => {
    it('should allow updating thresholds', () => {
      tracker.updateThresholds({
        dnsLookup: 200,
        serverProcessing: 1000,
      })

      const thresholds = tracker.getThresholds()

      expect(thresholds.dnsLookup).toBe(200)
      expect(thresholds.serverProcessing).toBe(1000)
    })

    it('should preserve non-updated thresholds', () => {
      const original = tracker.getThresholds()

      tracker.updateThresholds({ dnsLookup: 999 })

      const updated = tracker.getThresholds()

      expect(updated.tcpConnection).toBe(original.tcpConnection)
      expect(updated.dnsLookup).toBe(999)
    })

    it('should use custom thresholds in analysis', () => {
      tracker.updateThresholds({ totalDuration: 500 })

      tracker.trackRequest(createMockRequestTiming({ duration: 600 }))

      const slowRequests = tracker.getSlowRequests()

      expect(slowRequests).toHaveLength(1)
    })
  })

  describe('Singleton Instance', () => {
    it('should provide singleton instance', () => {
      expect(slowRequestTracker).toBeInstanceOf(SlowRequestTracker)
    })

    it('should persist state across uses', () => {
      slowRequestTracker.clear()
      slowRequestTracker.trackRequest(createMockRequestTiming())

      expect(slowRequestTracker.getRequests()).toHaveLength(1)

      // Clear for other tests
      slowRequestTracker.clear()
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative durations', () => {
      const request = createMockRequestTiming({ duration: -100 })
      tracker.trackRequest(request)

      const analysis = tracker.analyzeRequest(request)
      expect(analysis).toBeDefined()
    })

    it('should handle zero duration', () => {
      const request = createMockRequestTiming({ duration: 0 })
      tracker.trackRequest(request)

      const analysis = tracker.analyzeRequest(request)
      expect(analysis).toBeDefined()
    })

    it('should handle very large sizes', () => {
      const request = createMockRequestTiming({ size: Number.MAX_SAFE_INTEGER })
      tracker.trackRequest(request)

      expect(tracker.getRequests()[0].size).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('should handle cached requests', () => {
      const request = createMockRequestTiming({
        cached: true,
        duration: 200,
      })

      tracker.trackRequest(request)

      const cached = tracker.getRequests().filter(r => r.cached)
      expect(cached).toHaveLength(1)
    })

    it('should handle requests with headers', () => {
      const request = createMockRequestTiming({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      })

      tracker.trackRequest(request)

      const tracked = tracker.getRequests()[0]
      expect(tracked.headers).toBeDefined()
      expect(tracked.headers?.['Content-Type']).toBe('application/json')
    })

    it('should handle requests with errors', () => {
      const request = createMockRequestTiming({
        status: 0,
        error: 'Network timeout',
      })

      tracker.trackRequest(request)

      const withError = tracker.getRequests().filter(r => r.error)
      expect(withError).toHaveLength(1)
    })
  })
})
