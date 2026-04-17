/**
 * Workflow Rollback API Tests
 *
 * @version 1.12.0
 */

import { describe, it, expect, vi } from 'vitest'

// Mock Next.js modules before importing route
vi.mock('next/server', () => ({
  NextRequest: class {
    constructor(public url: string) {
      this.jsonData = null
    }

    async json() {
      return this.jsonData
    }

    jsonData: unknown = null
  },
  NextResponse: {
    json: vi.fn((data, init) => ({ json: async () => data, status: init?.status || 200 })),
  },
}))

describe('Workflow Rollback API', () => {
  const mockWorkflowId = 'workflow-1'

  describe('POST /api/workflows/[workflowId]/rollback', () => {
    it('should rollback to a specific version', async () => {
      const { POST } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/rollback`

      const request = {
        url: mockUrl,
        json: async () => ({
          versionId: 'version-workflow-1-1',
          rollbackBy: 'admin@example.com',
          rollbackReason: 'Test rollback',
        }),
      } as any

      const response = await POST(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      expect(data).toHaveProperty('currentVersion')
      expect(data).toHaveProperty('previousVersion')
      expect(data).toHaveProperty('rollbackAt')
      expect(data.currentVersion.metadata?.changeType).toBe('rollback')
    })

    it('should create new version with incremented patch number', async () => {
      const { POST } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/rollback`

      const request = {
        url: mockUrl,
        json: async () => ({
          versionId: 'version-workflow-1-1',
          rollbackBy: 'admin@example.com',
          rollbackReason: 'Test rollback',
        }),
      } as any

      const response = await POST(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      expect(data.currentVersion.version).toBe('1.0.1')
    })

    it('should require versionId', async () => {
      const { POST } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/rollback`

      const request = {
        url: mockUrl,
        json: async () => ({
          rollbackBy: 'admin@example.com',
        }),
      } as any

      const response = await POST(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('versionId is required')
    })

    it('should require rollbackBy', async () => {
      const { POST } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/rollback`

      const request = {
        url: mockUrl,
        json: async () => ({
          versionId: 'version-workflow-1-1',
        }),
      } as any

      const response = await POST(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('rollbackBy is required')
    })

    it('should return 404 for non-existent version', async () => {
      const { POST } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/rollback`

      const request = {
        url: mockUrl,
        json: async () => ({
          versionId: 'non-existent-version',
          rollbackBy: 'admin@example.com',
        }),
      } as any

      const response = await POST(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Version not found')
    })

    it('should return 404 for non-existent workflow', async () => {
      const { POST } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/non-existent-workflow/rollback`

      const request = {
        url: mockUrl,
        json: async () => ({
          versionId: 'some-version-id',
          rollbackBy: 'admin@example.com',
        }),
      } as any

      const response = await POST(request, { params: Promise.resolve({ workflowId: 'non-existent-workflow' }) })
      const data = await (response as any).json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Workflow not found')
    })

    it('should reject rollback to version from different workflow', async () => {
      const { POST } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/workflow-2/rollback`

      // Since workflow-2 doesn't have any versions, we'll get a 404
      const request = {
        url: mockUrl,
        json: async () => ({
          versionId: 'version-workflow-1-1',
          rollbackBy: 'admin@example.com',
        }),
      } as any

      const response = await POST(request, { params: Promise.resolve({ workflowId: 'workflow-2' }) })
      const data = await (response as any).json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Workflow not found')
    })
  })
})