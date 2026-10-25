/**
 * Workflow Version Detail API Tests
 *
 * Covers:
 * - GET    /api/workflow/[id]/versions/[versionId]  (读取 + 归属校验)
 * - DELETE /api/workflow/[id]/versions/[versionId]  (禁止直接删除)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockVersionService } = vi.hoisted(() => ({
  mockVersionService: {
    getVersion: vi.fn(),
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

import { GET, DELETE } from './route'

function createRequest(url: string, method = 'GET'): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'), { method } as any)
}

const version = {
  id: 'ver_1',
  workflowId: 'wf_1',
  versionNumber: 2,
  name: '版本二',
  description: '描述',
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

describe('Workflow Version Detail API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVersionService.getVersion.mockResolvedValue(version)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/workflow/[id]/versions/[versionId]', () => {
    it('should return the requested version', async () => {
      const request = createRequest('/api/workflow/wf_1/versions/ver_1')

      const response = await GET(request, {
        params: Promise.resolve({ id: 'wf_1', versionId: 'ver_1' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('ver_1')
      expect(data.data.workflowId).toBe('wf_1')
      expect(data.data.versionNumber).toBe(2)
      expect(data.data.nodes).toHaveLength(2)
      expect(data.data.edges).toHaveLength(1)
      expect(data.data.config.timeout).toBe(3600)
    })

    it('should return 404 for a nonexistent version', async () => {
      mockVersionService.getVersion.mockResolvedValue(null)

      const request = createRequest('/api/workflow/wf_1/versions/ver_missing')

      const response = await GET(request, {
        params: Promise.resolve({ id: 'wf_1', versionId: 'ver_missing' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Version not found')
    })
  })

  describe('DELETE /api/workflow/[id]/versions/[versionId]', () => {
    it('should refuse direct deletion with 403', async () => {
      const request = createRequest('/api/workflow/wf_1/versions/ver_1', 'DELETE')

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'wf_1', versionId: 'ver_1' }),
      })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      // 403 必须配 FORBIDDEN 类型 —— 之前走 createErrorResponse(err, 403)
      // 会让 error.type 变成 INTERNAL_ERROR，与状态码语义不符。
      expect(data.error.type).toBe('FORBIDDEN')
      expect(data.error.message).toBe('Direct version deletion is not allowed. Use rollback instead.')
    })

    it('should return 404 when the version does not exist', async () => {
      mockVersionService.getVersion.mockResolvedValue(null)

      const request = createRequest('/api/workflow/wf_1/versions/ver_missing', 'DELETE')

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'wf_1', versionId: 'ver_missing' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Version not found')
    })

    it('should return 404 when the version belongs to another workflow', async () => {
      mockVersionService.getVersion.mockResolvedValue({ ...version, workflowId: 'wf_other' })

      const request = createRequest('/api/workflow/wf_1/versions/ver_1', 'DELETE')

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'wf_1', versionId: 'ver_1' }),
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Version not found')
    })
  })
})
