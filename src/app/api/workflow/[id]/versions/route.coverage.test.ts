/**
 * Workflow Versions API Route - additional coverage
 *
 * Covers the branches that the existing suites do not reach:
 *   - GET  /api/workflow/[id]/versions: list, pagination echo, validation, error
 *   - POST /api/workflow/[id]/versions: create, validation failures, error
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetVersions, mockCreateVersion } = vi.hoisted(() => ({
  mockGetVersions: vi.fn(),
  mockCreateVersion: vi.fn(),
}))

vi.mock('@/lib/workflow/version-service', () => ({
  workflowVersionService: {
    getVersions: (...args: unknown[]) => mockGetVersions(...args),
    createVersion: (...args: unknown[]) => mockCreateVersion(...args),
  },
}))

import { GET, POST } from './route'

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method: 'GET' })
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/workflow/wf_1/versions', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('GET /api/workflow/[id]/versions - additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetVersions.mockResolvedValue({ versions: [{ id: 'v1' }], total: 1 })
  })

  it('returns the version list and echoes the pagination parameters', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/versions'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.versions).toHaveLength(1)
    expect(body.data.total).toBe(1)
    expect(body.data.limit).toBe(50)
    expect(body.data.offset).toBe(0)
    expect(mockGetVersions).toHaveBeenCalledWith('wf_1', { limit: 50, offset: 0 })
  })

  it('forwards custom limit and offset values', async () => {
    await GET(createGetRequest('/api/workflow/wf_1/versions?limit=10&offset=5'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(mockGetVersions).toHaveBeenCalledWith('wf_1', { limit: 10, offset: 5 })
  })

  it('rejects a limit above 1000', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/versions?limit=1001'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockGetVersions).not.toHaveBeenCalled()
  })

  it('rejects a limit below 1', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/versions?limit=0'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(400)
    expect(mockGetVersions).not.toHaveBeenCalled()
  })

  it('rejects a negative offset', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/versions?offset=-1'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(400)
    expect(mockGetVersions).not.toHaveBeenCalled()
  })

  it('rejects a non-numeric limit', async () => {
    const response = await GET(createGetRequest('/api/workflow/wf_1/versions?limit=abc'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(400)
    expect(mockGetVersions).not.toHaveBeenCalled()
  })

  it('returns an error response when the service fails', async () => {
    mockGetVersions.mockRejectedValue(new Error('list failed'))

    const response = await GET(createGetRequest('/api/workflow/wf_1/versions'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })
})

describe('POST /api/workflow/[id]/versions - additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateVersion.mockResolvedValue({ id: 'v2', workflowId: 'wf_1', version: 1 })
  })

  it('creates a version and returns 201', async () => {
    const response = await POST(
      createPostRequest({ name: 'My workflow', nodes: [], edges: [] }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('v2')

    const [workflowData, options] = mockCreateVersion.mock.calls[0]
    expect(workflowData.id).toBe('wf_1')
    expect(workflowData.name).toBe('My workflow')
    expect(workflowData.status).toBe('draft')
    expect(workflowData.version).toBe(1)
    expect(workflowData.metadata.createdBy).toBe('system')
    expect(options.changeType).toBe('update')
    expect(options.createdBy).toBe('system')
  })

  it('uses the provided userId and changeSummary', async () => {
    await POST(
      createPostRequest({
        name: 'My workflow',
        nodes: [],
        edges: [],
        userId: 'user_9',
        changeSummary: 'initial',
        changeType: 'create',
        description: 'desc',
      }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )

    const [workflowData, options] = mockCreateVersion.mock.calls[0]
    expect(workflowData.description).toBe('desc')
    expect(workflowData.metadata.updatedBy).toBe('user_9')
    expect(options.changeSummary).toBe('initial')
    expect(options.changeType).toBe('create')
    expect(options.createdBy).toBe('user_9')
  })

  it('rejects a body without a name', async () => {
    const response = await POST(createPostRequest({ nodes: [], edges: [] }), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(mockCreateVersion).not.toHaveBeenCalled()
  })

  it('rejects a body whose nodes are not an array', async () => {
    const response = await POST(createPostRequest({ name: 'w', nodes: 'nope', edges: [] }), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(400)
    expect(mockCreateVersion).not.toHaveBeenCalled()
  })

  it('rejects a body whose edges are not an array', async () => {
    const response = await POST(createPostRequest({ name: 'w', nodes: [], edges: {} }), {
      params: Promise.resolve({ id: 'wf_1' }),
    })

    expect(response.status).toBe(400)
    expect(mockCreateVersion).not.toHaveBeenCalled()
  })

  it('returns an error response when the body is malformed JSON', async () => {
    const response = await POST(createPostRequest('{broken'), {
      params: Promise.resolve({ id: 'wf_1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })

  it('returns an error response when the service fails', async () => {
    mockCreateVersion.mockRejectedValue(new Error('create failed'))

    const response = await POST(
      createPostRequest({ name: 'My workflow', nodes: [], edges: [] }),
      { params: Promise.resolve({ id: 'wf_1' }) }
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })
})
