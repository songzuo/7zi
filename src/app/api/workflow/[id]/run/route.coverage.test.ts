/**
 * Workflow Run API Route - additional coverage
 *
 * The existing route.test.ts only covers the happy POST path and the empty-id
 * validation. This file covers:
 *   - GET /api/workflow/[id]/run  (run history + filtering + pagination + stats)
 *   - GET/POST validation for a blank workflow id
 *   - POST when the request body is not valid JSON -> error response
 *   - POST when the engine fails to create an instance -> error response
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockRegisterWorkflow, mockCreateInstance, mockExecuteInstance } = vi.hoisted(() => ({
  mockRegisterWorkflow: vi.fn(),
  mockCreateInstance: vi.fn(),
  mockExecuteInstance: vi.fn(),
}))

vi.mock('@/lib/workflow/engine', () => ({
  workflowEngine: {
    registerWorkflow: (...args: unknown[]) => mockRegisterWorkflow(...args),
    createInstance: (...args: unknown[]) => mockCreateInstance(...args),
    executeInstance: (...args: unknown[]) => mockExecuteInstance(...args),
  },
}))

import { GET, POST } from './route'

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' })
}

function createPostRequest(body: string): NextRequest {
  return new NextRequest(new URL('/api/workflow/wf_1/run', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

describe('GET /api/workflow/[id]/run - run history', () => {
  it('returns the run history with pagination info and stats', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/run'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.instances)).toBe(true)
    expect(body.data.instances).toHaveLength(2)
    expect(body.data.total).toBe(2)
    expect(body.data.limit).toBe(50)
    expect(body.data.offset).toBe(0)
    expect(body.data.stats).toEqual({
      total: 2,
      success: 1,
      failed: 0,
      running: 1,
    })
  })

  it('filters the history by status', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/run?status=completed'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.instances).toHaveLength(1)
    expect(body.data.instances[0].id).toBe('instance_1')
    expect(body.data.total).toBe(1)
    // Stats always describe the full set, not the filtered view.
    expect(body.data.stats.total).toBe(2)
  })

  it('returns an empty list when the status matches nothing', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/run?status=failed'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.instances).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })

  it('applies limit and offset to the history', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/run?limit=1&offset=1'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.instances).toHaveLength(1)
    expect(body.data.instances[0].id).toBe('instance_2')
    expect(body.data.limit).toBe(1)
    expect(body.data.offset).toBe(1)
  })

  it('rejects a blank workflow id', async () => {
    const response = await GET(createGetRequest('/api/workflow//run'), {
      params: Promise.resolve({ id: '   ' }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })
})

describe('POST /api/workflow/[id]/run - additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRegisterWorkflow.mockReturnValue(undefined)
    mockExecuteInstance.mockResolvedValue({ success: true })
    mockCreateInstance.mockImplementation((workflowId: string) => ({
      id: 'instance_abc',
      workflowId,
      status: 'running',
      metadata: { startedAt: '2026-01-01T00:00:00.000Z' },
    }))
  })

  it('registers the workflow, creates an instance and returns the run envelope', async () => {
    const response = await POST(
      createPostRequest(JSON.stringify({ inputs: { query: 'hi' }, userId: 'user_7' })),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.instanceId).toBe('instance_abc')
    expect(body.data.workflowId).toBe('wf_1')
    expect(body.data.status).toBe('running')
    expect(body.data.metadata).toEqual({ startedAt: '2026-01-01T00:00:00.000Z' })

    expect(mockRegisterWorkflow).toHaveBeenCalledTimes(1)
    const registered = mockRegisterWorkflow.mock.calls[0][0]
    expect(registered.id).toBe('wf_1')
    expect(registered.nodes).toHaveLength(3)
    expect(registered.edges).toHaveLength(2)

    expect(mockCreateInstance).toHaveBeenCalledWith('wf_1', { query: 'hi' }, {
      triggeredBy: 'user_7',
      triggerType: 'manual',
    })
    expect(mockExecuteInstance).toHaveBeenCalledWith('instance_abc')
  })

  it('falls back to system/manual when userId and triggerType are omitted', async () => {
    await POST(createPostRequest(JSON.stringify({})), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockCreateInstance).toHaveBeenCalledWith('wf_1', undefined, {
      triggeredBy: 'system',
      triggerType: 'manual',
    })
  })

  it('honours the triggerType from the request body', async () => {
    await POST(createPostRequest(JSON.stringify({ triggerType: 'api' })), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockCreateInstance).toHaveBeenCalledWith('wf_1', undefined, {
      triggeredBy: 'system',
      triggerType: 'api',
    })
  })

  it('returns an error response when the body is not valid JSON', async () => {
    const response = await POST(createPostRequest('{not-json'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(mockCreateInstance).not.toHaveBeenCalled()
  })

  it('returns an error response when the engine fails to create the instance', async () => {
    mockCreateInstance.mockImplementation(() => {
      throw new Error('instance creation failed')
    })

    const response = await POST(createPostRequest(JSON.stringify({})), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })

  it('still returns 200 when the asynchronous execution fails', async () => {
    mockExecuteInstance.mockRejectedValue(new Error('node blew up'))

    const response = await POST(createPostRequest(JSON.stringify({})), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    // The execution is fire-and-forget: a rejection must not fail the request.
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('rejects a blank workflow id before touching the engine', async () => {
    const response = await POST(createPostRequest(JSON.stringify({})), {
      params: Promise.resolve({ id: '' }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockRegisterWorkflow).not.toHaveBeenCalled()
  })
})
