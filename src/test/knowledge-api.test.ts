/**
 * @fileoverview 知识图谱 API 集成测试
 * @module test/knowledge-api
 * @description 测试知识图谱 API 端点
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// 模拟知识存储
vi.mock('@/lib/store/knowledge-store', () => ({
  getKnowledgeStore: vi.fn(() => ({
    getAllNodes: vi.fn(() => [
      { id: 'node-1', content: 'React 组件设计', type: 'concept', weight: 0.8, confidence: 0.9, tags: ['react', 'frontend'] },
      { id: 'node-2', content: 'TypeScript 类型系统', type: 'concept', weight: 0.7, confidence: 0.85, tags: ['typescript'] },
      { id: 'node-3', content: 'Node.js 性能优化', type: 'concept', weight: 0.6, confidence: 0.8, tags: ['nodejs', 'performance'] },
    ]),
    getAllEdges: vi.fn(() => [
      { from: 'node-1', to: 'node-2', type: 'relates_to', weight: 0.5 },
      { from: 'node-2', to: 'node-3', type: 'relates_to', weight: 0.4 },
    ]),
    queryNodes: vi.fn(({ type, tags, minWeight, minConfidence, limit }) => {
      let nodes = [
        { id: 'node-1', content: 'React 组件设计', type: 'concept', weight: 0.8, confidence: 0.9, tags: ['react', 'frontend'] },
        { id: 'node-2', content: 'TypeScript 类型系统', type: 'concept', weight: 0.7, confidence: 0.85, tags: ['typescript'] },
        { id: 'node-3', content: 'Node.js 性能优化', type: 'concept', weight: 0.6, confidence: 0.8, tags: ['nodejs', 'performance'] },
      ];
      
      if (type) nodes = nodes.filter(n => n.type === type);
      if (tags?.length) nodes = nodes.filter(n => tags.some((t: string) => n.tags?.includes(t)));
      if (minWeight !== undefined) nodes = nodes.filter(n => n.weight >= minWeight);
      if (minConfidence !== undefined) nodes = nodes.filter(n => n.confidence >= minConfidence);
      
      return { nodes: nodes.slice(0, limit), total: nodes.length };
    }),
    addNode: vi.fn((node) => ({ ...node, id: node.id || 'new-node-id' })),
    getNode: vi.fn((id) => ({ id, content: 'Test Node', type: 'concept' })),
    deleteNode: vi.fn(() => true),
  })),
}));

vi.mock('@/lib/cache/knowledge-cache', () => ({
  getKnowledgeQueryCache: vi.fn(() => ({
    createKey: vi.fn(() => 'test-cache-key'),
    get: vi.fn(() => null),
    set: vi.fn(),
    invalidatePrefix: vi.fn(() => 0),
    delete: vi.fn(() => true),
    has: vi.fn(() => false),
    clear: vi.fn(),
  })),
}));

// 导入待测试的路由处理函数
// 注意：由于 Next.js API 路由是动态导入的，我们需要直接测试逻辑

describe('知识图谱 API 测试', () => {
  describe('GET /api/knowledge/nodes', () => {
    it('should return all nodes without filters', async () => {
      // 模拟请求
      const url = new URL('http://localhost/api/knowledge/nodes');
      const request = new NextRequest(url);
      
      // 导入并调用 GET 处理器
      const { GET } = await import('@/app/api/knowledge/nodes/route');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should filter nodes by type', async () => {
      const url = new URL('http://localhost/api/knowledge/nodes?type=concept');
      const request = new NextRequest(url);
      
      const { GET } = await import('@/app/api/knowledge/nodes/route');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
    });

    it('should filter nodes by tags', async () => {
      const url = new URL('http://localhost/api/knowledge/nodes?tags=react,frontend');
      const request = new NextRequest(url);
      
      const { GET } = await import('@/app/api/knowledge/nodes/route');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
    });

    it('should respect limit and offset', async () => {
      const url = new URL('http://localhost/api/knowledge/nodes?limit=2&offset=0');
      const request = new NextRequest(url);
      
      const { GET } = await import('@/app/api/knowledge/nodes/route');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.pagination.limit).toBe(2);
    });
  });

  describe('POST /api/knowledge/nodes', () => {
    it('should create a new node', async () => {
      const url = new URL('http://localhost/api/knowledge/nodes');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          content: '新知识节点',
          type: 'concept',
          weight: 0.8,
          confidence: 0.9,
          tags: ['test'],
        }),
      });
      
      const { POST } = await import('@/app/api/knowledge/nodes/route');
      const response = await POST(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
    });

    it('should reject node without content', async () => {
      const url = new URL('http://localhost/api/knowledge/nodes');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ type: 'concept' }),
      });
      
      const { POST } = await import('@/app/api/knowledge/nodes/route');
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/knowledge/query', () => {
    it('should query nodes with filters', async () => {
      const url = new URL('http://localhost/api/knowledge/query');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          type: 'concept',
          tags: ['react'],
          minWeight: 0.5,
          minConfidence: 0.7,
          limit: 10,
        }),
      });
      
      const { POST } = await import('@/app/api/knowledge/query/route');
      const response = await POST(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('nodes');
      expect(data.data).toHaveProperty('relevanceScores');
      expect(data.data).toHaveProperty('edges');
    });

    it('should search by text', async () => {
      const url = new URL('http://localhost/api/knowledge/query');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          searchText: 'React',
          limit: 5,
        }),
      });
      
      const { POST } = await import('@/app/api/knowledge/query/route');
      const response = await POST(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
    });

    it('should return empty results for no matches', async () => {
      const url = new URL('http://localhost/api/knowledge/query');
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          searchText: 'nonexistent-xyz-123',
        }),
      });
      
      const { POST } = await import('@/app/api/knowledge/query/route');
      const response = await POST(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.nodes).toHaveLength(0);
    });
  });

  describe('GET /api/knowledge/lattice', () => {
    it('should return complete lattice structure', async () => {
      const url = new URL('http://localhost/api/knowledge/lattice');
      const request = new NextRequest(url);
      
      const { GET } = await import('@/app/api/knowledge/lattice/route');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('nodes');
      expect(data.data).toHaveProperty('edges');
    });
  });
});
