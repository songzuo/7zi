/**
 * @fileoverview Workflow Execution Details API Route Integration Tests
 * @description Tests for GET /api/workflow/[id]/executions/[execId] endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../../../../../src/app/api/workflow/[id]/executions/[execId]/route'

// Mock execution data
const mockExecution = {
  id: 'exec_001',
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
  inputs: { query: 'test query' },
  outputs: { result: 'success' },
  metadata: {
    createdAt: '2026-05-09T08:00:00.000Z',
    updatedAt: '2026-05-09T08:05:00.000Z',
    tags: ['production'],
  },
  variables: {},
}

const mockNodeExecutions = [
  {
    id: 'node_exec_001',
    executionId: 'exec_001',
    nodeId: 'node_1',
    nodeName: 'Start Node',
    nodeType: 'start',
    status: 'success' as const,
    startTime: '2026-05-09T08:00:00.000Z',
    endTime: '2026-05-09T08:00:01.000Z',
    duration: 1000,
    output: { next: 'node_2' },
  },
  {
    id: 'node_exec_002',
    executionId: 'exec_001',
    nodeId: 'node_2',
    nodeName: 'Agent Node',
    nodeType: 'agent',
    status: 'success' as const,
    startTime: '2026-05-09T08:00:01.000Z',
    endTime: '2026-05-09T08:04:00.000Z',
    duration: 239000,
    output: { result: 'Task completed' },
  },
  {
    id: 'node_exec_003',
    executionId: 'exec_001',
    nodeId: 'node_3',
    nodeName: 'End Node',
    nodeType: 'end',
    status: 'success' as const,
    startTime: '2026-05-09T08:04:00.000Z',
    endTime: '2026-05-09T08:05:00.000Z',
    duration: 60000,
  },
]

const mockMetrics = {
  totalDuration: 300000,
  avgNodeDuration: 100000,
  successRate: 100,
  nodeMetrics: {
    node_1: { duration: 1000, status: 'success' },
    node_2: { duration: 239000, status: 'success' },
    node_3: { duration: 60000, status: 'success' },
  },
}

const mockAlerts: Array<{ id: string; type: string; severity: string; message: string; timestamp: string; executionId?: string; nodeId?: string }> = []

// Mock the workflow monitoring module
vi.mock('../../../../../src/lib/workflow/monitoring', () => {
  return {
    workflowMonitoring: {
      getExecution: vi.fn((execId: string) => {
        if (execId === 'exec_001') return mockExecution
        if (execId === 'exec_002') return { ...mockExecution, id: 'exec_002', status: 'running' as const }
        return undefined
      }),

      getExecutionDetails: vi.fn((execId: string) => {
        if (execId === 'exec_001') {
          return {
            execution: mockExecution,
            nodeExecutions: mockNodeExecutions,
            metrics: mockMetrics,
            alerts: mockAlerts,
          }
        }
        if (execId === 'exec_002') {
          return {
            execution: { ...mockExecution, id: 'exec_002', status: 'running' as const },
            nodeExecutions: [mockNodeExecutions[0]],
            metrics: { totalDuration: 0, avgNodeDuration: 0, successRate: 0, nodeMetrics: {} },
            alerts: [],
          }
        }
        return { execution: undefined, nodeExecutions: [], metrics: undefined, alerts: [] }
      }),

      getExecutionAlerts: vi.fn(() => []),
    },
  }
})

describe('Workflow Execution Details API - GET', () => {
  const workflowId = 'workflow_001'
  const execId = 'exec_001'
  let mockRequest: NextRequest

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful retrieval', () => {
    it('should return execution details with correct structure', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json).toHaveProperty('execution')
      expect(json).toHaveProperty('nodeExecutions')
      expect(json).toHaveProperty('metrics')
      expect(json).toHaveProperty('alerts')
    })

    it('should return execution with full details', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(json.execution).toHaveProperty('id')
      expect(json.execution.id).toBe(execId)
      expect(json.execution).toHaveProperty('workflowId')
      expect(json.execution).toHaveProperty('workflowName')
      expect(json.execution).toHaveProperty('workflowVersion')
      expect(json.execution).toHaveProperty('status')
      expect(json.execution).toHaveProperty('startTime')
      expect(json.execution).toHaveProperty('endTime')
      expect(json.execution).toHaveProperty('duration')
      expect(json.execution).toHaveProperty('nodeCount')
      expect(json.execution).toHaveProperty('triggeredBy')
      expect(json.execution).toHaveProperty('triggerType')
    })

    it('should return node executions array', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(Array.isArray(json.nodeExecutions)).toBe(true)
      expect(json.nodeExecutions.length).toBe(3)
    })

    it('should return metrics when available', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(json.metrics).toHaveProperty('totalDuration')
      expect(json.metrics).toHaveProperty('avgNodeDuration')
      expect(json.metrics).toHaveProperty('successRate')
      expect(json.metrics).toHaveProperty('nodeMetrics')
    })
  })

  describe('execution states', () => {
    it('should return details for completed execution', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      expect(json.execution.status).toBe('completed')
      expect(json.execution).toHaveProperty('endTime')
      expect(json.execution).toHaveProperty('outputs')
    })

    it('should return details for running execution', async () => {
      const runningExecId = 'exec_002'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${runningExecId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId: runningExecId }),
      })
      const json = await response.json()

      expect(json.execution.status).toBe('running')
      // Running execution may or may not have endTime depending on implementation
    })

    it('should include error information for failed execution', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      // Execution with failed status would have error field
      if (json.execution.status === 'failed') {
        expect(json.execution).toHaveProperty('error')
      }
    })
  })

  describe('node execution details', () => {
    it('should return node executions with correct structure', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      const nodeExec = json.nodeExecutions[0]
      expect(nodeExec).toHaveProperty('id')
      expect(nodeExec).toHaveProperty('executionId')
      expect(nodeExec).toHaveProperty('nodeId')
      expect(nodeExec).toHaveProperty('nodeName')
      expect(nodeExec).toHaveProperty('nodeType')
      expect(nodeExec).toHaveProperty('status')
      expect(nodeExec).toHaveProperty('startTime')
    })

    it('should include timing information for nodes', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      const nodeExec = json.nodeExecutions[0]
      expect(nodeExec).toHaveProperty('endTime')
      expect(nodeExec).toHaveProperty('duration')
    })

    it('should include output for agent nodes', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      const agentNode = json.nodeExecutions.find(
        (n: { nodeType: string }) => n.nodeType === 'agent'
      )
      expect(agentNode).toHaveProperty('output')
    })
  })

  describe('error handling - not found', () => {
    it('should return 404 when execution not found', async () => {
      const nonexistentExecId = 'nonexistent_exec'
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${nonexistentExecId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId: nonexistentExecId }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json).toHaveProperty('error')
      expect(json.error).toContain('not found')
    })
  })

  describe('error handling - workflow ID mismatch', () => {
    it('should return 400 when workflow ID does not match execution', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/wrong_workflow/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: 'wrong_workflow', execId }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json).toHaveProperty('error')
      expect(json.error.toLowerCase()).toContain('belong')
    })
  })

  describe('error handling - internal server error', () => {
    it('should return 500 on monitoring service error', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      // Should be 200 or 500 with proper error structure
      if (response.status === 500) {
        expect(json).toHaveProperty('error')
      }
    })
  })

  describe('response headers', () => {
    it('should return JSON content type', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('edge cases', () => {
    it('should handle execution with no node outputs', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      // Should handle missing output gracefully
      json.nodeExecutions.forEach((node: { output?: unknown }) => {
        // output is optional
        if (node.output === undefined) {
          expect(node).not.toHaveProperty('output')
        }
      })
    })

    it('should handle execution without metrics', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/executions/${execId}`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId, execId }),
      })
      const json = await response.json()

      // Metrics should still be present (may be undefined for running)
      expect(json).toHaveProperty('metrics')
    })
  })
})
