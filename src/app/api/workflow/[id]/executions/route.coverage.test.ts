/**
 * Workflow Executions History API Route - additional coverage
 *
 * The existing route.test.ts only asserts the default happy path. This file
 * covers:
 *   - query parameter forwarding (status / triggerType / date range / paging / ordering)
 *   - the error branch (-> 500 with a generic message)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetExecutions } = vi.hoisted(() => ({
  mockGetExecutions: vi.fn(),
}))

vi.mock('@/lib/workflow/monitoring', () => ({
  workflowMonitoring: {
    getExecutions: (...args: unknown[]) => mockGetExecutions(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { auth: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

import { GET } from './route'

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' })
}

describe('GET /api/workflow/[id]/executions - additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetExecutions.mockReset()
    mockGetExecutions.mockReturnValue({ executions: [], total: 0 })
  })

  it('forwards all supported query parameters to the monitoring layer', async () => {
    await GET(
      createRequest(
        '/api/workflow/wf_1/executions?status=completed&triggerType=api&startDate=2026-01-01&endDate=2026-01-31&limit=10&offset=5&orderBy=duration&order=asc'
      ),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    expect(mockGetExecutions).toHaveBeenCalledWith({
      workflowId: 'wf_1',
      status: 'completed',
      triggerType: 'api',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      limit: 10,
      offset: 5,
      orderBy: 'duration',
      order: 'asc',
    })
  })

  it('uses the default limit and offset when they are not provided', async () => {
    await GET(createRequest('/api/workflow/wf_1/executions'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockGetExecutions).toHaveBeenCalledWith({
      workflowId: 'wf_1',
      status: undefined,
      triggerType: undefined,
      startDate: undefined,
      endDate: undefined,
      limit: 50,
      offset: 0,
      // searchParams.get() returns null (not undefined) for absent parameters.
      orderBy: null,
      order: null,
    })
  })

  it('returns 500 with a generic message when the monitoring layer throws', async () => {
    mockGetExecutions.mockImplementation(() => {
      throw new Error('internal detail that must not leak')
    })

    const response = await GET(createRequest('/api/workflow/wf_1/executions'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    // The raw internal error message must not be exposed to the caller.
    expect(JSON.stringify(body)).not.toContain('internal detail that must not leak')
  })
})
