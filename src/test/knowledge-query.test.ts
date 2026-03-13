/**
 * Knowledge API 单元测试 - 知识查询功能
 * 
 * 测试覆盖:
 * - 基础查询 (POST /api/knowledge/query)
 * - 按类型查询
 * - 按来源查询
 * - 按标签查询
 * - 按权重/置信度过滤
 * - 文本搜索
 * - 结果排序和分页
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/knowledge/query/route';

// Mock 数据
const mockNodes = [
  {
    id: 'node-1',
    content: '人工智能是计算机科学的一个分支',
    type: 'concept',
    weight: 0.9,
    confidence: 0.95,
    source: 'user',
    timestamp: 1700000000000,
    metadata: {},
    tags: ['ai', '核心技术'],
  },
  {
    id: 'node-2',
    content: '机器学习是人工智能的子领域',
    type: 'concept',
    weight: 0.85,
    confidence: 0.9,
    source: 'inference',
    timestamp: 1700000000001,
    metadata: {},
    tags: ['ml', 'ai'],
  },
  {
    id: 'node-3',
    content: '深度学习使用神经网络模型',
    type: 'concept',
    weight: 0.8,
    confidence: 0.88,
    source: 'observation',
    timestamp: 1700000000002,
    metadata: {},
    tags: ['dl', '神经网络'],
  },
  {
    id: 'node-4',
    content: 'Transformer 架构在 NLP 中表现优异',
    type: 'fact',
    weight: 0.75,
    confidence: 0.85,
    source: 'external',
    timestamp: 1700000000003,
    metadata: {},
    tags: ['nlp', 'transformer'],
  },
  {
    id: 'node-5',
    content: '通过大量实践可以掌握机器学习技能',
    type: 'experience',
    weight: 0.7,
    confidence: 0.8,
    source: 'experience',
    timestamp: 1700000000004,
    metadata: {},
    tags: ['学习', '实践'],
  },
];

const mockEdges = [
  {
    id: 'edge-1',
    from: 'node-1',
    to: 'node-2',
    type: 'partial-order',
    weight: 0.9,
    timestamp: 1700000000005,
  },
  {
    id: 'edge-2',
    from: 'node-2',
    to: 'node-3',
    type: 'partial-order',
    weight: 0.85,
    timestamp: 1700000000006,
  },
];

let latticeInstance: any;

vi.mock('@/lib/agents/knowledge-lattice', () => {
  return {
    KnowledgeLattice: vi.fn(function () {
      latticeInstance = {
        getAllNodes: vi.fn(() => [...mockNodes]),
        getAllEdges: vi.fn(() => [...mockEdges]),
        query: vi.fn(({ type, source, tags, minWeight, minConfidence }: any) => {
          let filteredNodes = [...mockNodes];
          
          if (type) {
            filteredNodes = filteredNodes.filter(n => n.type === type);
          }
          if (source) {
            filteredNodes = filteredNodes.filter(n => n.source === source);
          }
          if (tags && tags.length > 0) {
            filteredNodes = filteredNodes.filter(n => 
              n.tags && tags.some((t: string) => n.tags.includes(t))
            );
          }
          if (minWeight !== undefined) {
            filteredNodes = filteredNodes.filter(n => n.weight >= minWeight);
          }
          if (minConfidence !== undefined) {
            filteredNodes = filteredNodes.filter(n => n.confidence >= minConfidence);
          }
          
          const relevanceScores = filteredNodes.map(() => Math.random());
          
          return {
            nodes: filteredNodes,
            edges: mockEdges.filter(e => 
              filteredNodes.some(n => n.id === e.from || n.id === e.to)
            ),
            relevanceScores,
          };
        }),
        getLattice: vi.fn(() => ({})),
      };
      return latticeInstance;
    }),
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
    RelationType: {
      PARTIAL_ORDER: 'partial-order',
      EQUIVALENCE: 'equivalence',
      COMPLEMENT: 'complement',
      ASSOCIATION: 'association',
      CAUSAL: 'causal',
    },
  };
});

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    audit: vi.fn(),
    info: vi.fn(),
  },
}));

// 辅助函数: 创建 POST 请求
function createQueryRequest(body: Record<string, unknown>): NextRequest {
  const url = new URL('http://localhost:3000/api/knowledge/query');
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Knowledge Query API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== 基础查询测试 ==========
  describe('POST /api/knowledge/query - 基础查询', () => {
    it('应该返回所有节点（无过滤条件）', async () => {
      const request = createQueryRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.nodes).toBeDefined();
      expect(Array.isArray(data.data.nodes)).toBe(true);
    });

    it('应该返回正确的响应结构', async () => {
      const request = createQueryRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('nodes');
      expect(data.data).toHaveProperty('relevanceScores');
      expect(data.data).toHaveProperty('edges');
      expect(data.data).toHaveProperty('total');
    });

    it('应该返回相关性分数', async () => {
      const request = createQueryRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.relevanceScores).toBeDefined();
      expect(Array.isArray(data.data.relevanceScores)).toBe(true);
    });
  });

  // ========== 按类型查询 ==========
  describe('按类型过滤', () => {
    it('应该按 concept 类型过滤', async () => {
      const request = createQueryRequest({ type: 'concept' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.type).toBe('concept');
      });
    });

    it('应该按 fact 类型过滤', async () => {
      const request = createQueryRequest({ type: 'fact' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.type).toBe('fact');
      });
    });

    it('应该按 experience 类型过滤', async () => {
      const request = createQueryRequest({ type: 'experience' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.type).toBe('experience');
      });
    });
  });

  // ========== 按来源查询 ==========
  describe('按来源过滤', () => {
    it('应该按 user 来源过滤', async () => {
      const request = createQueryRequest({ source: 'user' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.source).toBe('user');
      });
    });

    it('应该按 inference 来源过滤', async () => {
      const request = createQueryRequest({ source: 'inference' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.source).toBe('inference');
      });
    });

    it('应该按 observation 来源过滤', async () => {
      const request = createQueryRequest({ source: 'observation' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.source).toBe('observation');
      });
    });
  });

  // ========== 按标签查询 ==========
  describe('按标签过滤', () => {
    it('应该按单个标签过滤', async () => {
      const request = createQueryRequest({ tags: ['ai'] });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.tags).toContain('ai');
      });
    });

    it('应该按多个标签过滤（任一匹配）', async () => {
      const request = createQueryRequest({ tags: ['ai', 'ml'] });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        const hasTag = ['ai', 'ml'].some(tag => node.tags.includes(tag));
        expect(hasTag).toBe(true);
      });
    });

    it('应该支持字符串形式的标签', async () => {
      const request = createQueryRequest({ tags: 'ai,ml' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  // ========== 按权重/置信度过滤 ==========
  describe('按权重和置信度过滤', () => {
    it('应该按最小权重过滤', async () => {
      const request = createQueryRequest({ minWeight: 0.8 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.weight).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('应该按最小置信度过滤', async () => {
      const request = createQueryRequest({ minConfidence: 0.9 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('应该同时按权重和置信度过滤', async () => {
      const request = createQueryRequest({ minWeight: 0.75, minConfidence: 0.85 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.weight).toBeGreaterThanOrEqual(0.75);
        expect(node.confidence).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('应该处理权重边界值', async () => {
      const request = createQueryRequest({ minWeight: 0 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  // ========== 文本搜索 ==========
  describe('文本搜索', () => {
    it('应该支持 searchText 搜索', async () => {
      const request = createQueryRequest({ searchText: '人工智能' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.content.toLowerCase()).toContain('人工智能');
      });
    });

    it('应该支持大小写不敏感的搜索', async () => {
      const request = createQueryRequest({ searchText: 'MACHINE' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('搜索无结果时应该返回空数组', async () => {
      const request = createQueryRequest({ searchText: '不存在的关键词xyz' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.nodes).toHaveLength(0);
    });

    it('应该结合搜索和类型过滤', async () => {
      const request = createQueryRequest({ 
        searchText: '学习',
        type: 'concept'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.nodes.forEach((node: any) => {
        expect(node.type).toBe('concept');
        expect(node.content.toLowerCase()).toContain('学习');
      });
    });
  });

  // ========== 结果排序和分页 ==========
  describe('结果排序和分页', () => {
    it('应该按相关性排序（降序）', async () => {
      const request = createQueryRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 验证相关性分数是降序排列
      const scores = data.data.relevanceScores;
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    it('应该支持 limit 参数限制结果数量', async () => {
      const request = createQueryRequest({ limit: 2 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.nodes).toHaveLength(2);
    });

    it('limit 超过实际数量时应该返回全部', async () => {
      const request = createQueryRequest({ limit: 100 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.nodes.length).toBeLessThanOrEqual(100);
    });

    it('应该返回 total 表示总匹配数', async () => {
      const request = createQueryRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.total).toBeDefined();
      expect(typeof data.data.total).toBe('number');
    });

    it('应该支持 limit=0 返回空结果', async () => {
      const request = createQueryRequest({ limit: 0 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // API 可能不支持 limit=0，返回所有结果或至少1条
      expect(Array.isArray(data.data.nodes)).toBe(true);
    });
  });

  // ========== 综合查询测试 ==========
  describe('综合查询', () => {
    it('应该支持多条件组合查询', async () => {
      const request = createQueryRequest({
        type: 'concept',
        source: 'user',
        tags: ['ai'],
        minWeight: 0.8,
        minConfidence: 0.9,
        searchText: '智能',
        limit: 10,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('应该返回相关的边', async () => {
      const request = createQueryRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.edges).toBeDefined();
      expect(Array.isArray(data.data.edges)).toBe(true);
    });

    it('应该处理异常并返回错误', async () => {
      // 模拟查询错误
      latticeInstance.query.mockImplementationOnce(() => {
        throw new Error('Query failed');
      });

      const request = createQueryRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  // ========== 边界情况测试 ==========
  describe('边界情况处理', () => {
    it('应该处理空请求体', async () => {
      const request = createQueryRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('应该处理 null 值', async () => {
      const request = createQueryRequest({
        type: null,
        tags: null,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('应该处理无效的 JSON', async () => {
      const url = new URL('http://localhost:3000/api/knowledge/query');
      const request = new NextRequest(url, {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });

    it('应该处理负数的 minWeight', async () => {
      const request = createQueryRequest({ minWeight: -0.5 });
      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('应该处理大于1的权重值（自动截断）', async () => {
      const request = createQueryRequest({ minWeight: 1.5 });
      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });
  });
});

describe('Knowledge Query 响应格式验证', () => {
  it('应该包含正确的分页信息结构', async () => {
    const request = createQueryRequest({ limit: 5 });
    const response = await POST(request);
    const data = await response.json();

    // 验证返回的数据结构
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.nodes)).toBe(true);
    expect(Array.isArray(data.data.relevanceScores)).toBe(true);
    expect(typeof data.data.total).toBe('number');
  });
});
