/**
 * @fileoverview analytics API 集成测试
 * @description 测试 /api/analytics/metrics 和 /api/analytics/export 端点
 */

import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { type TimeSeriesDataPoint } from '@/lib/types/analytics'

import { GET as metricsGET, POST as metricsPOST } from '../metrics/route'
import { GET as exportGET, POST as exportPOST } from '../export/route'

// metrics 路由会查数据库。全局 mock（src/test/vi-mocks.ts）是一套基于表的
// 通用 SQL 引擎，analytics 用的那些表没有种子数据，
// 聚合结果全是空 → timeSeries / byProvider 都是空数组。
// 这里按 SQL 形状给出确定的聚合结果。
vi.mock('@/lib/db/connection', () => {
  const queryRows = vi.fn((sql: string) => {
    if (/GROUP BY provider/i.test(sql)) {
      return [
        { provider: 'anthropic', count: 3, tasks_completed: 5, tokens_used: 1000 },
        { provider: 'openai', count: 2, tasks_completed: 4, tokens_used: 800 },
      ]
    }
    if (/GROUP BY DATE/i.test(sql)) {
      return [
        { date: '2024-01-01', agents: 3, users: 5, tasks: 4, tokens: 100, revenue: 20, errors: 0 },
        { date: '2024-01-02', agents: 4, users: 6, tasks: 5, tokens: 120, revenue: 30, errors: 1 },
      ]
    }
    if (/FROM api_logs/i.test(sql)) {
      return [{ avg_response_time: 250, error_count: 1, total_requests: 100 }]
    }
    // 总条数查询：实现里的 SQL 是
    //   SELECT COUNT(DISTINCT DATE(created_at)) as count FROM ( ... tasks UNION ALL ... revenue )
    // 原来的替身写的是 /COUNT\(\*\) as count/ —— 永远匹配不上（死分支），
    // 于是 countResult[0].count 为 undefined，总数会回退到 totalDays。
    // 这里按真实 SQL 形状匹配。
    if (/COUNT\(DISTINCT DATE\(created_at\)\) as count/i.test(sql)) {
      return [{ count: 42 }]
    }
    return [
      {
        total: 10,
        active: 4,
        active_today: 3,
        new_users: 2,
        idle: 3,
        offline: 3,
        working_hours: 100,
        tasks_completed: 20,
        tokens_used: 5000,
        completed: 5,
        in_progress: 3,
        pending: 2,
        high_priority: 1,
        medium_priority: 2,
        low_priority: 3,
        monthly: 100,
        subscriptions: 50,
        one_time: 30,
        enterprise: 20,
      },
    ]
  })
  const getDatabase = vi.fn(() => ({
    queryRows,
    query: vi.fn(() => []),
    prepare: vi.fn(),
  }))
  return { getDatabase, queryRows, default: { getDatabase } }
})


/**
 * 直接调用路由处理器，不再依赖 localhost:3000 上运行的服务。
 *
 * 原实现用 fetch('http://localhost:3000/...')，
 * CI 的 vitest 并没有起真实服务器 → 全部用例 `TypeError: fetch failed`。
 * 这类"集成测试"应当直接 import 路由的 GET/POST 导出。
 */
function callRoute(
  handler: (req: NextRequest) => Promise<Response>,
  url: string,
  init?: RequestInit
): Promise<Response> {
  return handler(new NextRequest(new Request(url, init)))
}

