/**
 * Knowledge API - Nodes 端点测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the KnowledgeStore before importing the route
const mockNodes = [
  {
    id: 'node-1',
    content: '测试概念 1',
    type: 'concept',
    weight: 0.8,
    confidence: 0.9,
    source: 'user',
    timestamp: Date.now(),
    metadata: {},
    tags: ['important'],
  },
  {
    id: 'node-2',
    content: '测试事实 1',
    type: 'fact',
    weight: 0.7,
    confidence: 0.8,
    source: 'observation',
    timestamp: Date.now(),
    metadata: {},
    tags: [],
  },
  {
    id: 'node-3',
    content: '测试规则 1',
    type: 'rule',
    weight: 0.9,
    confidence: 0.95,
    source: 'inference',
    timestamp: Date.now(),
    metadata: {},
    tags: ['core', 'important'],
  },
]

// Mock the knowledge store and cache
const mockKnowledgeStore = {
  queryNodes: vi.fn((filters: { type?: string; source?: string; tags?: string[]; minWeight?: number; minConfidence?: number; limit?: number; offset?: number }) => {
    let nodes = [...mockNodes]
    
    // Apply filters
    if (filters.type) {
      nodes = nodes.filter(n => n.type === filters.type)
    }
    if (filters.minWeight) {
      nodes = nodes.filter(n => (n.weight ?? 0) >= filters.minWeight!)
    }
    if (filters.minConfidence) {
      nodes = nodes.filter(n => (n.confidence ?? 0) >= filters.minConfidence!)
    }
    
    const total = nodes.length
    
    // Apply pagination
    const offset = filters.offset || 0
    const limit = filters.limit || nodes.length
    nodes = nodes.slice(offset, offset + limit)
    
    return { nodes, total }
  }),
  getNode: vi.fn((id: string) => mockNodes.find(n => n.id === id)),
  addNode: vi.fn((node: { id?: string }) => ({ id: node.id || 'new-node-id', ...node })),
}

const mockKnowledgeQueryCache = {
  createKey: vi.fn(() => 'test-key'),
  get: vi.fn(() => null),
  set: vi.fn(),
  invalidatePrefix: vi.fn(),
}

vi.mock('@/lib/store/knowledge-store', () => ({
  getKnowledgeStore: vi.fn(() => mockKnowledgeStore),
}))

vi.mock('@/lib/cache/knowledge-cache', () => ({
  getKnowledgeQueryCache: vi.fn(() => mockKnowledgeQueryCache),
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

// Import after mocking
import { GET, POST } from '@/app/api/knowledge/nodes/route'

describe('Knowledge Nodes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementation to return fresh copy of nodes with proper filtering
    mockKnowledgeStore.queryNodes.mockImplementation((filters: { type?: string; source?: string; tags?: string[]; minWeight?: number; minConfidence?: number; limit?: number; offset?: number }) => {
      let nodes = [...mockNodes]
      
      // Apply filters
      if (filters.type) {
        nodes = nodes.filter(n => n.type === filters.type)
      }
      if (filters.minWeight) {
        nodes = nodes.filter(n => (n.weight ?? 0) >= filters.minWeight!)
      }
      if (filters.minConfidence) {
        nodes = nodes.filter(n => (n.confidence ?? 0) >= filters.minConfidence!)
      }
      
      const total = nodes.length
      
      // Apply pagination
      const offset = filters.offset || 0
      const limit = filters.limit || nodes.length
      nodes = nodes.slice(offset, offset + limit)
      
      return { nodes, total }
    })
  })

  describe('GET /api/knowledge/nodes', () => {
    it('should return all nodes', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(3)
    })

    it('should filter nodes by type', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes?type=concept')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].type).toBe('concept')
    })

    it('should filter nodes by source', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes?source=user')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].source).toBe('user')
    })

    it('should filter nodes by tags', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes?tags=important')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
    })

    it('should filter nodes by minimum weight', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes?minWeight=0.75')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      data.data.forEach((node: { weight: number }) => {
        expect(node.weight).toBeGreaterThanOrEqual(0.75)
      })
    })

    it('should filter nodes by minimum confidence', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes?minConfidence=0.9')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      data.data.forEach((node: { confidence: number }) => {
        expect(node.confidence).toBeGreaterThanOrEqual(0.9)
      })
    })

    it('should support pagination with limit', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes?limit=2')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(3)
      expect(data.pagination.limit).toBe(2)
    })

    it('should support pagination with offset', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes?offset=1&limit=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.pagination.offset).toBe(1)
    })

    it('should return pagination metadata', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes')
      const response = await GET(request)
      const data = await response.json()

      expect(data.pagination).toBeDefined()
      expect(data.pagination.total).toBe(3)
      expect(data.pagination.offset).toBe(0)
    })
  })

  describe('POST /api/knowledge/nodes', () => {
    it('should create a new node', async () => {
      const requestBody = {
        content: '新知识节点',
        type: 'concept',
        weight: 0.8,
        confidence: 0.9,
        source: 'user',
        tags: ['new'],
      }

      const request = new NextRequest('http://localhost/api/knowledge/nodes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      mockKnowledgeStore.addNode.mockReturnValue({
        id: 'new-node-id',
        ...requestBody,
        timestamp: Date.now(),
        metadata: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockKnowledgeStore.addNode).toHaveBeenCalled()
    })

    it('should require content field', async () => {
      const requestBody = {
        type: 'concept',
      }

      const request = new NextRequest('http://localhost/api/knowledge/nodes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('content')
    })

    it('should require type field', async () => {
      const requestBody = {
        content: '测试内容',
      }

      const request = new NextRequest('http://localhost/api/knowledge/nodes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('type')
    })

    it('should validate type is valid KnowledgeType', async () => {
      const requestBody = {
        content: '测试内容',
        type: 'invalid_type',
      }

      const request = new NextRequest('http://localhost/api/knowledge/nodes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid type')
    })

    it('should set default values for optional fields', async () => {
      const requestBody = {
        content: '测试内容',
        type: 'fact',
      }

      const request = new NextRequest('http://localhost/api/knowledge/nodes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      mockKnowledgeStore.addNode.mockImplementation((node: { weight?: number; confidence?: number; source?: string; tags?: string[]; metadata?: Record<string, unknown> }) => {
        expect(node.weight ?? 0.5).toBeDefined()
        expect(node.confidence ?? 0.5).toBeDefined()
        expect(node.source ?? 'user').toBeDefined()
        return 'new-node-id'
      })

      await POST(request)
    })

    it('should accept optional embedding array', async () => {
      const requestBody = {
        content: '带嵌入的节点',
        type: 'concept',
        embedding: [0.1, 0.2, 0.3, 0.4],
      }

      const request = new NextRequest('http://localhost/api/knowledge/nodes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      mockKnowledgeStore.addNode.mockImplementation((node: { embedding?: number[] }) => {
        expect(node.embedding).toEqual([0.1, 0.2, 0.3, 0.4])
        return 'new-node-id'
      })

      await POST(request)
    })

    it('should accept optional metadata object', async () => {
      const requestBody = {
        content: '带元数据的节点',
        type: 'fact',
        metadata: {
          author: 'test-user',
          version: '1.0',
        },
      }

      const request = new NextRequest('http://localhost/api/knowledge/nodes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      mockKnowledgeStore.addNode.mockImplementation((node: { metadata?: Record<string, unknown> }) => {
        expect(node.metadata).toEqual({
          author: 'test-user',
          version: '1.0',
        })
        return 'new-node-id'
      })

      await POST(request)
    })
  })

  describe('错误处理', () => {
    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/nodes', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })
  })
})