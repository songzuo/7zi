/**
 * Tests for SSE Health Stream API
 * /api/stream/health/route.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/monitoring/performance.monitor', () => ({
  performanceCollector: {
    getMetrics: vi.fn(),
  },
}))

vi.mock('@/lib/monitoring/health', () => ({
  detailedHealthCheck: vi.fn(),
}))

vi.mock('@/lib/sse/stream', () => ({
  getGlobalStreamManager: vi.fn(() => ({
    addClient: vi.fn(),
    removeClient: vi.fn(),
  })),
}))

vi.mock('@/lib/sse/utils', () => ({
  getSSEHeaders: vi.fn(() => ({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })),
  isValidSSEConnection: vi.fn(),
}))

vi.mock('@/lib/api/error-handler', () => ({
  createValidationError: vi.fn(msg => ({
    status: 400,
    json: async () => ({ success: false, error: msg }),
  })),
  createServiceUnavailableError: vi.fn(msg => ({
    status: 503,
    json: async () => ({ success: false, error: msg }),
  })),
  ErrorType: {
    VALIDATION: 'VALIDATION',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    INTERNAL: 'INTERNAL',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('SSE Health Stream API', () => {
  beforeEach(() => {
    // Mock global ReadableStream for Node.js environment
    if (typeof ReadableStream === 'undefined') {
      global.ReadableStream = require('stream/web').ReadableStream
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/stream/health', () => {
    it('should reject non-SSE requests', async () => {
      const { isValidSSEConnection } = await import('@/lib/sse/utils')
      vi.mocked(isValidSSEConnection).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/stream/health', {
        headers: {
          Accept: 'application/json',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('should accept valid SSE requests', async () => {
      const { isValidSSEConnection } = await import('@/lib/sse/utils')
      vi.mocked(isValidSSEConnection).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/stream/health', {
        headers: {
          Accept: 'text/event-stream',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/event-stream')
      expect(response.headers.get('X-Client-ID')).toBeDefined()
    })

    it('should include client ID in response headers', async () => {
      const { isValidSSEConnection } = await import('@/lib/sse/utils')
      vi.mocked(isValidSSEConnection).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/stream/health', {
        headers: {
          Accept: 'text/event-stream',
        },
      })

      const response = await GET(request)

      const clientId = response.headers.get('X-Client-ID')
      expect(clientId).toBeDefined()
      expect(clientId).toMatch(/^[0-9a-f-]+$/) // UUID format
    })

    it('should handle stream manager unavailability', async () => {
      const { isValidSSEConnection } = await import('@/lib/sse/utils')
      vi.mocked(isValidSSEConnection).mockReturnValue(true)

      const { getGlobalStreamManager } = await import('@/lib/sse/stream')
      vi.mocked(getGlobalStreamManager).mockImplementation(() => {
        throw new Error('Stream manager not available')
      })

      const request = new NextRequest('http://localhost:3000/api/stream/health', {
        headers: {
          Accept: 'text/event-stream',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(503)
    })

    it('should set proper SSE headers', async () => {
      const { isValidSSEConnection } = await import('@/lib/sse/utils')
      vi.mocked(isValidSSEConnection).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/stream/health', {
        headers: {
          Accept: 'text/event-stream',
        },
      })

      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })
  })

  describe('SSE Stream Data Format', () => {
    it('should return a ReadableStream', async () => {
      const { isValidSSEConnection } = await import('@/lib/sse/utils')
      vi.mocked(isValidSSEConnection).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/stream/health', {
        headers: {
          Accept: 'text/event-stream',
        },
      })

      const response = await GET(request)

      expect(response.body).toBeInstanceOf(ReadableStream)
    })
  })
})
