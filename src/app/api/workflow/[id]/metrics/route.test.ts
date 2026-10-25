/**
 * Workflow Metrics API Route Tests
 *
 * Covers:
 * - GET /api/workflow/[id]/metrics
 *   - execution-scoped metrics
 *   - workflow-level metrics (+ date range forwarding)
 *   - optional trend / bottlenecks blocks
 *   - error branch (monitoring throws) -> 500
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetMetrics, mockGetWorkflowMetrics, mockGetPerformanceTrend, mockGetBottleneckNodes } =
  vi.hoisted(() => ({
    mockGetMetrics: vi.fn(),
    mockGetWorkflowMetrics: vi.fn(),
    mockGetPerformanceTrend: vi.fn(),
    mockGetBottleneckNodes: vi.fn(),
  }))

vi.mock('@/lib/workflow/monitoring', () => ({
  workflowMonitoring: {
    getMetrics: (...args: unknown[]) => mockGetMetrics(...args),
    getWorkflowMetrics: (...args: unknown[]) => mockGetWorkflowMetrics(...args),
    getPerformanceTrend: (...args: unknown[]) => mockGetPerformanceTrend(...args),
    getBottleneckNodes: (...args: unknown[]) => mockGetBottleneckNodes(...args),
  },
}))

import { GET } from './route'

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' })
}

describe('GET /api/workflow/[id]/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetMetrics.mockReturnValue({
      executionId: 'exec_1',
      totalDuration: 1200,
      successRate: 100,
      nodeMetrics: [],
    })
    mockGetWorkflowMetrics.mockReturnValue({
      avgDuration: 1200,
      avgSuccessRate: 100,
      avgThroughput: 4,
      totalExecutions: 4,
      totalCost: 0,
      totalTokensUsed: 100,
      nodeMetrics: [],
    })
    mockGetPerformanceTrend.mockReturnValue([
      { date: '2026-01-01', executions: 2, avgDuration: 1000, successRate: 100 },
    ])
    mockGetBottleneckNodes.mockReturnValue([
      { nodeId: 'node_1', avgDuration: 900, successRate: 90, failureCount: 1, totalExecutions: 10 },
    ])
  })

  it('returns only workflow metrics when no optional query params are given', async () => {
    const response = await GET(createRequest('/api/workflow/wf_1/metrics'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.workflowMetrics).toBeDefined()
    expect(body.workflowMetrics.totalExecutions).toBe(4)
    // No executionId / trend / bottlenecks requested -> those keys must be absent.
    expect(body).not.toHaveProperty('metrics')
    expect(body).not.toHaveProperty('trend')
    expect(body).not.toHaveProperty('bottlenecks')

    expect(mockGetWorkflowMetrics).toHaveBeenCalledWith('wf_1', {
      startDate: undefined,
      endDate: undefined,
    })
    expect(mockGetMetrics).not.toHaveBeenCalled()
    expect(mockGetPerformanceTrend).not.toHaveBeenCalled()
    expect(mockGetBottleneckNodes).not.toHaveBeenCalled()
  })

  it('includes execution metrics when executionId is provided', async () => {
    const response = await GET(createRequest('/api/workflow/wf_1/metrics?executionId=exec_1'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.metrics).toBeDefined()
    expect(body.metrics.executionId).toBe('exec_1')
    expect(mockGetMetrics).toHaveBeenCalledWith('wf_1', 'exec_1')
  })

  it('forwards startDate and endDate to the workflow metrics query', async () => {
    await GET(
      createRequest('/api/workflow/wf_1/metrics?startDate=2026-01-01&endDate=2026-01-31'),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(mockGetWorkflowMetrics).toHaveBeenCalledWith('wf_1', {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    })
  })

  it('includes the performance trend when includeTrend=true', async () => {
    const response = await GET(createRequest('/api/workflow/wf_1/metrics?includeTrend=true'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(Array.isArray(body.trend)).toBe(true)
    expect(body.trend).toHaveLength(1)
    // Default trend window is 7 days.
    expect(mockGetPerformanceTrend).toHaveBeenCalledWith('wf_1', 7)
  })

  it('uses a custom trendDays window when provided', async () => {
    await GET(createRequest('/api/workflow/wf_1/metrics?includeTrend=true&trendDays=30'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockGetPerformanceTrend).toHaveBeenCalledWith('wf_1', 30)
  })

  it('includes bottleneck nodes when includeBottlenecks=true', async () => {
    const response = await GET(createRequest('/api/workflow/wf_1/metrics?includeBottlenecks=true'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(Array.isArray(body.bottlenecks)).toBe(true)
    expect(body.bottlenecks[0].nodeId).toBe('node_1')
    // Default bottleneck limit is 5.
    expect(mockGetBottleneckNodes).toHaveBeenCalledWith('wf_1', 5)
  })

  it('uses a custom bottleneckLimit when provided', async () => {
    await GET(createRequest('/api/workflow/wf_1/metrics?includeBottlenecks=true&bottleneckLimit=2'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockGetBottleneckNodes).toHaveBeenCalledWith('wf_1', 2)
  })

  it('returns all blocks together when every optional query param is provided', async () => {
    const response = await GET(
      createRequest(
        '/api/workflow/wf_1/metrics?executionId=exec_1&includeTrend=true&includeBottlenecks=true'
      ),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body).toHaveProperty('metrics')
    expect(body).toHaveProperty('workflowMetrics')
    expect(body).toHaveProperty('trend')
    expect(body).toHaveProperty('bottlenecks')
  })

  it('returns 500 when the monitoring layer throws', async () => {
    mockGetWorkflowMetrics.mockImplementation(() => {
      throw new Error('monitoring unavailable')
    })

    const response = await GET(createRequest('/api/workflow/wf_1/metrics'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch workflow metrics')
  })
})
