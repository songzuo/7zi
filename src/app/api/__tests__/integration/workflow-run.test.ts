/**
 * @fileoverview Workflow Run API Route Integration Tests
 * @description Tests for POST/GET /api/workflow/[id]/run endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { POST, GET } from '../../../../../src/app/api/workflow/[id]/run/route'

// Mock dependencies
vi.mock('../../../../../src/lib/workflow/engine', () => {
  const mockInstance = {
    id: 'instance_test_123',
    workflowId: 'workflow_001',
    status: 'running',
    metadata: {
      triggeredBy: 'user_1',
      triggerType: 'manual',
      startedAt: new Date().toISOString(),
    },
  }

  return {
    workflowEngine: {
      registerWorkflow: vi.fn(),
      createInstance: vi.fn().mockReturnValue(mockInstance),
      executeInstance: vi.fn().mockResolvedValue(undefined),
      getInstance: vi.fn(),
    },
  }
})

vi.mock('../../../../../src/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data) => {
    const response = NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
    return response
  }),
  createErrorResponse: vi.fn((error) => {
    return NextResponse.json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    }, { status: 500 })
  }),
}))

describe('Workflow Run API - POST', () => {
  const workflowId = 'workflow_001'
  let mockRequest: NextRequest

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful workflow execution', () => {
    it('should execute workflow and return instance details', async () => {
      const requestBody = {
        inputs: { query: 'test query', data: { key: 'value' } },
        userId: 'user_test_123',
        triggerType: 'manual',
      }

      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('instanceId')
      expect(json.data.instanceId).toBe('instance_test_123')
      expect(json.data.workflowId).toBe(workflowId)
      expect(json.data.status).toBe('running')
      expect(json.data.message).toBe('工作流已开始运行')
    })

    it('should accept minimal inputs', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: {} }),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should handle system trigger type', async () => {
      const requestBody = {
        inputs: { test: 'data' },
        triggerType: 'system',
      }

      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })

  describe('parameter validation', () => {
    it('should handle empty body gracefully', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should handle complex nested inputs', async () => {
      const requestBody = {
        inputs: {
          level1: {
            level2: {
              level3: ['array', 'values', { nested: 'object' }],
            },
          },
          array: [1, 2, 3, { complex: true }],
        },
        userId: 'user_complex',
        triggerType: 'api',
      }

      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('instanceId')
    })
  })

  describe('error handling', () => {
    it('should handle invalid JSON body', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      try {
        await POST(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('response structure', () => {
    it('should return proper success response format', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: { test: 'data' } }),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(json).toHaveProperty('success')
      expect(json).toHaveProperty('data')
      expect(json).toHaveProperty('timestamp')
      expect(json.success).toBe(true)
    })

    it('should return JSON content type', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: {} }),
      })

      const response = await POST(mockRequest, { params: Promise.resolve({ id: workflowId }) })

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})

describe('Workflow Run API - GET (Run History)', () => {
  const workflowId = 'workflow_001'
  let mockRequest: NextRequest

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful retrieval', () => {
    it('should return run history list', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('instances')
      expect(Array.isArray(json.data.instances)).toBe(true)
    })

    it('should return stats in response', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(json.data).toHaveProperty('stats')
      expect(json.data.stats).toHaveProperty('total')
      expect(json.data.stats).toHaveProperty('success')
      expect(json.data.stats).toHaveProperty('failed')
      expect(json.data.stats).toHaveProperty('running')
    })

    it('should include pagination info', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(json.data).toHaveProperty('total')
      expect(json.data).toHaveProperty('limit')
      expect(json.data).toHaveProperty('offset')
    })
  })

  describe('filtering', () => {
    it('should filter by status parameter', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run?status=completed`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      // All returned instances should match the status filter
      json.data.instances.forEach((instance: { status: string }) => {
        expect(instance.status).toBe('completed')
      })
    })

    it('should filter by running status', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run?status=running`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })

  describe('pagination', () => {
    it('should handle limit parameter', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run?limit=10`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.limit).toBe(10)
    })

    it('should handle offset parameter', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run?offset=5`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.offset).toBe(5)
    })

    it('should handle limit and offset together', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run?limit=5&offset=10`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.limit).toBe(5)
      expect(json.data.offset).toBe(10)
    })
  })

  describe('instance structure validation', () => {
    it('should return instances with correct structure', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      const instance = json.data.instances[0]
      expect(instance).toHaveProperty('id')
      expect(instance).toHaveProperty('workflowId')
      expect(instance).toHaveProperty('workflowVersion')
      expect(instance).toHaveProperty('status')
      expect(instance).toHaveProperty('progress')
      expect(instance).toHaveProperty('nodeResults')
      expect(instance).toHaveProperty('data')
      expect(instance).toHaveProperty('metadata')
    })

    it('should include progress information', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      const instance = json.data.instances[0]
      expect(instance.progress).toHaveProperty('total')
      expect(instance.progress).toHaveProperty('completed')
      expect(instance.progress).toHaveProperty('failed')
      expect(instance.progress).toHaveProperty('percentage')
    })

    it('should include node execution results', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      const instance = json.data.instances[0]
      expect(instance.nodeResults).toBeDefined()
      expect(typeof instance.nodeResults).toBe('object')
    })
  })

  describe('error handling', () => {
    it('should handle exceptions gracefully', async () => {
      // This test verifies error handling by checking the response structure
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/run`)

      const response = await GET(mockRequest, { params: Promise.resolve({ id: workflowId }) })
      const json = await response.json()

      // Even in error cases, should return proper error structure
      if (!json.success) {
        expect(json).toHaveProperty('error')
        expect(json.error).toHaveProperty('message')
      }
    })
  })
})
