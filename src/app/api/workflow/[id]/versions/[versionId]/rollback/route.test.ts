/**
 * Workflow Version Rollback API Tests
 *
 * Covers:
 * - POST /api/workflow/[id]/versions/[versionId]/rollback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockVersionService } = vi.hoisted(() => ({
  mockVersionService: {
    getVersion: vi.fn(),
    rollbackToVersion: vi.fn(),
  },
}))

vi.mock('@/lib/workflow/version-service', () => ({
  workflowVersionService: mockVersionService,
}))

vi.mock('@/lib/logger', () => ({
  logger: { auth: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

import { POST } from './route'

function createRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  } as any)
}

const targetVersion = {
  id: 'ver_target',
  workflowId: 'wf_1',
  versionNumber: 3,
  name: '目标版本',
  description: '目标版本描述',
  status: 'active',
  nodes: [
    { id: 'node_1', type: 'start', name: '开始', position: { x: 0, y: 0 } },
    { id: 'node_2', type: 'end', name: '结束', position: { x: 10, y: 0 } },
  ],
  edges: [
    { id: 'edge_1', source: 'node_1', target: 'node_2', type: 'sequence' },
  ],
  config: { timeout: 3600 },
  changeType: 'update',
  createdBy: 'user_1',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const rollbackSnapshot = {
  id: 'ver_new_snapshot',
  workflowId: 'wf_1',
  versionNumber: 4,
  name: '目标版本',
  status: 'active',
  nodes: targetVersion.nodes,
  edges: targetVersion.edges,
  config: targetVersion.config,
  changeType: 'rollback',
  createdBy: 'user_9',
  createdAt: '2026-02-01T00:00:00.000Z',
}

describe('POST /api/workflow/[id]/versions/[versionId]/rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVersionService.getVersion.mockResolvedValue(targetVersion)
    mockVersionService.rollbackToVersion.mockResolvedValue(rollbackSnapshot)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should roll back to the target version and return the restored snapshot', async () => {
    const request = createRequest('/api/workflow/wf_1/versions/ver_target/rollback', { userId: 'user_9' })

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', versionId: 'ver_target' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toBe('Successfully rolled back to version 3')
    expect(data.data.rollbackFromVersion).toBe(3)
    expect(data.data.newVersion).toBe(4)
    expect(data.data.newVersionId).toBe('ver_new_snapshot')
    expect(data.data.restoredData.nodes).toHaveLength(2)
    expect(data.data.restoredData.edges).toHaveLength(1)
    expect(data.data.restoredData.config.timeout).toBe(3600)

    expect(mockVersionService.rollbackToVersion).toHaveBeenCalledWith('wf_1', 'ver_target', {
      createdBy: 'user_9',
    })
  })

  it('should default createdBy to system when no userId is provided', async () => {
    const request = createRequest('/api/workflow/wf_1/versions/ver_target/rollback', {})

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', versionId: 'ver_target' }),
    })

    expect(response.status).toBe(200)
    expect(mockVersionService.rollbackToVersion).toHaveBeenCalledWith('wf_1', 'ver_target', {
      createdBy: 'system',
    })
  })

  it('should return 404 when the version does not exist', async () => {
    mockVersionService.getVersion.mockResolvedValue(null)

    const request = createRequest('/api/workflow/wf_1/versions/ver_missing/rollback', {})

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', versionId: 'ver_missing' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('NOT_FOUND')
    expect(data.error.message).toBe('Version not found')
    expect(mockVersionService.rollbackToVersion).not.toHaveBeenCalled()
  })

  it('should return 404 when the version belongs to a different workflow', async () => {
    mockVersionService.getVersion.mockResolvedValue({ ...targetVersion, workflowId: 'wf_other' })

    const request = createRequest('/api/workflow/wf_1/versions/ver_target/rollback', {})

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', versionId: 'ver_target' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('NOT_FOUND')
    expect(data.error.message).toBe('Version not found')
    expect(mockVersionService.rollbackToVersion).not.toHaveBeenCalled()
  })

  it('should return 404 when the service throws a not-found error', async () => {
    mockVersionService.getVersion.mockResolvedValue(targetVersion)
    mockVersionService.rollbackToVersion.mockRejectedValue(new Error('Version not found'))

    const request = createRequest('/api/workflow/wf_1/versions/ver_target/rollback', {})

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', versionId: 'ver_target' }),
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('NOT_FOUND')
    expect(data.error.message).toBe('Version not found')
  })

  it('should return 500 when the rollback fails with an unexpected error', async () => {
    mockVersionService.getVersion.mockResolvedValue(targetVersion)
    mockVersionService.rollbackToVersion.mockRejectedValue(new Error('database is locked'))

    const request = createRequest('/api/workflow/wf_1/versions/ver_target/rollback', {})

    const response = await POST(request, {
      params: Promise.resolve({ id: 'wf_1', versionId: 'ver_target' }),
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('database is locked')
  })
})
