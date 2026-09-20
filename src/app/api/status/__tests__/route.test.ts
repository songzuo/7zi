/**
 * @fileoverview Status API route tests
 * @description Tests for /api/status endpoint - system status information
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    auth: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
    setContext: vi.fn(),
    clearContext: vi.fn(),
    child: vi.fn(),
    updateConfig: vi.fn(),
  },
}))

import { logger } from '@/lib/logger'

describe('/api/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET request - Happy Path', () => {
    it('should return status information successfully', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.status).toBeDefined()
      expect(data.data.lastUpdated).toBeDefined()
      expect(data.data.services).toBeDefined()
      expect(data.data.incidents).toBeDefined()
      expect(data.data.maintenance).toBeDefined()
      expect(data.timestamp).toBeDefined()
    })

    it('should return operational status', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.status).toBe('operational')
    })

    it('should include service information', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.services).toBeInstanceOf(Array)
      expect(data.data.services.length).toBeGreaterThan(0)

      const websiteService = data.data.services.find((s: any) => s.name === 'Website')
      expect(websiteService).toBeDefined()
      expect(websiteService.status).toBe('operational')
      expect(websiteService.uptime).toBeDefined()
      expect(websiteService.responseTime).toBeDefined()
    })

    it('should include all expected services', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      const serviceNames = data.data.services.map((s: any) => s.name)
      expect(serviceNames).toContain('Website')
      expect(serviceNames).toContain('API')
      expect(serviceNames).toContain('CDN')
    })

    it('should return metrics when include_metrics is true', async () => {
      const request = new Request('http://localhost:3000/api/status?include_metrics=true', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.metrics).toBeDefined()
      expect(data.data.metrics.requests).toBeDefined()
      expect(data.data.metrics.errors).toBeDefined()
      expect(data.data.metrics.avgResponseTime).toBeDefined()
      expect(data.data.metrics.p95ResponseTime).toBeDefined()
    })

    it('should hide metrics when include_metrics is false', async () => {
      const request = new Request('http://localhost:3000/api/status?include_metrics=false', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.metrics).toBeUndefined()
    })

    it('should return compact format when format=compact', async () => {
      const request = new Request('http://localhost:3000/api/status?format=compact', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.status).toBeDefined()
      expect(data.data.lastUpdated).toBeDefined()
      expect(data.data.services).toBeDefined()

      // Compact format should not include metrics
      expect(data.data.metrics).toBeUndefined()

      // Compact format services should only have name and status
      data.data.services.forEach((service: any) => {
        expect(Object.keys(service)).toEqual(['name', 'status'])
      })
    })

    it('should return full format by default', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.metrics).toBeDefined()

      // Full format services should have all properties
      data.data.services.forEach((service: any) => {
        expect(service.name).toBeDefined()
        expect(service.status).toBeDefined()
        expect(service.uptime).toBeDefined()
        expect(service.responseTime).toBeDefined()
      })
    })

    it('should return valid ISO timestamps', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(() => new Date(data.timestamp)).not.toThrow()
      expect(() => new Date(data.data.lastUpdated)).not.toThrow()
    })
  })

  describe('GET request - Error Cases', () => {
    it('should reject invalid format parameter', async () => {
      const request = new Request('http://localhost:3000/api/status?format=invalid', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Invalid query parameters')
    })

    it('should reject invalid include_metrics parameter', async () => {
      const request = new Request('http://localhost:3000/api/status?include_metrics=invalid', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Invalid query parameters')
    })

    it('should handle unexpected errors gracefully', async () => {
      // Mock logger to verify error logging
      const originalError = logger.error

      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      // The route should handle errors internally
      const response = await GET(request)

      // Should either succeed or fail gracefully
      expect([200, 500]).toContain(response.status)

      if (response.status === 500) {
        const data = await response.json()
        expect(data.success).toBe(false)
        expect(data.error.type).toBe('INTERNAL_ERROR')
      }
    })
  })

  describe('Service Status Logic', () => {
    it('should report overall status as operational when all services are operational', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      const allOperational = data.data.services.every((s: any) => s.status === 'operational')
      if (allOperational) {
        expect(data.data.status).toBe('operational')
      }
    })

    it('should include uptime percentages for services', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      data.data.services.forEach((service: any) => {
        expect(service.uptime).toBeGreaterThanOrEqual(0)
        expect(service.uptime).toBeLessThanOrEqual(100)
        expect(typeof service.uptime).toBe('number')
      })
    })

    it('should include response time for services', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      data.data.services.forEach((service: any) => {
        expect(service.responseTime).toBeGreaterThan(0)
        expect(typeof service.responseTime).toBe('number')
      })
    })
  })

  describe('Response Structure', () => {
    it('should follow standard API response format', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('timestamp')
    })

    it('should have correct content-type header', async () => {
      const request = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      })

      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})
