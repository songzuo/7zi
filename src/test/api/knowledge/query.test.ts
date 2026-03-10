/**
 * Knowledge API - Query 端点测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/knowledge/query/route'

// Mock the KnowledgeLattice
const mockNodes = [
  {
    id: 'node-1',
    content: '人工智能是计算机科学的一个分支',
    type: 'concept',
    weight: 0.9,
    confidence: 0.95,
    source: 'user',
    timestamp: Date.now(),
    metadata: {},
    tags: ['ai', 'computer-science'],
  },
  {
    id: 'node-2',
    content: '机器学习是人工智能的核心技术',
    type: 'fact',
    weight: 0.85,
    confidence: 0.9,
    source: 'observation',
    timestamp: Date.now(),
    metadata: {},
    tags: ['ai', 'machine-learning'],
  },
  {
    id: 'node-3',
    content: '深度学习规则：数据量越大，模型效果越好',
    type: 'rule',
    weight: 0.8,
    confidence: 0.85,
    source: 'inference',
    timestamp: Date.now(),
    metadata: {},
    tags: ['deep-learning', 'rule'],
  },
  {
    id: 'node-4',
    content: 'Python 是机器学习的主要编程语言',
    type: 'skill',
    weight: 0.75,
    confidence: 0.8,
    source: 'experience',
    timestamp: Date.now(),
    metadata: {},
    tags: ['python', 'programming'],
  },
  {
    id: 'node-5',
    content: '用户偏好使用 TypeScript 进行开发',
    type: 'preference',
    weight: 0.7,
    confidence: 0.75,
    source: 'user',
    timestamp: Date.now(),
    metadata: {},
    tags: ['typescript', 'preference'],
  },
]

const mockEdges = [
  { id: 'edge-1', from: 'node-1', to: 'node-2', type: 'association', weight: 0.9, timestamp: Date.now() },
  { id: 'edge-2', from: 'node-2', to: 'node-3', type: 'causal', weight: 0.8, timestamp: Date.now() },
  { id: 'edge-3', from: 'node-2', to: 'node-4', type: 'association', weight: 0.7, timestamp: Date.now() },
]

const mockLatticeInstance = {
  query: vi.fn(),
  getAllNodes: vi.fn(() => mockNodes),
  getAllEdges: vi.fn(() => mockEdges),
  getNode: vi.fn((id: string) => mockNodes.find(n => n.id === id)),
}

vi.mock('@/lib/agents/knowledge-lattice', () => ({
  KnowledgeLattice: vi.fn(() => mockLatticeInstance),
  KnowledgeType: {
    CONCEPT: 'concept',
    RULE: 'rule',
    EXPERIENCE: 'experience',
    SKILL: 'skill',
    FACT: 'fact',
    PREFERENCE: 'preference',
    MEMORY: 'memory',
  },
  KnowledgeSource: {
    USER: 'user',
    OBSERVATION: 'observation',
    INFERENCE: 'inference',
    EXTERNAL: 'external',
    EXPERIENCE: 'experience',
    EVOMAP: 'evomap',
  },
}))

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    audit: vi.fn(),
  },
}))

describe('Knowledge Query API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/knowledge/query', () => {
    describe('正常响应测试', () => {
      it('should execute basic query and return results', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: mockEdges,
          relevanceScores: [0.9, 0.85, 0.8, 0.75, 0.7],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.nodes).toHaveLength(5)
        expect(data.data.edges).toHaveLength(3)
        expect(data.data.relevanceScores).toHaveLength(5)
        expect(data.data.total).toBe(5)
      })

      it('should return nodes sorted by relevance', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0], mockNodes[1], mockNodes[2]],
          edges: [],
          relevanceScores: [0.7, 0.9, 0.8],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // 验证按相关性降序排列
        expect(data.data.relevanceScores[0]).toBe(0.9)
        expect(data.data.relevanceScores[1]).toBe(0.8)
        expect(data.data.relevanceScores[2]).toBe(0.7)
      })

      it('should return empty results when no nodes match', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [],
          edges: [],
          relevanceScores: [],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ type: 'nonexistent' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.nodes).toEqual([])
        expect(data.data.total).toBe(0)
      })
    })

    describe('过滤器测试', () => {
      it('should filter by type', async () => {
        const filteredNodes = [mockNodes[0], mockNodes[1]] // concept and fact
        mockLatticeInstance.query.mockReturnValue({
          nodes: filteredNodes,
          edges: [],
          relevanceScores: [0.9, 0.85],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ type: 'concept' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'concept' })
        )
      })

      it('should filter by source', async () => {
        const filteredNodes = [mockNodes[0], mockNodes[4]] // user source
        mockLatticeInstance.query.mockReturnValue({
          nodes: filteredNodes,
          edges: [],
          relevanceScores: [0.9, 0.7],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ source: 'user' }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ source: 'user' })
        )
      })

      it('should filter by tags (single tag)', async () => {
        const filteredNodes = [mockNodes[0], mockNodes[1]] // ai tag
        mockLatticeInstance.query.mockReturnValue({
          nodes: filteredNodes,
          edges: [],
          relevanceScores: [0.9, 0.85],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ tags: ['ai'] }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ tags: ['ai'] })
        )
      })

      it('should filter by tags (multiple tags as array)', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0]],
          edges: [],
          relevanceScores: [0.9],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ tags: ['ai', 'machine-learning'] }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ tags: ['ai', 'machine-learning'] })
        )
      })

      it('should filter by minWeight', async () => {
        const filteredNodes = [mockNodes[0], mockNodes[1]] // weight >= 0.85
        mockLatticeInstance.query.mockReturnValue({
          nodes: filteredNodes,
          edges: [],
          relevanceScores: [0.9, 0.85],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ minWeight: 0.85 }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ minWeight: 0.85 })
        )
      })

      it('should filter by minConfidence', async () => {
        const filteredNodes = [mockNodes[0], mockNodes[1]] // confidence >= 0.9
        mockLatticeInstance.query.mockReturnValue({
          nodes: filteredNodes,
          edges: [],
          relevanceScores: [0.95, 0.9],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ minConfidence: 0.9 }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ minConfidence: 0.9 })
        )
      })

      it('should combine multiple filters', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0]],
          edges: [],
          relevanceScores: [0.9],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({
            type: 'concept',
            source: 'user',
            minWeight: 0.8,
            minConfidence: 0.9,
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'concept',
            source: 'user',
            minWeight: 0.8,
            minConfidence: 0.9,
          })
        )
      })
    })

    describe('文本搜索测试', () => {
      it('should filter by searchText (case-insensitive)', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0], mockNodes[1]], // 包含 "人工智能"
          edges: [],
          relevanceScores: [0.9, 0.85],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ searchText: '人工智能' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // 应该只返回包含搜索文本的节点
        data.data.nodes.forEach((node: { content: string }) => {
          expect(node.content.toLowerCase()).toContain('人工智能')
        })
      })

      it('should perform partial text match', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: [],
          relevanceScores: mockNodes.map((_, i) => 0.9 - i * 0.05),
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ searchText: '学习' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        // 应该返回包含 "学习" 的节点
        data.data.nodes.forEach((node: { content: string }) => {
          expect(node.content.toLowerCase()).toContain('学习')
        })
      })

      it('should return empty when searchText matches nothing', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: [],
          relevanceScores: mockNodes.map(() => 0.5),
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ searchText: 'nonexistentkeyword' }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.nodes).toEqual([])
      })
    })

    describe('分页和限制测试', () => {
      it('should limit results to specified number', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: mockEdges,
          relevanceScores: [0.9, 0.85, 0.8, 0.75, 0.7],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ limit: 3 }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.nodes.length).toBeLessThanOrEqual(3)
      })

      it('should default limit to 50 if not specified', async () => {
        const manyNodes = Array.from({ length: 100 }, (_, i) => ({
          ...mockNodes[0],
          id: `node-${i}`,
        }))
        
        mockLatticeInstance.query.mockReturnValue({
          nodes: manyNodes,
          edges: [],
          relevanceScores: Array(100).fill(0.5),
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.nodes.length).toBeLessThanOrEqual(50)
      })

      it('should handle limit larger than result set', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0], mockNodes[1]],
          edges: [],
          relevanceScores: [0.9, 0.85],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ limit: 100 }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.nodes.length).toBe(2)
      })
    })

    describe('错误处理测试', () => {
      it('should handle invalid JSON body', async () => {
        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: 'invalid json string',
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
      })

      it('should handle lattice query error', async () => {
        mockLatticeInstance.query.mockImplementation(() => {
          throw new Error('Database connection failed')
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to query lattice')
      })

      it('should handle empty body', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: mockEdges,
          relevanceScores: mockNodes.map(() => 0.5),
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    })

    describe('边界情况测试', () => {
      it('should handle zero minWeight', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: [],
          relevanceScores: mockNodes.map(() => 0.5),
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ minWeight: 0 }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ minWeight: 0 })
        )
      })

      it('should handle zero minConfidence', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: [],
          relevanceScores: mockNodes.map(() => 0.5),
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ minConfidence: 0 }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ minConfidence: 0 })
        )
      })

      it('should handle max minWeight (1.0)', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0]], // weight 0.9
          edges: [],
          relevanceScores: [0.9],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ minWeight: 1.0 }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('should handle max minConfidence (1.0)', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [],
          edges: [],
          relevanceScores: [],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ minConfidence: 1.0 }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('should handle empty tags array', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: [],
          relevanceScores: mockNodes.map(() => 0.5),
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ tags: [] }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('should handle single tag as string', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0]],
          edges: [],
          relevanceScores: [0.9],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ tags: 'ai' }), // string instead of array
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalledWith(
          expect.objectContaining({ tags: ['ai'] })
        )
      })

      it('should handle limit of 1', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: mockNodes,
          edges: [],
          relevanceScores: mockNodes.map((_, i) => 0.9 - i * 0.1),
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ limit: 1 }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.nodes.length).toBe(1)
      })

      it('should handle very long searchText', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [],
          edges: [],
          relevanceScores: [],
        })

        const longSearchText = 'a'.repeat(10000)
        
        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ searchText: longSearchText }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockLatticeInstance.query).toHaveBeenCalled()
      })

      it('should handle special characters in searchText', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [],
          edges: [],
          relevanceScores: [],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({ searchText: '<script>alert("xss")</script>' }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    describe('响应格式测试', () => {
      it('should return correct response structure', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0]],
          edges: [mockEdges[0]],
          relevanceScores: [0.9],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toHaveProperty('success')
        expect(data).toHaveProperty('data')
        expect(data.data).toHaveProperty('nodes')
        expect(data.data).toHaveProperty('edges')
        expect(data.data).toHaveProperty('relevanceScores')
        expect(data.data).toHaveProperty('total')
      })

      it('should include all node properties in response', async () => {
        mockLatticeInstance.query.mockReturnValue({
          nodes: [mockNodes[0]],
          edges: [],
          relevanceScores: [0.9],
        })

        const request = new NextRequest('http://localhost/api/knowledge/query', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const response = await POST(request)
        const data = await response.json()

        const node = data.data.nodes[0]
        expect(node).toHaveProperty('id')
        expect(node).toHaveProperty('content')
        expect(node).toHaveProperty('type')
        expect(node).toHaveProperty('weight')
        expect(node).toHaveProperty('confidence')
        expect(node).toHaveProperty('source')
        expect(node).toHaveProperty('timestamp')
      })
    })
  })
})