describe('Analytics API - Metrics', () => {
  const baseUrl = 'http://localhost:3000/api/analytics/metrics'

  it('GET /api/analytics/metrics should return analytics data', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)

    expect(response.status).toBe(200)

    const data = await response.json()

    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('timestamp')
    expect(data.data).toHaveProperty('filters')

    expect(data.data).toHaveProperty('metrics')
    expect(data.data).toHaveProperty('timeSeries')
    // timeSeries / cacheStats / pagination 都是 data 的子节点，不是 metrics 的子节点
    expect(data.data).toHaveProperty('cacheStats')
    expect(data.data).toHaveProperty('pagination')
    expect(data.data.metrics).not.toHaveProperty('timeSeries')
    expect(data.data.metrics).not.toHaveProperty('cacheStats')
  })

  it('should place cacheStats and pagination under data', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    expect(data.data.cacheStats).toHaveProperty('hitRate')
    expect(typeof data.data.cacheStats.hitRate).toBe('number')
    expect(data.data.cacheStats).toHaveProperty('hits')
    expect(data.data.cacheStats).toHaveProperty('misses')

    expect(data.data.pagination).toHaveProperty('page', 1)
    expect(data.data.pagination).toHaveProperty('limit', 100)
    expect(typeof data.data.pagination.total).toBe('number')
    expect(typeof data.data.pagination.totalPages).toBe('number')
    // 总条数来自 COUNT(DISTINCT DATE(created_at)) 查询（替身返回 42）。
    // 若替身的 SQL 形状匹配失效，这里会回退成 totalDays(=7)。
    expect(data.data.pagination.total).toBe(42)
  })

  it('should use responseTime (not response_time) for performance', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    expect(data.data.metrics.performance).toHaveProperty('responseTime')
    expect(typeof data.data.metrics.performance.responseTime).toBe('number')
    expect(data.data.metrics.performance).not.toHaveProperty('response_time')
    expect(data.data.metrics.performance).not.toHaveProperty('avg_response_time')
  })

  it('should return correct metrics structure', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    expect(data.data.metrics).toHaveProperty('agents')
    expect(data.data.metrics).toHaveProperty('users')
    expect(data.data.metrics).toHaveProperty('tasks')
    expect(data.data.metrics).toHaveProperty('revenue')
    expect(data.data.metrics).toHaveProperty('performance')

    expect(data.data.metrics.agents).toHaveProperty('total')
    expect(data.data.metrics.agents).toHaveProperty('active')
    expect(data.data.metrics.agents).toHaveProperty('idle')
    expect(data.data.metrics.agents).toHaveProperty('offline')
    expect(data.data.metrics.agents).toHaveProperty('byProvider')
  })

  it('should expose byProvider entries keyed by provider name', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    const byProvider = data.data.metrics.agents.byProvider
    expect(Object.keys(byProvider)).toEqual(expect.arrayContaining(['anthropic', 'openai']))
    expect(byProvider.anthropic).toHaveProperty('count', 3)
    expect(byProvider.anthropic).toHaveProperty('tasksCompleted', 5)
    expect(byProvider.anthropic).toHaveProperty('tokensUsed', 1000)
  })

  it('should return time series data', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    expect(Array.isArray(data.data.timeSeries)).toBe(true)
    expect(data.data.timeSeries.length).toBeGreaterThan(0)

    expect(data.data.timeSeries[0]).toHaveProperty('timestamp')
    expect(data.data.timeSeries[0]).toHaveProperty('agents')
    expect(data.data.timeSeries[0]).toHaveProperty('users')
    expect(data.data.timeSeries[0]).toHaveProperty('tasks')
  })

  it('should support different time ranges', async () => {
    const timeRanges = ['today', 'week', 'month', 'quarter', 'year']

    for (const range of timeRanges) {
      const response = await callRoute(metricsGET, `${baseUrl}?timeRange=${range}`)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.filters.timeRange).toBe(range)
    }
  })

  it('should handle custom date range', async () => {
    const customRange = JSON.stringify({
      start: '2024-01-01',
      end: '2024-01-31',
    })

    const response = await callRoute(
      metricsGET,
      `${baseUrl}?timeRange=custom&customRange=${encodeURIComponent(customRange)}`
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.filters.customRange).toEqual({
      start: '2024-01-01',
      end: '2024-01-31',
    })
  })

  it('should handle invalid custom range format', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=custom&customRange=invalid-json`)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    // 路由走统一错误契约（createValidationError），错误信息在 error.message
    expect(data.error.message).toBe('Invalid customRange format')
  })

  it('POST /api/analytics/metrics with filters', async () => {
    const response = await callRoute(metricsPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeRange: 'month',
        agentIds: ['agent-1', 'agent-2'],
        taskStatuses: ['completed', 'in-progress'],
        metrics: ['agents', 'users', 'tasks'],
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.filters.timeRange).toBe('month')
    expect(data.data.filters.agentIds).toEqual(['agent-1', 'agent-2'])
  })

  it('should handle invalid POST body', async () => {
    const response = await callRoute(metricsPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('should return 400 for a JSON body that is not an object', async () => {
    for (const rawBody of ['null', '[]', '"text"', '42']) {
      const response = await callRoute(metricsPOST, baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Invalid request body')
    }
  })

  it('should reject invalid pagination parameters', async () => {
    for (const body of [{ page: 0 }, { limit: 0 }, { limit: 1001 }]) {
      const response = await callRoute(metricsPOST, baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
    }
  })

  it('should apply default filters when POST body omits optional fields', async () => {
    const response = await callRoute(metricsPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    // timeRange 缺省为 week
    expect(data.data.filters.timeRange).toBe('week')
    // 分页缺省 page=1 / limit=100
    expect(data.data.pagination.page).toBe(1)
    expect(data.data.pagination.limit).toBe(100)
  })

  it('should include cache headers', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)

    expect(response.headers.get('Cache-Control')).toContain('s-maxage=60')
    expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate=30')
  })
})

// ============================================================================
// Test Suite: Analytics Export API
// ============================================================================

describe('Analytics API - Export', () => {
  const baseUrl = 'http://localhost:3000/api/analytics/export'

  it('GET /api/analytics/export should return export options', async () => {
    const response = await callRoute(exportGET, baseUrl)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.formats).toContain('csv')
    expect(data.data.formats).toContain('xlsx')
    expect(data.data.formats).toContain('json')
  })

  it('POST /api/analytics/export should export CSV', async () => {
    const mockData = [
      { timestamp: '2024-01-01', agents: 10, users: 50 },
      { timestamp: '2024-01-02', agents: 12, users: 55 },
    ]

    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        data: mockData,
        filename: 'test-export',
        includeHeaders: true,
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')

    const content = await response.text()
    expect(content).toContain('timestamp')
    expect(content).toContain('agents')
    expect(content).toContain('users')
    expect(content).toContain('10')
    expect(content).toContain('50')
  })

  it('POST /api/analytics/export should export XLSX', async () => {
    const mockData = [
      { timestamp: '2024-01-01', agents: 10, users: 50 },
      { timestamp: '2024-01-02', agents: 12, users: 55 },
    ]

    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'xlsx',
        data: mockData,
        filename: 'test-export',
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/vnd.openxmlformats')

    const buffer = await response.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('POST /api/analytics/export should export JSON', async () => {
    const mockData = [
      { timestamp: '2024-01-01', agents: 10, users: 50 },
      { timestamp: '2024-01-02', agents: 12, users: 55 },
    ]

    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'json',
        data: mockData,
        filename: 'test-export',
      }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')

    const content = await response.json()
    expect(Array.isArray(content)).toBe(true)
    expect(content).toEqual(mockData)
  })

  it('should handle unsupported export format', async () => {
    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'pdf',
        data: [],
      }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.message).toBe('Unsupported export format')
  })

  it('should reject every format outside csv/xlsx/json', async () => {
    for (const format of ['pdf', 'excel', 'xml', 'CSV', '', 'html']) {
      const response = await callRoute(exportPOST, baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          data: [{ timestamp: '2024-01-01', agents: 1 }],
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Unsupported export format')
    }
  })

  it('should default format to csv when omitted', async () => {
    const mockData = [{ timestamp: '2024-01-01', agents: 1 }]

    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: mockData }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')
    const content = await response.text()
    expect(content).toContain('timestamp')
  })

  it('should return 400 for an export body that is not an object', async () => {
    for (const rawBody of ['null', '[]', '"text"', '42']) {
      const response = await callRoute(exportPOST, baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody,
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Invalid request body')
    }
  })

  it('should return 400 for invalid JSON export body', async () => {
    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('should handle empty data', async () => {
    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        data: [],
      }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.message).toBe('No data to export')
  })

  it('should handle missing data', async () => {
    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
      }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('should include proper Content-Disposition header', async () => {
    const mockData = [{ timestamp: '2024-01-01', agents: 10 }]
    const today = new Date().toISOString().split('T')[0]

    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        data: mockData,
        filename: 'test-export',
      }),
    })

    const disposition = response.headers.get('Content-Disposition')
    expect(disposition).toContain('attachment')
    expect(disposition).toContain('filename=')
  })

  it('should include date range in filename when provided', async () => {
    const mockData = [{ timestamp: '2024-01-01', agents: 10 }]

    const response = await callRoute(exportPOST, baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'csv',
        data: mockData,
        filename: 'test-export',
        dateRange: { start: '2024-01-01', end: '2024-01-31' },
      }),
    })

    const disposition = response.headers.get('Content-Disposition')
    expect(disposition).toContain('2024-01-01')
    expect(disposition).toContain('2024-01-31')
  })
})

// ============================================================================
// Test Suite: Analytics Data Validation
// ============================================================================

describe('Analytics API - Data Validation', () => {
  const baseUrl = 'http://localhost:3000/api/analytics/metrics'

  it('should return valid timestamp format', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    expect(() => new Date(data.timestamp)).not.toThrow()
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('should return numeric values in metrics', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    expect(typeof data.data.metrics.agents.total).toBe('number')
    expect(typeof data.data.metrics.users.total).toBe('number')
    expect(typeof data.data.metrics.revenue.total).toBe('number')
  })

  it('should return arrays for byProvider metrics', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    expect(typeof data.data.metrics.agents.byProvider).toBe('object')
    expect(Object.keys(data.data.metrics.agents.byProvider).length).toBeGreaterThan(0)
  })

  it('should return valid time series data points', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    data.data.timeSeries.forEach((point: TimeSeriesDataPoint) => {
      expect(point).toHaveProperty('timestamp')
      expect(typeof point.agents).toBe('number')
      expect(typeof point.users).toBe('number')
      expect(typeof point.tasks).toBe('number')
    })
  })

  it('should return performance metrics within valid ranges', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=week`)
    const data = await response.json()

    expect(data.data.metrics.performance.cpuUsage).toBeGreaterThanOrEqual(0)
    expect(data.data.metrics.performance.cpuUsage).toBeLessThanOrEqual(100)
    expect(data.data.metrics.performance.memoryUsage).toBeGreaterThanOrEqual(0)
    expect(data.data.metrics.performance.memoryUsage).toBeLessThanOrEqual(100)
    expect(data.data.metrics.performance.uptime).toBeGreaterThanOrEqual(0)
    expect(data.data.metrics.performance.uptime).toBeLessThanOrEqual(100)
  })
})

// ============================================================================
// Test Suite: Analytics Error Handling
// ============================================================================

describe('Analytics API - Error Handling', () => {
  const baseUrl = 'http://localhost:3000/api/analytics/metrics'

  it('should handle server errors gracefully', async () => {
    // Mock a scenario where the server might error
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=invalid`)
    const data = await response.json()

    expect(data).toHaveProperty('success')
  })

  it('should return proper error structure', async () => {
    const response = await callRoute(metricsGET, `${baseUrl}?timeRange=custom&customRange=invalid`)
    const data = await response.json()

    expect(data).toHaveProperty('success', false)
    expect(data).toHaveProperty('error')
    expect(typeof data.error.message).toBe('string')
  })
})
