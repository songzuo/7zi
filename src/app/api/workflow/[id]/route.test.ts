/**
 * Workflow [id] API Tests
 *
 * Covers:
 * - GET    /api/workflow/[id]   (detail + cache)
 * - PUT    /api/workflow/[id]   (update + validation)
 * - DELETE /api/workflow/[id]   (delete + 404)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockDb, dbRows, mockVersionService } = vi.hoisted(() => {
  const dbRows: Record<string, Record<string, unknown>> = {}

  const mockDb = {
    get: vi.fn((sql: string, params?: unknown[]) => {
      const id = params?.[0] as string | undefined
      if (!id) return null
      if (/SELECT id FROM workflows/i.test(sql)) {
        return dbRows[id] ? { id } : null
      }
      return dbRows[id] ?? null
    }),
    exec: vi.fn((sql: string, params?: unknown[]) => {
      const rawId = params?.[params.length - 1]
      const id = typeof rawId === 'string' ? rawId : undefined
      if (!id) return { changes: 0 }
      if (/UPDATE workflows/i.test(sql)) {
        if (!dbRows[id]) return { changes: 0 }
        dbRows[id] = {
          ...dbRows[id],
          name: params?.[0],
          description: params?.[1],
          status: params?.[2],
          nodes: params?.[3],
          edges: params?.[4],
          config: params?.[5],
          updated_at: params?.[6],
          updated_by: params?.[7],
          version: ((dbRows[id]!.version as number) || 1) + 1,
        }
        return { changes: 1 }
      }
      if (/DELETE FROM workflows/i.test(sql)) {
        if (!dbRows[id]) return { changes: 0 }
        delete dbRows[id]
        return { changes: 1 }
      }
      return { changes: 0 }
    }),
  }

  const mockVersionService = {
    getVersionSettings: vi.fn(async (workflowId: string) => ({
      workflowId,
      maxVersions: 50,
      autoVersionOnUpdate: false,
      retentionDays: 90,
    })),
    createVersion: vi.fn(async (workflow: Record<string, unknown>) => ({
      id: 'ver_created',
      workflowId: workflow.id,
      versionNumber: 1,
      name: workflow.name,
      changeType: 'update',
      createdBy: 'system',
      createdAt: '2026-01-01T00:00:00.000Z',
    })),
    deleteAllVersions: vi.fn(async () => undefined),
  }

  return { mockDb, dbRows, mockVersionService }
})

vi.mock('@/lib/db/connection', () => ({
  getDatabase: () => mockDb,
  getDatabaseAsync: async () => mockDb,
}))

vi.mock('@/lib/workflow/version-service', () => ({
  workflowVersionService: mockVersionService,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

import { GET, PUT, DELETE } from './route'

function createRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  } as any)
}

function seedWorkflow(id: string, overrides: Record<string, unknown> = {}) {
  dbRows[id] = {
    id,
    name: '已存在的工作流',
    description: '描述',
    version: 1,
    status: 'active',
    nodes: JSON.stringify([{ id: 'node_1', type: 'start', name: '开始', position: { x: 0, y: 0 } }]),
    edges: JSON.stringify([]),
    config: JSON.stringify({ timeout: 3600 }),
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    created_by: 'user_1',
    updated_by: 'user_1',
    ...overrides,
  }
}

describe('Workflow [id] API', () => {
  beforeEach(() => {
    for (const key of Object.keys(dbRows)) delete dbRows[key]
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/workflow/[id]', () => {
    it('should return the workflow detail with parsed JSON fields', async () => {
      seedWorkflow('wf_get_1')
      const request = createRequest('/api/workflow/wf_get_1')

      const response = await GET(request, { params: Promise.resolve({ id: 'wf_get_1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('wf_get_1')
      expect(data.data.name).toBe('已存在的工作流')
      expect(data.data.status).toBe('active')
      expect(data.data.nodes).toHaveLength(1)
      expect(data.data.nodes[0].id).toBe('node_1')
      expect(data.data.edges).toEqual([])
      expect(data.data.config.timeout).toBe(3600)
      expect(data.data.metadata.createdBy).toBe('user_1')
      expect(data.data.metadata.updatedAt).toBe('2026-01-02T00:00:00.000Z')
    })

    it('should return 404 for a nonexistent workflow', async () => {
      const request = createRequest('/api/workflow/wf_missing')

      const response = await GET(request, { params: Promise.resolve({ id: 'wf_missing' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('NOT_FOUND')
      expect(data.error.message).toBe('工作流不存在')
    })

    it('should serve the second request from cache without hitting the database', async () => {
      seedWorkflow('wf_cache_1')
      const params = { params: Promise.resolve({ id: 'wf_cache_1' }) }

      const first = await GET(createRequest('/api/workflow/wf_cache_1'), params)
      expect(first.status).toBe(200)

      const callsAfterFirst = mockDb.get.mock.calls.length
      const second = await GET(createRequest('/api/workflow/wf_cache_1'), params)
      const data = await second.json()

      expect(second.status).toBe(200)
      expect(data.data.id).toBe('wf_cache_1')
      expect(mockDb.get.mock.calls.length).toBe(callsAfterFirst)
    })
  })

  describe('PUT /api/workflow/[id]', () => {
    it('should update the workflow and bump the version', async () => {
      seedWorkflow('wf_put_1')
      const request = createRequest('/api/workflow/wf_put_1', 'PUT', {
        name: '更新后的工作流',
        description: '新描述',
        status: 'draft',
        nodes: [
          { id: 'node_1', type: 'start', name: '开始', position: { x: 0, y: 0 } },
          { id: 'node_2', type: 'end', name: '结束', position: { x: 10, y: 0 } },
        ],
        edges: [
          { id: 'edge_1', source: 'node_1', target: 'node_2', type: 'sequence' },
        ],
        config: { timeout: 120 },
        userId: 'user_2',
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'wf_put_1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('更新后的工作流')
      expect(data.data.status).toBe('draft')
      expect(data.data.version).toBe(2)
      expect(data.data.updated_by).toBe('user_2')
      expect(data.data.nodes).toContain('node_1')
      expect(data.data.edges).toContain('edge_1')
      expect(data.data.config).toContain('timeout')
    })

    it('should return 404 when updating a nonexistent workflow', async () => {
      const request = createRequest('/api/workflow/wf_nope', 'PUT', { name: 'x' })

      const response = await PUT(request, { params: Promise.resolve({ id: 'wf_nope' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('NOT_FOUND')
      expect(data.error.message).toBe('工作流不存在')
    })

    it('should return 400 when the updated workflow fails validation', async () => {
      seedWorkflow('wf_put_bad')
      const request = createRequest('/api/workflow/wf_put_bad', 'PUT', {
        name: '缺节点的工作流',
        nodes: [],
        edges: [],
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'wf_put_bad' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('工作流验证失败')
      expect(data.error.details.errors).toContain('工作流必须包含至少一个节点')
    })
  })

  describe('DELETE /api/workflow/[id]', () => {
    it('should delete the workflow and clean up versions', async () => {
      seedWorkflow('wf_del_1')
      const request = createRequest('/api/workflow/wf_del_1', 'DELETE')

      const response = await DELETE(request, { params: Promise.resolve({ id: 'wf_del_1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('wf_del_1')
      expect(data.data.message).toBe('工作流已删除')
      expect(mockVersionService.deleteAllVersions).toHaveBeenCalledWith('wf_del_1')
    })

    it('should return 404 when deleting a nonexistent workflow', async () => {
      const request = createRequest('/api/workflow/wf_gone', 'DELETE')

      const response = await DELETE(request, { params: Promise.resolve({ id: 'wf_gone' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('NOT_FOUND')
      expect(data.error.message).toBe('工作流不存在')
    })
  })
})
