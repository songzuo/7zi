/**
 * Knowledge API - Edges 端点测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/knowledge/edges/route'

// Mock the KnowledgeLattice
const mockNodes = [
  { id: 'node-1', content: 'Node 1', type: 'concept', weight: 0.8, confidence: 0.9, source: 'user', timestamp: Date.now(), metadata: {} },
  { id: 'node-2', content: 'Node 2', type: 'concept', weight: 0.7, confidence: 0.8, source: 'user', timestamp: Date.now(), metadata: {} },
  { id: 'node-3', content: 'Node 3', type: 'fact', weight: 0.6, confidence: 0.7, source: 'observation', timestamp: Date.now(), metadata: {} },
]

const mockEdges = [
  {
    id: 'edge-1',
    from: 'node-1',
    to: 'node-2',
    type: 'association',
    weight: 0.9,
    timestamp: Date.now(),
  },
  {
    id: 'edge-2',
    from: 'node-2',
    to: 'node-3',
    type: 'causal',
    weight: 0.8,
    timestamp: Date.now(),
  },
  {
    id: 'edge-3',
    from: 'node-1',
    to: 'node-3',
    type: 'association',
    weight: 0.7,
    timestamp: Date.now(),
  },
]

const mockLatticeInstance = {
  getAllNodes: vi.fn(() => mockNodes),
  getAllEdges: vi.fn(() => mockEdges),
  getNode: vi.fn((id: string) => mockNodes.find(n => n.id === id)),
  getEdge: vi.fn((id: string) => mockEdges.find(e => e.id === id)),
  addEdge: vi.fn((edge: { id?: string }) => edge.id || 'new-edge-id'),
}

vi.mock('@/lib/agents/knowledge-lattice', () => ({
  KnowledgeLattice: vi.fn(() => mockLatticeInstance),
  RelationType: {
    PARTIAL_ORDER: 'partial-order',
    EQUIVALENCE: 'equivalence',
    COMPLEMENT: 'complement',
    ASSOCIATION: 'association',
    CAUSAL: 'causal',
  },
}))

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    audit: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}))

describe('Knowledge Edges API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLatticeInstance.getAllEdges.mockReturnValue([...mockEdges])
    mockLatticeInstance.getAllNodes.mockReturnValue([...mockNodes])
  })

  describe('GET /api/knowledge/edges', () => {
    it('should return all edges', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(3)
    })

    it('should filter edges by type', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges?type=association')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      data.data.forEach((edge: { type: string }) => {
        expect(edge.type).toBe('association')
      })
    })

    it('should filter edges by source node (from)', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges?from=node-1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      data.data.forEach((edge: { from: string }) => {
        expect(edge.from).toBe('node-1')
      })
    })

    it('should filter edges by target node (to)', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges?to=node-3')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      data.data.forEach((edge: { to: string }) => {
        expect(edge.to).toBe('node-3')
      })
    })

    it('should filter edges by minimum weight', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges?minWeight=0.8')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      data.data.forEach((edge: { weight: number }) => {
        expect(edge.weight).toBeGreaterThanOrEqual(0.8)
      })
    })

    it('should support pagination with limit', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges?limit=2')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(3)
      expect(data.pagination.limit).toBe(2)
    })

    it('should support pagination with offset', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges?offset=1&limit=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.pagination.offset).toBe(1)
    })

    it('should return pagination metadata', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges')
      const response = await GET(request)
      const data = await response.json()

      expect(data.pagination).toBeDefined()
      expect(data.pagination.total).toBe(3)
      expect(data.pagination.offset).toBe(0)
    })

    it('should combine multiple filters', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges?from=node-1&type=association')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
    })
  })

  describe('POST /api/knowledge/edges', () => {
    it('should create a new edge', async () => {
      const requestBody = {
        from: 'node-1',
        to: 'node-2',
        type: 'association',
        weight: 0.85,
      }

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      mockLatticeInstance.addEdge.mockReturnValue('new-edge-id')
      mockLatticeInstance.getEdge.mockReturnValue({
        id: 'new-edge-id',
        ...requestBody,
        timestamp: Date.now(),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockLatticeInstance.addEdge).toHaveBeenCalled()
    })

    it('should require from field', async () => {
      const requestBody = {
        to: 'node-2',
        type: 'association',
      }

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('from')
    })

    it('should require to field', async () => {
      const requestBody = {
        from: 'node-1',
        type: 'association',
      }

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('to')
    })

    it('should require type field', async () => {
      const requestBody = {
        from: 'node-1',
        to: 'node-2',
      }

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('type')
    })

    it('should validate type is valid RelationType', async () => {
      const requestBody = {
        from: 'node-1',
        to: 'node-2',
        type: 'invalid_type',
      }

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid type')
    })

    it('should return 404 if source node does not exist', async () => {
      const requestBody = {
        from: 'non-existent-node',
        to: 'node-2',
        type: 'association',
      }

      mockLatticeInstance.getNode.mockImplementation((id: string) => {
        if (id === 'non-existent-node') return undefined
        return mockNodes.find(n => n.id === id)
      })

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Source node not found')
    })

    it('should return 404 if target node does not exist', async () => {
      const requestBody = {
        from: 'node-1',
        to: 'non-existent-node',
        type: 'association',
      }

      mockLatticeInstance.getNode.mockImplementation((id: string) => {
        if (id === 'non-existent-node') return undefined
        return mockNodes.find(n => n.id === id)
      })

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Target node not found')
    })

    it('should set default weight if not provided', async () => {
      const requestBody = {
        from: 'node-1',
        to: 'node-2',
        type: 'causal',
      }

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      mockLatticeInstance.addEdge.mockImplementation((edge: { weight?: number }) => {
        expect(edge.weight ?? 0.5).toBeDefined()
        return 'new-edge-id'
      })

      await POST(request)
    })

    it('should accept optional metadata', async () => {
      const requestBody = {
        from: 'node-1',
        to: 'node-2',
        type: 'association',
        metadata: {
          createdBy: 'test-user',
          confidence: 0.95,
        },
      }

      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      mockLatticeInstance.addEdge.mockImplementation((edge: { metadata?: Record<string, unknown> }) => {
        expect(edge.metadata).toEqual({
          createdBy: 'test-user',
          confidence: 0.95,
        })
        return 'new-edge-id'
      })

      await POST(request)
    })
  })

  describe('错误处理', () => {
    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/edges', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })
  })
})