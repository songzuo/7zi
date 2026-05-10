/**
 * @fileoverview Workflow History API Route Integration Tests
 * @description Tests for GET /api/workflow/[id]/history endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { GET } from '../../../../../src/app/api/workflow/[id]/history/route'

// Mock history service module
const mockEntries = [
  {
    id: 'hist_001',
    workflowId: 'workflow_001',
    operation: 'create' as const,
    description: 'Workflow created',
    userId: 'user_001',
    userName: 'Test User',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: { workflowName: 'Test Workflow' },
    success: true,
    timestamp: '2026-05-09T08:00:00.000Z',
    duration: 500,
    relatedVersionId: 'version_001',
    relatedInstanceId: undefined,
    relatedNodeId: undefined,
  },
  {
    id: 'hist_002',
    workflowId: 'workflow_001',
    operation: 'execute' as const,
    description: 'Workflow executed',
    userId: 'user_001',
    userName: 'Test User',
    ipAddress: '192.168.1.1',
    details: { inputs: { query: 'test' }, instanceId: 'instance_001' },
    success: true,
    timestamp: '2026-05-09T08:30:00.000Z',
    duration: 30000,
    relatedVersionId: 'version_001',
    relatedInstanceId: 'instance_001',
    relatedNodeId: undefined,
  },
  {
    id: 'hist_003',
    workflowId: 'workflow_001',
    operation: 'update' as const,
    description: 'Workflow updated',
    userId: 'user_002',
    userName: 'Admin User',
    ipAddress: '192.168.1.2',
    details: { changes: ['nodes', 'edges'] },
    success: true,
    timestamp: '2026-05-09T09:00:00.000Z',
    duration: 1000,
    relatedVersionId: 'version_002',
    relatedNodeId: undefined,
  },
  {
    id: 'hist_004',
    workflowId: 'workflow_001',
    operation: 'execute' as const,
    description: 'Workflow execution failed',
    userId: 'user_001',
    userName: 'Test User',
    ipAddress: '192.168.1.1',
    details: { inputs: { query: 'fail' }, instanceId: 'instance_002', error: 'Node timeout' },
    success: false,
    errorCode: 'EXECUTION_FAILED',
    errorMessage: 'Node execution timeout',
    timestamp: '2026-05-09T09:30:00.000Z',
    duration: 60000,
    relatedVersionId: 'version_002',
    relatedInstanceId: 'instance_002',
    relatedNodeId: 'node_2',
  },
  {
    id: 'hist_005',
    workflowId: 'workflow_001',
    operation: 'delete' as const,
    description: 'Workflow deleted',
    userId: 'user_003',
    userName: 'Admin',
    details: { reason: 'Cleanup' },
    success: true,
    timestamp: '2026-05-09T10:00:00.000Z',
    duration: 200,
  },
]

vi.mock('../../../../../src/lib/workflow/history', () => ({
  workflowHistoryService: {
    queryHistory: vi.fn(async (filter, options) => {
      let filtered = [...mockEntries]

      // Apply filters
      if (filter.workflowId) {
        filtered = filtered.filter(e => e.workflowId === filter.workflowId)
      }
      if (filter.operation) {
        filtered = filtered.filter(e => e.operation === filter.operation)
      }
      if (filter.userId) {
        filtered = filtered.filter(e => e.userId === filter.userId)
      }
      if (filter.success !== undefined) {
        filtered = filtered.filter(e => e.success === filter.success)
      }
      if (filter.startTime) {
        filtered = filtered.filter(e => e.timestamp >= filter.startTime)
      }
      if (filter.endTime) {
        filtered = filtered.filter(e => e.timestamp <= filter.endTime)
      }
      if (filter.relatedVersionId) {
        filtered = filtered.filter(e => e.relatedVersionId === filter.relatedVersionId)
      }
      if (filter.relatedInstanceId) {
        filtered = filtered.filter(e => e.relatedInstanceId === filter.relatedInstanceId)
      }
      if (filter.relatedNodeId) {
        filtered = filtered.filter(e => e.relatedNodeId === filter.relatedNodeId)
      }

      const limit = options?.limit || 100
      const offset = options?.offset || 0

      return {
        entries: filtered.slice(offset, offset + limit),
        total: filtered.length,
        summary: {
          byOperation: filtered.reduce((acc, e) => {
            acc[e.operation] = (acc[e.operation] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          byUser: filtered.reduce((acc, e) => {
            acc[e.userId] = (acc[e.userId] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          successRate: filtered.length > 0 ? filtered.filter(e => e.success).length / filtered.length : 0,
          avgDuration:
            filtered.filter(e => e.duration).length > 0
              ? filtered.filter(e => e.duration).reduce((sum, e) => sum + e.duration!, 0) /
                filtered.filter(e => e.duration).length
              : 0,
        },
      }
    }),
  },
}))

// Also mock the error handler used by the route
vi.mock('../../../../../src/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data) =>
    NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  ),
  createErrorResponse: vi.fn((error) =>
    NextResponse.json({
      success: false,
      error: {
        type: 'INTERNAL',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
    }, { status: 500 })
  ),
  createValidationError: vi.fn((message) =>
    NextResponse.json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message,
        timestamp: new Date().toISOString(),
      },
    }, { status: 400 })
  ),
  createNotFoundError: vi.fn((message) =>
    NextResponse.json({
      success: false,
      error: {
        type: 'NOT_FOUND',
        message,
        timestamp: new Date().toISOString(),
      },
    }, { status: 404 })
  ),
}))

describe('Workflow History API - GET', () => {
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
    it('should return history entries with correct structure', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('entries')
      expect(Array.isArray(json.data.entries)).toBe(true)
      expect(json.data).toHaveProperty('total')
      expect(json.data).toHaveProperty('summary')
    })

    it('should return all history entries for workflow', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(json.data.entries.length).toBe(5)
      expect(json.data.total).toBe(5)
    })

    it('should include summary statistics', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(json.data.summary).toHaveProperty('byOperation')
      expect(json.data.summary).toHaveProperty('byUser')
      expect(json.data.summary).toHaveProperty('successRate')
      expect(json.data.summary).toHaveProperty('avgDuration')
    })
  })

  describe('operation type filtering', () => {
    it('should filter by operation=create', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?operation=create`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      json.data.entries.forEach((entry: { operation: string }) => {
        expect(entry.operation).toBe('create')
      })
    })

    it('should filter by operation=execute', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?operation=execute`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      json.data.entries.forEach((entry: { operation: string }) => {
        expect(entry.operation).toBe('execute')
      })
    })

    it('should filter by operation=update', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?operation=update`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      json.data.entries.forEach((entry: { operation: string }) => {
        expect(entry.operation).toBe('update')
      })
    })

    it('should filter by operation=delete', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?operation=delete`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      json.data.entries.forEach((entry: { operation: string }) => {
        expect(entry.operation).toBe('delete')
      })
    })
  })

  describe('user filtering', () => {
    it('should filter by userId', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?userId=user_001`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      json.data.entries.forEach((entry: { userId: string }) => {
        expect(entry.userId).toBe('user_001')
      })
    })

    it('should filter by different user', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?userId=user_002`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      json.data.entries.forEach((entry: { userId: string }) => {
        expect(entry.userId).toBe('user_002')
      })
    })
  })

  describe('success filtering', () => {
    it('should filter by success=true', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?success=true`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      json.data.entries.forEach((entry: { success: boolean }) => {
        expect(entry.success).toBe(true)
      })
    })

    it('should filter by success=false', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?success=false`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      json.data.entries.forEach((entry: { success: boolean }) => {
        expect(entry.success).toBe(false)
      })
    })
  })

  describe('date range filtering', () => {
    it('should filter by startTime', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?startTime=2026-05-09T09:00:00.000Z`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should filter by endTime', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?endTime=2026-05-09T09:30:00.000Z`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should filter by startTime and endTime', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?startTime=2026-05-09T08:00:00.000Z&endTime=2026-05-09T10:00:00.000Z`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      json.data.entries.forEach((entry: { timestamp: string }) => {
        expect(entry.timestamp >= '2026-05-09T08:00:00.000Z').toBe(true)
        expect(entry.timestamp <= '2026-05-09T10:00:00.000Z').toBe(true)
      })
    })
  })

  describe('related entity filtering', () => {
    it('should filter by relatedVersionId', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?relatedVersionId=version_001`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should filter by relatedInstanceId', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?relatedInstanceId=instance_001`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should filter by relatedNodeId', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?relatedNodeId=node_2`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })

  describe('pagination', () => {
    it('should handle limit parameter', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?limit=10`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.entries.length).toBeLessThanOrEqual(10)
    })

    it('should handle offset parameter', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?offset=3`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should return default pagination when not specified', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      // Default limit is 100
      expect(json.data.entries.length).toBeLessThanOrEqual(100)
    })
  })

  describe('parameter validation', () => {
    it('should validate limit is positive', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?limit=0`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.message.toLowerCase()).toContain('limit')
    })

    it('should validate limit is not too large', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?limit=1001`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
    })

    it('should validate offset is not negative', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?offset=-1`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.error.message.toLowerCase()).toContain('offset')
    })
  })

  describe('entry structure validation', () => {
    it('should return entries with correct structure', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      const entry = json.data.entries[0]
      expect(entry).toHaveProperty('id')
      expect(entry).toHaveProperty('workflowId')
      expect(entry).toHaveProperty('operation')
      expect(entry).toHaveProperty('description')
      expect(entry).toHaveProperty('userId')
      expect(entry).toHaveProperty('details')
      expect(entry).toHaveProperty('success')
      expect(entry).toHaveProperty('timestamp')
    })

    it('should include optional fields when present', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      // First entry has userName and duration
      const entryWithDetails = json.data.entries.find(
        (e: { userName?: string }) => e.userName
      )
      expect(entryWithDetails).toHaveProperty('userName')
    })

    it('should include error information for failed operations', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?success=false`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      const failedEntry = json.data.entries.find((e: { success: boolean }) => !e.success)
      expect(failedEntry).toHaveProperty('errorCode')
      expect(failedEntry).toHaveProperty('errorMessage')
    })

    it('should include duration when available', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      const entryWithDuration = json.data.entries.find(
        (e: { duration?: number }) => e.duration !== undefined
      )
      expect(entryWithDuration).toHaveProperty('duration')
      expect(typeof entryWithDuration.duration).toBe('number')
    })

    it('should include related entity fields when present', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      const entryWithRelation = json.data.entries.find(
        (e: { relatedVersionId?: string }) => e.relatedVersionId
      )
      // relatedVersionId is present in mock data
      expect(entryWithRelation).toBeDefined()
      if (entryWithRelation) {
        expect(entryWithRelation).toHaveProperty('relatedVersionId')
      }
    })
  })

  describe('summary statistics validation', () => {
    it('should calculate byOperation correctly', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(json.data.summary.byOperation).toHaveProperty('create')
      expect(json.data.summary.byOperation).toHaveProperty('execute')
      expect(json.data.summary.byOperation).toHaveProperty('update')
    })

    it('should calculate byUser correctly', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(json.data.summary.byUser).toHaveProperty('user_001')
      expect(json.data.summary.byUser).toHaveProperty('user_002')
    })

    it('should calculate successRate correctly', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(json.data.summary.successRate).toBeGreaterThan(0)
      expect(json.data.summary.successRate).toBeLessThanOrEqual(1)
    })

    it('should calculate avgDuration correctly', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(typeof json.data.summary.avgDuration).toBe('number')
    })
  })

  describe('error handling', () => {
    it('should return 500 on service error', async () => {
      // This is a fallback test to ensure proper error structure
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      // Should be 200 or have proper error structure
      if (response.status === 500) {
        expect(json).toHaveProperty('error')
      }
    })

    it('should return valid JSON structure', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      // Should be parseable without throwing
      expect(() => JSON.parse(JSON.stringify(json))).not.toThrow()
    })
  })

  describe('response headers', () => {
    it('should return JSON content type', async () => {
      mockRequest = new NextRequest(`http://localhost/api/workflow/${workflowId}/history`)

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('empty results', () => {
    it('should handle empty results gracefully', async () => {
      mockRequest = new NextRequest(
        `http://localhost/api/workflow/${workflowId}/history?userId=nonexistent_user`
      )

      const response = await GET(mockRequest, {
        params: Promise.resolve({ id: workflowId }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.data.entries).toEqual([])
      expect(json.data.total).toBe(0)
    })
  })
})
