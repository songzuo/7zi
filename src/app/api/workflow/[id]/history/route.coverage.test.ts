/**
 * Workflow History API Route - additional coverage
 *
 * The existing route.test.ts covers the operation / userId / success filters
 * and the limit / offset validation. This file covers the remaining filter
 * parameters (time range + related entity ids) and the error branch.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockQueryHistory } = vi.hoisted(() => ({
  mockQueryHistory: vi.fn(),
}))

vi.mock('@/lib/workflow/history', () => ({
  workflowHistoryService: {
    queryHistory: (...args: unknown[]) => mockQueryHistory(...args),
  },
}))

import { GET } from './route'

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' })
}

describe('GET /api/workflow/[id]/history - additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryHistory.mockReset()
    mockQueryHistory.mockResolvedValue({ entries: [], total: 0, summary: {} })
  })

  it('forwards the time range filters', async () => {
    await GET(
      createRequest('/api/workflow/wf_1/history?startTime=2026-01-01&endTime=2026-01-31'),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(mockQueryHistory).toHaveBeenCalledWith(
      {
        workflowId: 'wf_1',
        startTime: '2026-01-01',
        endTime: '2026-01-31',
      },
      { limit: 100, offset: 0 }
    )
  })

  it('forwards the related entity id filters', async () => {
    await GET(
      createRequest(
        '/api/workflow/wf_1/history?relatedVersionId=v1&relatedInstanceId=inst_1&relatedNodeId=node_1'
      ),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(mockQueryHistory).toHaveBeenCalledWith(
      {
        workflowId: 'wf_1',
        relatedVersionId: 'v1',
        relatedInstanceId: 'inst_1',
        relatedNodeId: 'node_1',
      },
      { limit: 100, offset: 0 }
    )
  })

  it('forwards custom limit and offset values', async () => {
    await GET(createRequest('/api/workflow/wf_1/history?limit=20&offset=10'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockQueryHistory).toHaveBeenCalledWith({ workflowId: 'wf_1' }, { limit: 20, offset: 10 })
  })

  it('returns 500 when the history service fails', async () => {
    mockQueryHistory.mockRejectedValue(new Error('history store offline'))

    const response = await GET(createRequest('/api/workflow/wf_1/history'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })
})
