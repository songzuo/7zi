/**
 * Workflow Execution Cancel API Tests
 *
 * Covers:
 * - POST /api/workflow/[id]/executions/[execId]/cancel
 *   正常取消 / 执行不存在 404 / 工作流不匹配 400 / 终态不可取消 400
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockMonitoring } = vi.hoisted(() => ({
  mockMonitoring: {
    getExecution: vi.fn(),
    cancelExecution: vi.fn(),
  },
}))

vi.mock('@/lib/workflow/monitoring', () => ({
  workflowMonitoring: mockMonitoring,
}))

import { POST } from './route'

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'POST' } as any)
}

function makeExecution(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  }
}

describe('POST /api/workflow/[id]/executions/[execId]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should cancel a running execution', async () => {
    const execution = makeExecution()
    const cancelled = { ...execution, status: 'cancelled' }
    mockMonitoring.getExecution.mockReturnValue(execution)
    mockMonitoring.cancelExecution.mockReturnValue(cancelled)

    const request = createRequest('/api/workflow/wf_1/executions/exec_1/cancel')

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', execId: 'exec_1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.execution.id).toBe('exec_1')
    expect(data.execution.status).toBe('cancelled')
    expect(mockMonitoring.cancelExecution).toHaveBeenCalledWith('exec_1')
  })

  it('should return 404 when the execution does not exist', async () => {
    mockMonitoring.getExecution.mockReturnValue(undefined)

    const request = createRequest('/api/workflow/wf_1/executions/exec_missing/cancel')

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', execId: 'exec_missing' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBeUndefined()
    expect(data.error).toBe('Execution not found')
    expect(mockMonitoring.cancelExecution).not.toHaveBeenCalled()
  })

  it('should return 400 when the execution belongs to another workflow', async () => {
    mockMonitoring.getExecution.mockReturnValue(makeExecution({ workflowId: 'wf_other' }))

    const request = createRequest('/api/workflow/wf_1/executions/exec_1/cancel')

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', execId: 'exec_1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Execution does not belong to this workflow')
    expect(mockMonitoring.cancelExecution).not.toHaveBeenCalled()
  })

  it.each(['completed', 'failed', 'cancelled'])(
    'should return 400 when the execution is already in terminal status %s',
    async (status) => {
      mockMonitoring.getExecution.mockReturnValue(makeExecution({ status }))

      const request = createRequest('/api/workflow/wf_1/executions/exec_1/cancel')

      const response = await POST(request, {
        params: Promise.resolve({ id: 'wf_1', execId: 'exec_1' }),
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe(`Cannot cancel execution with status: ${status}`)
      expect(mockMonitoring.cancelExecution).not.toHaveBeenCalled()
    }
  )

  it('should return 500 when cancelling throws', async () => {
    mockMonitoring.getExecution.mockReturnValue(makeExecution())
    mockMonitoring.cancelExecution.mockImplementation(() => {
      throw new Error('tracker exploded')
    })

    const request = createRequest('/api/workflow/wf_1/executions/exec_1/cancel')

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', execId: 'exec_1' }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to cancel execution')
  })
})
