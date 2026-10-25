/**
 * Workflow History API Tests
 *
 * Covers:
 * - GET /api/workflow/[id]/history  (查询 + limit/offset 校验)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockHistoryService } = vi.hoisted(() => ({
  mockHistoryService: {
    queryHistory: vi.fn(),
  },
}))

vi.mock('@/lib/workflow/history', () => ({
  workflowHistoryService: mockHistoryService,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

import { GET } from './route'

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' } as any)
}

const historyResult = {
  entries: [
    {
      id: 'hist_1',
      workflowId: 'wf_1',
      operation: 'update',
      description: '更新工作流',
      userId: 'user_1',
      details: {},
      success: true,
      timestamp: '2026-01-01T00:00:00.000Z',
      duration: 12,
    },
  ],
  total: 1,
  summary: {
    byOperation: { update: 1 },
    byUser: { user_1: 1 },
    successRate: 100,
    avgDuration: 12,
  },
}

describe('GET /api/workflow/[id]/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHistoryService.queryHistory.mockResolvedValue(historyResult)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return the history entries with summary', async () => {
    const request = createRequest('/api/workflow/wf_1/history')

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.entries).toHaveLength(1)
    expect(data.data.entries[0].id).toBe('hist_1')
    expect(data.data.entries[0].operation).toBe('update')
    expect(data.data.total).toBe(1)
    expect(data.data.summary.successRate).toBe(100)
    expect(data.data.summary.avgDuration).toBe(12)

    expect(mockHistoryService.queryHistory).toHaveBeenCalledWith(
      { workflowId: 'wf_1' },
      { limit: 100, offset: 0 }
    )
  })

  it('should forward the operation, userId and success filters', async () => {
    const request = createRequest(
      '/api/workflow/wf_1/history?operation=update&userId=user_1&success=false&limit=10&offset=5'
    )

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })

    expect(response.status).toBe(200)
    expect(mockHistoryService.queryHistory).toHaveBeenCalledWith(
      {
        workflowId: 'wf_1',
        operation: 'update',
        userId: 'user_1',
        success: false,
      },
      { limit: 10, offset: 5 }
    )
  })

  it('should return 400 when limit is out of range', async () => {
    const request = createRequest('/api/workflow/wf_1/history?limit=0')

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('Limit must be between 1 and 1000')
    expect(mockHistoryService.queryHistory).not.toHaveBeenCalled()
  })

  it('should return 400 when limit is not a number', async () => {
    const request = createRequest('/api/workflow/wf_1/history?limit=abc')

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toBe('Limit must be between 1 and 1000')
  })

  it('should return 400 when offset is negative', async () => {
    const request = createRequest('/api/workflow/wf_1/history?offset=-1')

    const response = await GET(request, { params: Promise.resolve({ id: 'wf_1' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toBe('Offset must be >= 0')
  })
})
