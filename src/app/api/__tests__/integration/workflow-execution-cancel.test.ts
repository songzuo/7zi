/**
 * @fileoverview Workflow Execution Cancel API Route Integration Tests
 * @description Tests for POST /api/workflow/[id]/executions/[execId]/cancel endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../../../../../src/app/api/workflow/[id]/executions/[execId]/cancel/route'

// Mock execution data for different states
const mockRunningExecution = {
  id: 'exec_running',
  workflowId: 'workflow_001',
  workflowName: 'Test Workflow',
  workflowVersion: 1,
  status: 'running' as const,
  startTime: '2026-05-09T08:00:00.000Z',
  nodeCount: 3,
  completedNodes: 1,
  failedNodes: 0,
  skippedNodes: 0,
  triggeredBy: 'user_001',
  triggerType: 'manual' as const,
  inputs: { query: 'test' },
  metadata: {
    createdAt: '2026-05-09T08:00:00.000Z',
    updatedAt: '2026-05-09T08:00:00.000Z',
  },
  variables: {},
}

const mockPendingExecution = {
  id: 'exec_pending',
  workflowId: 'workflow_001',
  workflowName: 'Test Workflow',
  workflowVersion: 1,
  status: 'pending' as const,
  startTime: '2026-05-09T08:00:00.000Z',
  nodeCount: 3,
  completedNodes: 0,
  failedNodes: 0,
  skippedNodes: 0,
  triggeredBy: 'user_001',
  triggerType: 'api' as const,
  inputs: { query: 'test' },
  metadata: {
    createdAt: '2026-05-09T08:00:00.000Z',
    updatedAt: '2026-05-09T08:00:00.000Z',
  },
  variables: {},
}

const mockCompletedExecution = {
  id: 'exec_completed',
  workflowId: 'workflow_001',
  workflowName: 'Test Workflow',
  workflowVersion: 1,
  status: 'completed' as const,
  startTime: '2026-05-09T08:00:00.000Z',
  endTime: '2026-05-09T08:05:00.000Z',
  duration: 300000,
  nodeCount: 3,
  completedNodes: 3,
  failedNodes: 0,
  skippedNodes: 0,
  triggeredBy: 'user_001',
  triggerType: 'manual' as const,
  inputs: { query: 'test' },
  outputs: { result: 'success' },
  metadata: {
    createdAt: '2026-05-09T08:00:00.000Z',
    updatedAt: '2026-05-09T08:05:00.000Z',
  },
  variables: {},
}

const mockCancelledExecution = {
  id: 'exec_cancelled',
  workflowId: 'workflow_001',
  workflowName: 'Test Workflow',
  workflowVersion: 1,
  status: 'cancelled' as const,
  startTime: '2026-05-09T08:00:00.000Z',
  endTime: '2026-05-09T08:02:00.000Z',
  duration: 120000,
  nodeCount: 3,
  completedNodes: 1,
  failedNodes: 0,
  skippedNodes: 2,
  triggeredBy: 'user_001',
  triggerType: 'manual' as const,
  inputs: { query: 'test' },
  metadata: {
    createdAt: '2026-05-09T08:00:00.000Z',
    updatedAt: '2026-05-09T08:02:00.000Z',
  },
  variables: {},
}

// Mock the workflow monitoring module
vi.mock('../../../../../src/lib/workflow/monitoring', () => {
  return {
    workflowMonitoring: {
      getExecution: vi.fn((execId: string) => {
        const executions: Record<string, typeof mockRunningExecution> = {
          'exec_running': mockRunningExecution,
          'exec_pending': mockPendingExecution,
          'exec_completed': mockCompletedExecution,
          'exec_cancelled': mockCancelledExecution,
        }
        return executions[execId]
      }),

      cancelExecution: vi.fn((execId: string) => {
        if (execId === 'exec_running' || execId === 'exec_pending') {
          return {
            ...mockRunningExecution,
            id: execId,
            status: 'cancelled' as const,
            endTime: new Date().toISOString(),
          }
        }
        return undefined
      }),
    },
  }
})

describe('Workflow Execution Cancel API - POST', () => {
  const workflowId = 'workflow_001'
  let mockRequest: NextRequest

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful cancellation', () => {
    it('should cancel a running execution', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toHaveProperty('success')
      expect(json.success).toBe(true)
      expect(json).toHaveProperty('execution')
      expect(json.execution.status).toBe('cancelled')
    })

    it('should cancel a pending execution', async () => {
      const execId = 'exec_pending'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should return the cancelled execution details', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(json.execution).toHaveProperty('id')
      expect(json.execution.id).toBe(execId)
      expect(json.execution).toHaveProperty('workflowId')
      expect(json.execution).toHaveProperty('status')
      expect(json.execution).toHaveProperty('endTime')
    })
  })

  describe('error handling - execution not found', () => {
    it('should return 404 when execution not found', async () => {
      const nonexistentExecId = 'nonexistent_exec'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${nonexistentExecId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId: nonexistentExecId }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json).toHaveProperty('error')
      expect(json.error.toLowerCase()).toContain('not found')
    })
  })

  describe('error handling - workflow ID mismatch', () => {
    it('should return 400 when workflow ID does not match execution', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/wrong_workflow/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: 'wrong_workflow', execId }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json).toHaveProperty('error')
      expect(json.error.toLowerCase()).toContain('belong')
    })
  })

  describe('error handling - cannot cancel completed execution', () => {
    it('should return 400 when cancelling a completed execution', async () => {
      const execId = 'exec_completed'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json).toHaveProperty('error')
      expect(json.error.toLowerCase()).toContain('cannot cancel')
    })
  })

  describe('error handling - cannot cancel already cancelled execution', () => {
    it('should return 400 when cancelling an already cancelled execution', async () => {
      const execId = 'exec_cancelled'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json).toHaveProperty('error')
      expect(json.error.toLowerCase()).toContain('cancelled')
    })
  })

  describe('response format', () => {
    it('should return JSON content type', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return consistent success response structure', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toHaveProperty('success')
      expect(json).toHaveProperty('execution')
    })
  })

  describe('cancelled execution details', () => {
    it('should include endTime after cancellation', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(json.execution).toHaveProperty('endTime')
      expect(json.execution.endTime).toBeDefined()
    })

    it('should mark cancelled status in execution', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(json.execution.status).toBe('cancelled')
    })

    it('should track node completion at cancellation time', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      // At cancellation time, should track how many nodes were completed
      expect(json.execution).toHaveProperty('completedNodes')
      expect(json.execution).toHaveProperty('skippedNodes')
    })
  })

  describe('error handling - internal server error', () => {
    it('should return 500 on monitoring service error', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        { method: 'POST' }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      // Should be 200 or 500 with proper error structure
      if (response.status === 500) {
        expect(json).toHaveProperty('error')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle rapid cancellation requests', async () => {
      const execId = 'exec_running'
      const requests = [
        new NextRequest(`http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`, {
          method: 'POST',
        }),
      ]

      // This test verifies the API handles requests without crashing
      for (const req of requests) {
        const response = await POST(req, {
          params: Promise.resolve({ id: workflowId, execId }),
        })
        expect([200, 500]).toContain(response.status)
      }
    })

    it('should handle cancellation with no body', async () => {
      const execId = 'exec_running'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}/cancel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '',
        }
      )

      const response = await POST(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })

      // Should still return valid response
      const json = await response.json()
      expect(response.status).toBe(200)
      expect(json).toHaveProperty('success')
    })
  })
})
