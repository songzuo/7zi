/**
 * Knowledge Edges & Query API 单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getEdges, POST as postEdges } from '@/app/api/knowledge/edges/route';
import { POST as postQuery } from '@/app/api/knowledge/query/route';

// Mock KnowledgeLattice
const mockLattice = {
  getAllEdges: vi.fn(),
  getEdge: vi.fn(),
  addEdge: vi.fn(),
  getNode: vi.fn(),
  query: vi.fn(),
};

vi.mock('@/lib/agents/knowledge-lattice', () => ({
  KnowledgeLattice: vi.fn(() => mockLattice),
  KnowledgeType: {
    CONCEPT: 'concept',
    FACT: 'fact',
    RULE: 'rule',
  },
  KnowledgeSource: {
    USER: 'user',
    AI: 'ai',
  },
  RelationType: {
    ASSOCIATION: 'association',
    HIERARCHY: 'hierarchy',
    SEQUENCE: 'sequence',
    DEPENDENCY: 'dependency',
    CONTRADICTION: 'contradiction',
  },
}));

function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>,
  path: string = '/api/knowledge/edges'
): NextRequest {
  const url = new URL(`http://localhost:3000${path}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Knowledge Edges API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLattice.getAllEdges.mockReset();
    mockLattice.addEdge.mockReset();
    mockLattice.getEdge.mockReset();
    mockLattice.getNode.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/knowledge/edges', () => {
    it('应该返回所有边', async () => {
      const mockEdges = [
        { id: 'edge-1', from: 'node-1', to: 'node-2', type: 'association', weight: 0.8 },
        { id: 'edge-2', from: 'node-2', to: 'node-3', type: 'hierarchy', weight: 0.6 },
      ];
      mockLattice.getAllEdges.mockReturnValue(mockEdges);

      const request = createMockRequest('GET');
      const response = await getEdges(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEdges);
    });

    it('应该按类型过滤边', async () => {
      const mockEdges = [
        { id: 'edge-1', from: 'node-1', to: 'node-2', type: 'association', weight: 0.8 },
        { id: 'edge-2', from: 'node-2', to: 'node-3', type: 'hierarchy', weight: 0.6 },
      ];
      mockLattice.getAllEdges.mockReturnValue(mockEdges);

      const request = createMockRequest('GET', undefined, { type: 'association' });
      const response = await getEdges(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.data[0].type).toBe('association');
    });

    it('应该按源节点过滤边', async () => {
      const mockEdges = [
        { id: 'edge-1', from: 'node-1', to: 'node-2', type: 'association' },
        { id: 'edge-2', from: 'node-2', to: 'node-3', type: 'hierarchy' },
        { id: 'edge-3', from: 'node-1', to: 'node-3', type: 'dependency' },
      ];
      mockLattice.getAllEdges.mockReturnValue(mockEdges);

      const request = createMockRequest('GET', undefined, { from: 'node-1' });
      const response = await getEdges(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(2);
      expect(data.data.every((e: any) => e.from === 'node-1')).toBe(true);
    });

    it('应该按目标节点过滤边', async () => {
      const mockEdges = [
        { id: 'edge-1', from: 'node-1', to: 'node-2', type: 'association' },
        { id: 'edge-2', from: 'node-2', to: 'node-3', type: 'hierarchy' },
      ];
      mockLattice.getAllEdges.mockReturnValue(mockEdges);

      const request = createMockRequest('GET', undefined, { to: 'node-2' });
      const response = await getEdges(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.data[0].to).toBe('node-2');
    });

    it('应该按最小权重过滤边', async () => {
      const mockEdges = [
        { id: 'edge-1', from: 'node-1', to: 'node-2', type: 'association', weight: 0.9 },
        { id: 'edge-2', from: 'node-2', to: 'node-3', type: 'hierarchy', weight: 0.3 },
      ];
      mockLattice.getAllEdges.mockReturnValue(mockEdges);

      const request = createMockRequest('GET', undefined, { minWeight: '0.5' });
      const response = await getEdges(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.data[0].weight).toBe(0.9);
    });

    it('应该支持分页', async () => {
      const mockEdges = Array.from({ length: 30 }, (_, i) => ({
        id: `edge-${i}`,
        from: `node-${i}`,
        to: `node-${i + 1}`,
        type: 'association',
        weight: 0.5,
      }));
      mockLattice.getAllEdges.mockReturnValue(mockEdges);

      const request = createMockRequest('GET', undefined, { limit: '10', offset: '5' });
      const response = await getEdges(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(10);
      expect(data.pagination.total).toBe(30);
    });

    it('空结果时应该返回空数组', async () => {
      mockLattice.getAllEdges.mockReturnValue([]);

      const request = createMockRequest('GET');
      const response = await getEdges(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
    });

    it('错误时应该返回 500', async () => {
      mockLattice.getAllEdges.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = createMockRequest('GET');
      const response = await getEdges(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/knowledge/edges', () => {
    it('应该创建新边', async () => {
      mockLattice.getNode.mockReturnValue({ id: 'node-1', content: 'Node 1' });
      mockLattice.getNode.mockReturnValue({ id: 'node-2', content: 'Node 2' });
      mockLattice.addEdge.mockReturnValue('edge-new');
      mockLattice.getEdge.mockReturnValue({
        id: 'edge-new',
        from: 'node-1',
        to: 'node-2',
        type: 'association',
        weight: 0.7,
      });

      // 重置 mock 以支持多次调用
      mockLattice.getNode
        .mockReturnValueOnce({ id: 'node-1', content: 'Node 1' })
        .mockReturnValueOnce({ id: 'node-2', content: 'Node 2' });

      const request = createMockRequest('POST', {
        from: 'node-1',
        to: 'node-2',
        type: 'association',
        weight: 0.7,
      });
      const response = await postEdges(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('缺少 from 时应该返回 400', async () => {
      const request = createMockRequest('POST', {
        to: 'node-2',
        type: 'association',
      });
      const response = await postEdges(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('from');
    });

    it('缺少 to 时应该返回 400', async () => {
      const request = createMockRequest('POST', {
        from: 'node-1',
        type: 'association',
      });
      const response = await postEdges(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('to');
    });

    it('缺少 type 时应该返回 400', async () => {
      const request = createMockRequest('POST', {
        from: 'node-1',
        to: 'node-2',
      });
      const response = await postEdges(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('type');
    });

    it('无效类型时应该返回 400', async () => {
      const request = createMockRequest('POST', {
        from: 'node-1',
        to: 'node-2',
        type: 'invalid_type',
      });
      const response = await postEdges(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });

    it('源节点不存在时应该返回 404', async () => {
      mockLattice.getNode.mockReturnValue(null);

      const request = createMockRequest('POST', {
        from: 'nonexistent',
        to: 'node-2',
        type: 'association',
      });
      const response = await postEdges(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Source node not found');
    });

    it('目标节点不存在时应该返回 404', async () => {
      mockLattice.getNode
        .mockReturnValueOnce({ id: 'node-1', content: 'Node 1' })
        .mockReturnValueOnce(null);

      const request = createMockRequest('POST', {
        from: 'node-1',
        to: 'nonexistent',
        type: 'association',
      });
      const response = await postEdges(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Target node not found');
    });

    it('应该使用默认权重', async () => {
      mockLattice.getNode
        .mockReturnValueOnce({ id: 'node-1' })
        .mockReturnValueOnce({ id: 'node-2' });
      mockLattice.addEdge.mockReturnValue('edge-default');
      mockLattice.getEdge.mockReturnValue({
        id: 'edge-default',
        from: 'node-1',
        to: 'node-2',
        type: 'association',
        weight: 0.5,
      });

      const request = createMockRequest('POST', {
        from: 'node-1',
        to: 'node-2',
        type: 'association',
      });
      const response = await postEdges(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.weight).toBe(0.5);
    });
  });
});

describe('Knowledge Query API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLattice.query.mockReset();
  });

  describe('POST /api/knowledge/query', () => {
    it('应该执行基本查询', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [
          { id: 'node-1', content: '概念1', type: 'concept' },
          { id: 'node-2', content: '概念2', type: 'concept' },
        ],
        edges: [],
        relevanceScores: [0.9, 0.7],
      });

      const request = createMockRequest('POST', {}, undefined, '/api/knowledge/query');
      const response = await postQuery(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.nodes.length).toBe(2);
    });

    it('应该按类型过滤', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [
          { id: 'node-1', content: '概念', type: 'concept' },
        ],
        edges: [],
        relevanceScores: [0.9],
      });

      const request = createMockRequest('POST', { type: 'concept' }, undefined, '/api/knowledge/query');
      const response = await postQuery(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockLattice.query).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'concept' })
      );
    });

    it('应该按来源过滤', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [{ id: 'node-1', source: 'ai' }],
        edges: [],
        relevanceScores: [0.8],
      });

      const request = createMockRequest('POST', { source: 'ai' }, undefined, '/api/knowledge/query');
      await postQuery(request);

      expect(mockLattice.query).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'ai' })
      );
    });

    it('应该按标签过滤', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [{ id: 'node-1', tags: ['important'] }],
        edges: [],
        relevanceScores: [0.9],
      });

      const request = createMockRequest('POST', { tags: ['important', 'core'] }, undefined, '/api/knowledge/query');
      await postQuery(request);

      expect(mockLattice.query).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['important', 'core'] })
      );
    });

    it('应该按最小权重过滤', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [{ id: 'node-1', weight: 0.9 }],
        edges: [],
        relevanceScores: [0.8],
      });

      const request = createMockRequest('POST', { minWeight: 0.8 }, undefined, '/api/knowledge/query');
      await postQuery(request);

      expect(mockLattice.query).toHaveBeenCalledWith(
        expect.objectContaining({ minWeight: 0.8 })
      );
    });

    it('应该按最小置信度过滤', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [{ id: 'node-1', confidence: 0.9 }],
        edges: [],
        relevanceScores: [0.8],
      });

      const request = createMockRequest('POST', { minConfidence: 0.7 }, undefined, '/api/knowledge/query');
      await postQuery(request);

      expect(mockLattice.query).toHaveBeenCalledWith(
        expect.objectContaining({ minConfidence: 0.7 })
      );
    });

    it('应该支持文本搜索', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [
          { id: 'node-1', content: '人工智能基础' },
          { id: 'node-2', content: '机器学习入门' },
          { id: 'node-3', content: '深度学习' },
        ],
        edges: [],
        relevanceScores: [0.9, 0.8, 0.7],
      });

      const request = createMockRequest('POST', { searchText: '学习' }, undefined, '/api/knowledge/query');
      const response = await postQuery(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 应该只返回包含"学习"的节点
      expect(data.data.nodes.length).toBe(2);
    });

    it('应该限制结果数量', async () => {
      mockLattice.query.mockReturnValue({
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `node-${i}`,
          content: `节点${i}`,
        })),
        edges: [],
        relevanceScores: Array(100).fill(0.5),
      });

      const request = createMockRequest('POST', { limit: 10 }, undefined, '/api/knowledge/query');
      const response = await postQuery(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.nodes.length).toBeLessThanOrEqual(10);
    });

    it('应该按相关性排序', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [
          { id: 'node-1', content: '低相关' },
          { id: 'node-2', content: '高相关' },
          { id: 'node-3', content: '中相关' },
        ],
        edges: [],
        relevanceScores: [0.3, 0.9, 0.6],
      });

      const request = createMockRequest('POST', {}, undefined, '/api/knowledge/query');
      const response = await postQuery(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 检查是否按相关性降序排列
      const scores = data.data.relevanceScores;
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });

    it('应该返回空结果', async () => {
      mockLattice.query.mockReturnValue({
        nodes: [],
        edges: [],
        relevanceScores: [],
      });

      const request = createMockRequest('POST', {}, undefined, '/api/knowledge/query');
      const response = await postQuery(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.nodes).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it('错误时应该返回 500', async () => {
      mockLattice.query.mockImplementation(() => {
        throw new Error('Query failed');
      });

      const request = createMockRequest('POST', {}, undefined, '/api/knowledge/query');
      const response = await postQuery(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});

describe('Knowledge API - 组合测试', () => {
  it('应该支持创建节点并创建边', async () => {
    // 模拟完整的知识图谱操作流程
    mockLattice.getNode
      .mockReturnValueOnce({ id: 'node-1', content: '概念A' })
      .mockReturnValueOnce({ id: 'node-2', content: '概念B' });
    mockLattice.addEdge.mockReturnValue('edge-1');
    mockLattice.getEdge.mockReturnValue({
      id: 'edge-1',
      from: 'node-1',
      to: 'node-2',
      type: 'association',
    });

    const request = createMockRequest('POST', {
      from: 'node-1',
      to: 'node-2',
      type: 'association',
    });
    const response = await postEdges(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('应该支持创建并查询', async () => {
    mockLattice.query.mockReturnValue({
      nodes: [{ id: 'node-1', content: '测试节点' }],
      edges: [],
      relevanceScores: [0.9],
    });

    const request = createMockRequest('POST', { searchText: '测试' }, undefined, '/api/knowledge/query');
    const response = await postQuery(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.nodes.length).toBe(1);
  });
});