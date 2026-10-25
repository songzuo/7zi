/**
 * Analytics Metrics API - error-path tests (additional coverage)
 *
 * The existing route.test.ts covers the happy paths. This file covers the
 * error branches that were previously uncovered:
 *   - GET: database failure -> 500 (unhandled fetch error)
 *   - GET: invalid customRange JSON -> 400
 *   - GET: invalid pagination -> 400
 *   - POST: database failure -> 500
 *   - POST: invalid pagination -> 400
 *   - POST: non-object JSON body -> 400
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockQueryRows, mockCacheGet, mockCacheSet } = vi.hoisted(() => ({
  mockQueryRows: vi.fn(),
  mockCacheGet: vi.fn(),
  mockCacheSet: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { auth: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/db/connection', () => ({
  getDatabase: () => ({
    queryRows: (...args: unknown[]) => mockQueryRows(...args),
  }),
}))

// The route grabs the cache manager instance at module import time
// (`const cache = getCacheManager()`), so the factory must hand back a ready
// singleton instead of a mock whose return value is configured later.
vi.mock('@/lib/cache/CacheManager', () => ({
  getCacheManager: () => ({
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
    invalidate: vi.fn(),
    clear: vi.fn(),
    getHitRate: vi.fn(() => 0),
    getStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0, hitRate: 0 })),
  }),
  CachePresets: {
    ANALYTICS_METRICS: 'analytics-metrics',
  },
}))

import { GET, POST } from './route'

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' })
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/analytics/metrics', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('Analytics metrics - error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset (not just clear) so a previous test's throwing implementation is
    // dropped before the empty-result default is installed.
    mockQueryRows.mockReset()
    // Empty result set -> happy path works.
    mockQueryRows.mockReturnValue([])
    mockCacheGet.mockReset()
    mockCacheGet.mockReturnValue(null)
    mockCacheSet.mockReset()
    mockCacheSet.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('GET returns 500 when the database query fails', async () => {
    mockQueryRows.mockImplementation(() => {
      throw new Error('database is down')
    })

    const response = await GET(createGetRequest('/api/analytics/metrics'))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })

  it('GET returns 400 when customRange is not valid JSON', async () => {
    const response = await GET(
      createGetRequest('/api/analytics/metrics?customRange=not-json')
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    // The database must not be touched for an invalid query param.
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('GET returns 400 for an out-of-range page number', async () => {
    const response = await GET(createGetRequest('/api/analytics/metrics?page=0'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('GET returns 400 when the limit exceeds the maximum', async () => {
    const response = await GET(createGetRequest('/api/analytics/metrics?limit=1001'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('GET returns 400 when the limit is not a positive number', async () => {
    const response = await GET(createGetRequest('/api/analytics/metrics?limit=0'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('POST returns 500 when the database query fails', async () => {
    mockQueryRows.mockImplementation(() => {
      throw new Error('database is down')
    })

    const response = await POST(createPostRequest({ timeRange: 'week' }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })

  it('POST returns 400 when the page is below 1', async () => {
    const response = await POST(createPostRequest({ page: 0 }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('POST returns 400 when the limit exceeds the maximum', async () => {
    const response = await POST(createPostRequest({ limit: 1001 }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('POST returns 400 when the body is a JSON array', async () => {
    const response = await POST(createPostRequest([]))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('POST returns 400 when the body is JSON null', async () => {
    const response = await POST(createPostRequest('null'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('POST returns 400 when the body is malformed JSON', async () => {
    const response = await POST(createPostRequest('{not-json'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('POST accepts a valid body and returns the metrics envelope', async () => {
    const response = await POST(
      createPostRequest({ page: 1, limit: 10, timeRange: 'month', agentIds: ['agent_1'] })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('metrics')
    expect(body.data.filters.timeRange).toBe('month')
    expect(body.data.filters.agentIds).toEqual(['agent_1'])
  })
})
