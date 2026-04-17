/**
 * Workflow Version History API Tests
 *
 * @version 1.12.0
 */

import { describe, it, expect, vi } from 'vitest'

// Mock Next.js modules before importing the route
vi.mock('next/server', () => ({
  NextRequest: class {
    constructor(public url: string) {}
  },
  NextResponse: {
    json: vi.fn((data, init) => ({ json: async () => data, status: init?.status || 200 })),
  },
}))

describe('Workflow Version History API', () => {
  const mockWorkflowId = 'workflow-1'

  describe('GET /api/workflows/[workflowId]/versions', () => {
    it('should return version history with correct structure', async () => {
      // Import the route module
      const { GET } = await import('../route')

      // Create a mock NextRequest-like object
      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/versions`
      const request = { url: mockUrl } as any

      const response = await GET(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      expect(data).toHaveProperty('versions')
      expect(data).toHaveProperty('total')
      expect(data).toHaveProperty('page')
      expect(data).toHaveProperty('pageSize')
      expect(Array.isArray(data.versions)).toBe(true)
    })

    it('should support pagination parameters', async () => {
      const { GET } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/versions?page=1&pageSize=2`
      const request = { url: mockUrl } as any

      const response = await GET(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      expect(data.page).toBe(1)
      expect(data.pageSize).toBe(2)
    })

    it('should return versions sorted by createdAt descending', async () => {
      const { GET } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/versions`
      const request = { url: mockUrl } as any

      const response = await GET(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      const versions = data.versions as any[]
      for (let i = 0; i < versions.length - 1; i++) {
        const current = new Date(versions[i].createdAt).getTime()
        const next = new Date(versions[i + 1].createdAt).getTime()
        expect(current).toBeGreaterThanOrEqual(next)
      }
    })

    it('should filter by changeType', async () => {
      const { GET } = await import('../route')

      const mockUrl = `http://localhost:3000/api/workflows/${mockWorkflowId}/versions?changeType=rollback`
      const request = { url: mockUrl } as any

      const response = await GET(request, { params: Promise.resolve({ workflowId: mockWorkflowId }) })
      const data = await (response as any).json()

      data.versions.forEach((version: any) => {
        expect(version.metadata?.changeType).toBe('rollback')
      })
    })
  })
})