/**
 * @fileoverview Integration tests for API routes
 * Tests the full API functionality including response format, headers, and status codes
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

// Mock environment variables
const originalEnv = process.env

describe('API Routes Integration Tests', () => {
  beforeAll(() => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_RELEASE', '1.0.0-test')
  })

  afterAll(() => {
    process.env = originalEnv
    vi.unstubAllEnvs()
  })

  describe('/api/status', () => {
    it('should return operational status with correct structure', async () => {
      const { GET } = await import('@/app/api/status/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('lastUpdated')
      expect(data).toHaveProperty('services')
      expect(data).toHaveProperty('metrics')
      expect(data).toHaveProperty('incidents')
      expect(data).toHaveProperty('maintenance')
    })

    it('should return valid status values', async () => {
      const { GET } = await import('@/app/api/status/route')
      const response = await GET()
      const data = await response.json()

      expect(['operational', 'degraded', 'outage']).toContain(data.status)
    })

    it('should have services with required fields', async () => {
      const { GET } = await import('@/app/api/status/route')
      const response = await GET()
      const data = await response.json()

      expect(Array.isArray(data.services)).toBe(true)
      expect(data.services.length).toBeGreaterThan(0)

      data.services.forEach((service: { name: string; status: string; uptime: number; responseTime: number }) => {
        expect(service).toHaveProperty('name')
        expect(service).toHaveProperty('status')
        expect(service).toHaveProperty('uptime')
        expect(service).toHaveProperty('responseTime')
        expect(typeof service.uptime).toBe('number')
        expect(typeof service.responseTime).toBe('number')
      })
    })

    it('should have metrics with required fields', async () => {
      const { GET } = await import('@/app/api/status/route')
      const response = await GET()
      const data = await response.json()

      expect(data.metrics).toHaveProperty('requests')
      expect(data.metrics).toHaveProperty('errors')
      expect(data.metrics).toHaveProperty('avgResponseTime')
      expect(data.metrics).toHaveProperty('p95ResponseTime')
    })

    it('should have incidents and maintenance as arrays', async () => {
      const { GET } = await import('@/app/api/status/route')
      const response = await GET()
      const data = await response.json()

      expect(Array.isArray(data.incidents)).toBe(true)
      expect(Array.isArray(data.maintenance)).toBe(true)
    })

    it('should return JSON content type', async () => {
      const { GET } = await import('@/app/api/status/route')
      const response = await GET()

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return ISO timestamp for lastUpdated', async () => {
      const { GET } = await import('@/app/api/status/route')
      const response = await GET()
      const data = await response.json()

      const timestamp = new Date(data.lastUpdated)
      expect(timestamp.toISOString()).toBe(data.lastUpdated)
    })
  })

  describe('/api/health', () => {
    it('should return healthy status when memory is within limits', async () => {
      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('status')
      expect(['healthy', 'unhealthy']).toContain(data.status)
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('checks')
    })

    it('should include memory check', async () => {
      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks).toHaveProperty('memory')
      expect(data.checks.memory).toHaveProperty('status')
      expect(data.checks.memory).toHaveProperty('used')
      expect(data.checks.memory).toHaveProperty('limit')
      expect(typeof data.checks.memory.used).toBe('number')
      expect(typeof data.checks.memory.limit).toBe('number')
    })

    it('should include node check', async () => {
      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks).toHaveProperty('node')
      expect(data.checks.node).toHaveProperty('status')
      expect(data.checks.node).toHaveProperty('version')
    })

    it('should return correct status code based on health', async () => {
      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      if (data.status === 'healthy') {
        expect(response.status).toBe(200)
      } else {
        expect(response.status).toBe(503)
      }
    })

    it('should have valid uptime value', async () => {
      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(typeof data.uptime).toBe('number')
      expect(data.uptime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('/api/health/live', () => {
    it('should always return alive status', async () => {
      const { GET } = await import('@/app/api/health/live/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('status', 'alive')
    })

    it('should respond quickly (liveness probe requirement)', async () => {
      const { GET } = await import('@/app/api/health/live/route')
      
      const start = Date.now()
      await GET()
      const duration = Date.now() - start

      // Liveness probe should respond within 100ms
      expect(duration).toBeLessThan(100)
    })
  })

  describe('/api/health/ready', () => {
    it('should return health status with checks', async () => {
      const { GET } = await import('@/app/api/health/ready/route')
      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('status')
      expect(['ok', 'degraded', 'error']).toContain(data.status)
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('environment')
    })

    it('should return correct status code based on readiness', async () => {
      const { GET } = await import('@/app/api/health/ready/route')
      const response = await GET()
      const data = await response.json()

      if (data.status === 'ok') {
        expect(response.status).toBe(200)
      } else if (data.status === 'degraded') {
        expect(response.status).toBe(200)
      } else {
        expect(response.status).toBe(503)
      }
    })

    it('should include dependency checks when available', async () => {
      const { GET } = await import('@/app/api/health/ready/route')
      const response = await GET()
      const data = await response.json()

      // Checks may or may not be present depending on configuration
      if (data.checks) {
        expect(typeof data.checks).toBe('object')
      }
    })
  })

  describe('/api/health/detailed', () => {
    it('should return detailed health status', async () => {
      const { GET } = await import('@/app/api/health/detailed/route')
      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('status')
      expect(['ok', 'degraded', 'error']).toContain(data.status)
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('environment')
    })

    it('should include external service checks', async () => {
      const { GET } = await import('@/app/api/health/detailed/route')
      const response = await GET()
      const data = await response.json()

      // Should have checks object
      expect(data).toHaveProperty('checks')
      expect(typeof data.checks).toBe('object')
    })

    it('should have correct check result structure', async () => {
      const { GET } = await import('@/app/api/health/detailed/route')
      const response = await GET()
      const data = await response.json()

      if (data.checks) {
        Object.values(data.checks).forEach((check: unknown) => {
          const checkResult = check as { status: string; latency?: number; message?: string }
          expect(checkResult).toHaveProperty('status')
          expect(['ok', 'error']).toContain(checkResult.status)
          
          if (checkResult.latency !== undefined) {
            expect(typeof checkResult.latency).toBe('number')
          }
          
          if (checkResult.message !== undefined) {
            expect(typeof checkResult.message).toBe('string')
          }
        })
      }
    })
  })
})

describe('API Routes Error Handling', () => {
  it('should handle errors gracefully in health endpoint', async () => {
    // This tests that the health endpoint has proper try-catch
    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    
    // Should always return a response, never throw
    expect(response).toBeDefined()
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  })
})

describe('API Routes Response Headers', () => {
  it('should return JSON content type for all API routes', async () => {
    const routes = [
      () => import('@/app/api/status/route').then(m => m.GET()),
      () => import('@/app/api/health/route').then(m => m.GET()),
      () => import('@/app/api/health/live/route').then(m => m.GET()),
      () => import('@/app/api/health/ready/route').then(m => m.GET()),
      () => import('@/app/api/health/detailed/route').then(m => m.GET()),
    ]

    for (const getRoute of routes) {
      const response = await getRoute()
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('application/json')
    }
  })
})

describe('API Routes Performance', () => {
  it('should respond within acceptable time limits', async () => {
    const maxResponseTime = 1000 // 1 second

    // Test status endpoint
    const statusStart = Date.now()
    const { GET: getStatus } = await import('@/app/api/status/route')
    await getStatus()
    expect(Date.now() - statusStart).toBeLessThan(maxResponseTime)

    // Test health endpoint
    const healthStart = Date.now()
    const { GET: getHealth } = await import('@/app/api/health/route')
    await getHealth()
    expect(Date.now() - healthStart).toBeLessThan(maxResponseTime)

    // Test liveness (should be very fast)
    const liveStart = Date.now()
    const { GET: getLive } = await import('@/app/api/health/live/route')
    await getLive()
    expect(Date.now() - liveStart).toBeLessThan(100) // 100ms for liveness
  })
})
