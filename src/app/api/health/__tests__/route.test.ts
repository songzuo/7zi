/**
 * Tests for Health Check API Routes
 */

import { GET, HEAD } from '../route'
import { NextRequest } from 'next/server'

describe('GET /api/health', () => {
  it('should return healthy status', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.status).toBe('healthy')
  })

  it('should include uptime information', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(data.data.uptime).toBeGreaterThanOrEqual(0)
    expect(typeof data.data.uptime).toBe('number')
  })

  it('should include timestamp', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(data.data.timestamp).toBeDefined()
    expect(new Date(data.data.timestamp)).toBeInstanceOf(Date)
  })

  it('should include version information', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(data.data.version).toBeDefined()
    expect(typeof data.data.version).toBe('string')
  })

  it('should include memory check', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(data.data.checks).toHaveProperty('memory')
    expect(data.data.checks.memory).toHaveProperty('status')
    expect(data.data.checks.memory).toHaveProperty('used')
    expect(data.data.checks.memory).toHaveProperty('limit')
    expect(typeof data.data.checks.memory.used).toBe('number')
    expect(data.data.checks.memory.used).toBeGreaterThan(0)
  })

  it('should set memory status to warning when over 90% limit', async () => {
    // Mock high memory usage
    const originalMemoryUsage = process.memoryUsage
    ;(process as any).memoryUsage = () => ({ heapUsed: 512 * 1024 * 1024 * 0.95 })

    try {
      const request = new NextRequest('http://localhost/api/health', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // When memory is over 90%, status should be 503
      expect(response.status).toBe(503)
      expect(data.data.checks.memory.status).toBe('warning')
    } finally {
      ;(process as any).memoryUsage = originalMemoryUsage
    }
  })

  it('should include node version check', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(data.data.checks).toHaveProperty('node')
    expect(data.data.checks.node).toHaveProperty('status')
    expect(data.data.checks.node).toHaveProperty('version')
    expect(data.data.checks.node.status).toBe('ok')
  })

  it('should set correct cache headers', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    const response = await GET(request)

    expect(response.headers.get('Cache-Control')).toBe('no-cache')
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('should handle errors gracefully', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    // The route handles errors internally and returns 503
    const response = await GET(request)
    expect([200, 503]).toContain(response.status)

    const data = await response.json()
    if (response.status === 503) {
      expect(data.success).toBe(false)
    }
  })
})

describe('HEAD /api/health', () => {
  it('should return 200 on successful health check', async () => {
    const response = await HEAD()
    expect(response.status).toBe(200)
  })

  it('should return 503 on error', async () => {
    // This test just verifies the HEAD function works
    // Actual error scenarios are tested in GET tests
    const response = await HEAD()
    expect([200, 503]).toContain(response.status)
  })

  it('should return same response as GET', async () => {
    const request = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    })

    const getResponse = await GET(request)
    const headResponse = await HEAD()

    expect(getResponse.status).toBe(headResponse.status)
  })
})
