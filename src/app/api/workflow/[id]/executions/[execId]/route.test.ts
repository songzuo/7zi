/**
 * Workflow Execution Detail API Tests
 *
 * Covers:
 * - GET /api/workflow/[id]/executions/[execId]
 *   正常路径 / 执行不存在 404 / 工作流不匹配 400
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockMonitoring } = vi.hoisted(() => ({
  mockMonitoring: {
    getExecutionDetails: vi.fn(),
  },
}))

vi.mock('@/lib/workflow/monitoring', () => ({
  workflowMonitoring: mockMonitoring,
}))

import { GET } from './route'

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' } as any)
}

const execution = {
  id: 'exec_1',
  workflowId: 'wf_1',
  workflowName: '示例工作流',
  workflowVersion: 1,
  status: 'running',
  startTime: '2026-01-01T00:00:00.000Z',
  nodeCount: 2,
  completedNodes: 1,
  failedNodes: 0,
  skippedNodes: 0,
  triggeredBy: 'user_1',
  triggerType: 'manual',
}

const nodeExecution = {
  executionId: 'exec_1',
  nodeId: 'node_1',
  status: 'success',
  startTime: '2026-01-01T00:00:00.000Z',
  endTime: '2026-01-01T00:00:01.000Z',
  duration: 1000,
}

const metrics = {
  workflowId: 'wf_1',
  executionId: 'exec_1',
  totalDuration: 1000,
  averageNodeDuration: 1000,
  nodeCount: 2,
}

const alert = {
  id: 'alert_1',
  executionId: 'exec_1',
  level: 'warning',
  message: '节点耗时偏长',
  createdAt: '2026-01-01T00:00:01.000Z',
}

describe('GET /api/workflow/[id]/executions/[execId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return execution details with nodes, metrics and alerts', async () => {
    mockMonitoring.getExecutionDetails.mockReturnValue({
      execution,
      nodes: [nodeExecution],
      metrics,
      alerts: [alert],
    })

    const request = createRequest('/api/workflow/wf_1/executions/exec_1')

    const response = await GET(request, {
      params: Promise.resolve({ id: 'wf_1', execId: 'exec_1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    // 统一信封：{ success, data, timestamp }
    expect(data.success).toBe(true)
    const details = data.data
    expect(details.execution.id).toBe('exec_1')
    expect(details.execution.workflowId).toBe('wf_1')
    expect(details.execution.status).toBe('running')
    expect(details.nodes).toHaveLength(1)
    expect(details.nodes[0].nodeId).toBe('node_1')
    expect(details.nodes[0].duration).toBe(1000)
    expect(details.metrics.executionId).toBe('exec_1')
    expect(details.metrics.totalDuration).toBe(1000)
    expect(details.alerts).toHaveLength(1)
    expect(details.alerts[0].id).toBe('alert_1')
  })

  it('should return 404 when the execution does not exist', async () => {
    mockMonitoring.getExecutionDetails.mockReturnValue({
      execution: undefined,
      nodes: [],
      metrics: null,
      alerts: [],
    })

    const request = createRequest('/api/workflow/wf_1/executions/exec_missing')

    const response = await GET(request, {
      params: Promise.resolve({ id: 'wf_1', execId: 'exec_missing' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.type).toBe('NOT_FOUND')
    expect(data.error.message).toBe('Execution not found')
  })

  it('should return 404 when the execution belongs to another workflow', async () => {
    mockMonitoring.getExecutionDetails.mockReturnValue({
      execution: { ...execution, workflowId: 'wf_other' },
      nodes: [],
      metrics: null,
      alerts: [],
    })

    const request = createRequest('/api/workflow/wf_1/executions/exec_1')

    const response = await GET(request, {
      params: Promise.resolve({ id: 'wf_1', execId: 'exec_1' }),
    })
    const data = await response.json()

    // 归属不匹配统一按 404（与 versions 路由一致），避免用状态码差异
    // 泄漏"执行存在但不属于本工作流"这一信息。
    expect(response.status).toBe(404)
    expect(data.error.type).toBe('NOT_FOUND')
    expect(data.error.message).toBe('Execution not found')
  })

  it('should return 500 when fetching details throws', async () => {
    mockMonitoring.getExecutionDetails.mockImplementation(() => {
      throw new Error('tracker exploded')
    })

    const request = createRequest('/api/workflow/wf_1/executions/exec_1')

    const response = await GET(request, {
      params: Promise.resolve({ id: 'wf_1', execId: 'exec_1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.type).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('Failed to fetch execution details')
  })
})
