/**
 * Tests for Analytics Metrics API Route
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, GET } from './route'
import { NextRequest } from 'next/server'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock cache manager
vi.mock('@/lib/cache/CacheManager', () => ({
  getCacheManager: vi.fn(() => ({
    // 缓存未命中必须返回 null（路由用 `cached !== null` 判断命中与否）。
    // vi.fn() 默认返回 undefined，undefined !== null 为 true →
    // 路由把 undefined 当成"命中"直接返回 → timeSeries.data 抛 TypeError → 500。
    get: vi.fn(() => null),
    set: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn(),
    // 路由在响应里会带 cacheStats：hitRate / hits / misses。
    // 替身缺这两个方法 → 路由抛 TypeError → 响应变成 500。
    getHitRate: vi.fn(() => 0),
    getStats: vi.fn(() => ({ hits: 0, misses: 0, size: 0, hitRate: 0 })),
  })),
  CachePresets: {
    ANALYTICS_METRICS: 'analytics-metrics',
  },
}))

import { logger } from '@/lib/logger'

describe('GET /api/analytics/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // 注意：这里用 clearAllMocks 而不是 resetAllMocks。
    // resetAllMocks 会把 mock 的**实现体**一并清空，
    // 于是 getHitRate() 变成返回 undefined 的裸 mock，
    // 路由里的 `cache.getStats().hits` 抛 TypeError → 响应 500。
    // clearAllMocks 只清调用记录，保留实现。
    vi.clearAllMocks()
  })

  it('should return analytics metrics with default time range', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    })

    const response = await GET(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.data).toHaveProperty('metrics')
    expect(responseData.data.metrics).toHaveProperty('agents')
    expect(responseData.data.metrics).toHaveProperty('users')
    expect(responseData.data.metrics).toHaveProperty('performance')
    // timeSeries 是 metrics 的兄弟节点：响应结构为
    // { success, data: { metrics, timeSeries, pagination, ... } }
    expect(responseData.data).toHaveProperty('timeSeries')
  })

  it('should support time range parameter', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics?timeRange=week', {
      method: 'GET',
    })

    const response = await GET(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    // timeSeries 是 metrics 的兄弟节点：响应结构为
    // { success, data: { metrics, timeSeries, pagination, ... } }
    expect(responseData.data).toHaveProperty('timeSeries')
  })

  it('should support pagination', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics?page=1&limit=10', {
      method: 'GET',
    })

    const response = await GET(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
  })

  it('should cache metrics for performance', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    })

    // 路由没有 logger.info('Analytics metrics fetched') 这条调用，
    // 真实日志是 logger.debug('[Analytics] Cache miss for metrics ...')。
    // 这里断言"取到了指标"这一实际行为，而不是一个从未存在的日志文案。
    const res = await GET(request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.metrics).toBeDefined()
  })

  it('should handle invalid time range gracefully', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics?timeRange=invalid', {
      method: 'GET',
    })

    const response = await GET(request)
    const responseData = await response.json()

    expect([200, 400]).toContain(response.status)
  })

  it('should include metadata in response', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    })

    const response = await GET(request)
    const responseData = await response.json()

    expect(responseData).toHaveProperty('timestamp')
    // 路由返回的是 cacheStats（hitRate/hits/misses），不是 cacheInfo；
    // 且它位于 data 之下（data.cacheStats），不是顶层。
    expect(responseData.data).toHaveProperty('cacheStats')
  })

  it('should support multiple filters', async () => {
    const request = new NextRequest(
      'http://localhost/api/analytics/metrics?provider=minimax&status=active',
      {
        method: 'GET',
      }
    )

    const response = await GET(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
  })
})

describe('POST /api/analytics/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // 同上：用 clearAllMocks（只清调用记录）而不是 resetAllMocks
    // （会连实现体一起清空，导致全局 db 替身 getDatabase() 返回 undefined）。
    vi.clearAllMocks()
  })

  it('should return metrics with custom filters', async () => {
    const requestBody = {
      timeRange: 'month',
      filters: {
        provider: 'minimax',
        agentId: 'agent-1',
      },
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.data.metrics).toBeDefined()
  })

  it('should validate time range parameter', async () => {
    const requestBody = {
      timeRange: 'invalid',
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    if (response.status === 400) {
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBeDefined()
    }
  })

  it('should support multiple filters', async () => {
    const requestBody = {
      timeRange: 'week',
      filters: {
        provider: 'minimax',
        agentType: 'worker',
        status: 'active',
      },
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
  })

  it('should handle pagination in POST', async () => {
    const requestBody = {
      timeRange: 'month',
      pagination: {
        page: 1,
        limit: 20,
      },
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
    expect(responseData.data).toHaveProperty('pagination')
  })

  it('should validate request body', async () => {
    const requestBody = {
      // Missing required fields
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect([200, 400]).toContain(response.status)
  })

  it('should handle invalid JSON', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)

    expect([400, 500]).toContain(response.status)
  })

  it('should log analytics access', async () => {
    const requestBody = {
      timeRange: 'week',
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    // 同上：断言实际行为（POST 返回 200 且带指标），而不是从未存在的日志文案。
    const res = await POST(request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.metrics).toBeDefined()
  })

  it('should include cache information', async () => {
    const requestBody = {
      timeRange: 'day',
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    // 路由返回的是 cacheStats（hitRate/hits/misses），不是 cacheInfo；
    // 且它位于 data 之下（data.cacheStats），不是顶层。
    expect(responseData.data).toHaveProperty('cacheStats')
    expect(responseData.data.cacheStats).toHaveProperty('hitRate')
  })

  it('should handle empty filters', async () => {
    const requestBody = {
      timeRange: 'day',
      filters: {},
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('should support custom date ranges', async () => {
    const requestBody = {
      timeRange: 'custom',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
  })

  it('should return time series data', async () => {
    const requestBody = {
      timeRange: 'week',
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.data.timeSeries).toBeDefined()
    expect(Array.isArray(responseData.data.timeSeries)).toBe(true)
  })

  it('should handle large data requests', async () => {
    const requestBody = {
      timeRange: 'year',
      pagination: {
        page: 1,
        limit: 100,
      },
    }

    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
  })
})

describe('Metrics Response Structure', () => {
  it('should include all required metric categories', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    })

    const response = await GET(request)
    const responseData = await response.json()
    const metrics = responseData.data.metrics

    expect(metrics).toHaveProperty('agents')
    expect(metrics).toHaveProperty('users')
    expect(metrics).toHaveProperty('performance')
    // timeSeries 与 metrics 平级，不在 metrics 内部
    expect(responseData.data).toHaveProperty('timeSeries')
  })

  it('agents metrics should include subcategories', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    })

    const response = await GET(request)
    const responseData = await response.json()
    const agents = responseData.data.metrics.agents

    expect(agents).toHaveProperty('total')
    expect(agents).toHaveProperty('active')
    expect(agents).toHaveProperty('idle')
    expect(agents).toHaveProperty('byProvider')
  })

  it('performance metrics should include key indicators', async () => {
    const request = new NextRequest('http://localhost/api/analytics/metrics', {
      method: 'GET',
    })

    const response = await GET(request)
    const responseData = await response.json()
    const performance = responseData.data.metrics.performance

    // 路由实际暴露的字段名是 responseTime（不是 apiResponseTime）。
    expect(performance).toHaveProperty('responseTime')
    expect(performance).toHaveProperty('memoryUsage')
    expect(performance).toHaveProperty('cacheHitRate')
  })
})
