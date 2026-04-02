/**
 * @fileoverview Performance API integration tests
 * @description Tests for /api/performance/metrics and /api/metrics/performance endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { server, mockData } from './mocks/handlers'

describe('/api/performance/metrics - Integration Tests', () => {
  beforeAll(() => {
    server.listen()
  })

  beforeEach(() => {
    mockData.resetAll()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('GET /api/performance/metrics', () => {
    it('should return performance metrics with success', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.metrics).toBeDefined()
      expect(Array.isArray(data.data.metrics)).toBe(true)
    })

    it('should return metrics with stats', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.stats).toBeDefined()
      expect(data.data.totalAlerts).toBeDefined()
    })

    it('should filter metrics by route', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics?route=/')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter metrics by metric name', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics?metric=LCP')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      if (data.data.metrics.length > 0) {
        data.data.metrics.forEach((m: any) => {
          expect(m.name).toBe('LCP')
        })
      }
    })

    it('should filter metrics by rating', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics?rating=good')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics?limit=2')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.metrics.length).toBeLessThanOrEqual(2)
    })
  })

  describe('POST /api/performance/metrics', () => {
    it('should store performance metrics', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [
            { name: 'LCP', value: 1500, rating: 'good' },
            { name: 'FID', value: 50, rating: 'good' },
          ],
          metadata: { route: '/home', deviceType: 'desktop' },
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.stored).toBe(2)
      expect(data.data.alertsTriggered).toBe(0)
    })

    it('should reject POST with invalid metrics (empty array)', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: [], metadata: {} }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should reject POST with missing metrics field', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: {} }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should accept single metric', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [{ name: 'CLS', value: 0.1, rating: 'good' }],
          metadata: { route: '/page', deviceType: 'mobile' },
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.stored).toBe(1)
    })
  })

  describe('DELETE /api/performance/metrics', () => {
    it('should clear all metrics when no before param', async () => {
      const response = await fetch('http://localhost:3000/api/performance/metrics', {
        method: 'DELETE',
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.remainingMetrics).toBe(0)
    })

    it('should clear metrics before timestamp', async () => {
      const before = Date.now()
      const response = await fetch(
        `http://localhost:3000/api/performance/metrics?before=${before}`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})

describe('/api/metrics/performance - Integration Tests', () => {
  beforeEach(() => {
    server.listen()
    mockData.resetAll()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('GET /api/metrics/performance', () => {
    it('should return performance metrics (alias endpoint)', async () => {
      const response = await fetch('http://localhost:3000/api/metrics/performance')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.metrics).toBeDefined()
    })

    it('should return stats', async () => {
      const response = await fetch('http://localhost:3000/api/metrics/performance')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.stats).toBeDefined()
    })

    it('should respect limit parameter', async () => {
      const response = await fetch('http://localhost:3000/api/metrics/performance?limit=10')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.metrics.length).toBeLessThanOrEqual(10)
    })
  })
})
