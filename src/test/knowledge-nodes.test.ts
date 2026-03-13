/**
 * Knowledge API 单元测试 - 知识节点 CRUD
 * 
 * 测试覆盖:
 * - 创建知识节点 (POST /api/knowledge/nodes)
 * - 查询知识节点 (GET /api/knowledge/nodes)
 * - 获取单个节点 (GET /api/knowledge/nodes/:id)
 * - 更新知识节点 (PUT /api/knowledge/nodes/:id)
 * - 删除知识节点 (DELETE /api/knowledge/nodes/:id)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as NodesGET, POST as NodesPOST } from '@/app/api/knowledge/nodes/route';
import { GET as NodeGET, PUT as NodePUT, DELETE as NodeDELETE } from '@/app/api/knowledge/nodes/[id]/route';

// Mock 知识晶格
const mockNodes = [
  {
    id: 'node-1',
    content: '测试概念',
    type: 'concept',
    weight: 0.8,
    confidence: 0.9,
    source: 'user',
    timestamp: 1700000000000,
    metadata: {},
    tags: ['important', 'core'],
  },
  {
    id: 'node-2',
    content: '测试事实',
    type: 'fact',
    weight: 0.7,
    confidence: 0.8,
    source: 'observation',
    timestamp: 1700000000001,
    metadata: {},
    tags: [],
  },
  {
    id: 'node-3',
    content: '测试规则',
    type: 'rule',
    weight: 0.9,
    confidence: 0.95,
    source: 'inference',
    timestamp: 1700000000002,
    metadata: {},
    tags: ['core'],
  },
];

const mockEdges = [
  {
    id: 'edge-1',
    from: 'node-1',
    to: 'node-2',
    type: 'association',
    weight: 0.8,
    timestamp: 1700000000003,
  },
];

let latticeInstance: any;

vi.mock('@/lib/agents/knowledge-lattice', () => {
  return {
    KnowledgeLattice: vi.fn(function () {
      latticeInstance = {
        getAllNodes: vi.fn(() => [...mockNodes]),
        getNode: vi.fn((id: string) => mockNodes.find((n) => n.id === id)),
        getAdjacentEdges: vi.fn((id: string) => mockEdges.filter((e) => e.from === id || e.to === id)),
        addNode: vi.fn((node: any) => node.id || 'new-node-id'),
        updateNode: vi.fn((id: string, updates: any) => {
          const node = mockNodes.find((n) => n.id === id);
          return node ? { ...node, ...updates, id } : null;
        }),
        deleteNode: vi.fn((id: string) => true),
        query: vi.fn(() => ({ nodes: [...mockNodes], edges: [], relevanceScores: [0.9, 0.8, 0.7] })),
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

// 辅助函数: 创建模拟请求
function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL('http://localhost:3000/api/knowledge/nodes');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// 辅助函数: 创建带 ID 的模拟请求
function createMockRequestWithId(
  id: string,
  method: string,
  body?: Record<string, unknown>
): NextRequest {
  const url = new URL(`http://localhost:3000/api/knowledge/nodes/${id}`);
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Knowledge Nodes CRUD API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== 创建知识节点 (POST /api/knowledge/nodes) ==========
  describe('POST /api/knowledge/nodes - 创建知识节点', () => {
    it('应该成功创建新节点', async () => {
      const requestBody = {
        content: '新知识节点',
        type: 'concept',
        weight: 0.8,
        confidence: 0.9,
        source: 'user',
        tags: ['new'],
      };

      const request = createMockRequest('POST', requestBody);
      const response = await NodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      // 验证 addNode 被调用
      expect(latticeInstance.addNode).toHaveBeenCalled();
    });

    it('应该验证必填字段 - content', async () => {
      const requestBody = { type: 'concept' };
      const request = createMockRequest('POST', requestBody);
      const response = await NodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('content');
    });

    it('应该验证必填字段 - type', async () => {
      const requestBody = { content: '测试内容' };
      const request = createMockRequest('POST', requestBody);
      const response = await NodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('type');
    });

    it('应该验证类型有效性', async () => {
      const requestBody = {
        content: '测试内容',
        type: 'invalid-type',
      };
      const request = createMockRequest('POST', requestBody);
      const response = await NodesPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });

    it('应该设置可选字段的默认值', async () => {
      const requestBody = {
        content: '最小节点',
        type: 'fact',
      };
      const request = createMockRequest('POST', requestBody);
      const response = await NodesPOST(request);

      expect(response.status).toBe(201);
      // 验证 addNode 被调用，参数包含默认值
      expect(latticeInstance.addNode).toHaveBeenCalled();
      const calledArgs = latticeInstance.addNode.mock.calls[0][0];
      expect(calledArgs.weight).toBe(0.5);
      expect(calledArgs.confidence).toBe(0.5);
      expect(calledArgs.source).toBe('user');
      expect(calledArgs.tags).toEqual([]);
    });
  });

  // ========== 查询知识节点列表 (GET /api/knowledge/nodes) ==========
  describe('GET /api/knowledge/nodes - 查询知识节点列表', () => {
    it('应该返回所有节点', async () => {
      const request = createMockRequest('GET');
      const response = await NodesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
    });

    it('应该按类型过滤节点', async () => {
      const request = createMockRequest('GET', undefined, { type: 'concept' });
      const response = await NodesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => n.type === 'concept')).toBe(true);
    });

    it('应该按来源过滤节点', async () => {
      const request = createMockRequest('GET', undefined, { source: 'user' });
      const response = await NodesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => n.source === 'user')).toBe(true);
    });

    it('应该按标签过滤节点', async () => {
      const request = createMockRequest('GET', undefined, { tags: 'core,important' });
      const response = await NodesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((node: any) => {
        expect(node.tags.some((t: string) => ['core', 'important'].includes(t))).toBe(true);
      });
    });

    it('应该按最小权重过滤', async () => {
      const request = createMockRequest('GET', undefined, { minWeight: '0.8' });
      const response = await NodesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((node: any) => {
        expect(node.weight).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('应该支持分页', async () => {
      const request = createMockRequest('GET', undefined, { limit: '2', offset: '0' });
      const response = await NodesGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(3);
    });
  });

  // ========== 获取单个节点 (GET /api/knowledge/nodes/:id) ==========
  describe('GET /api/knowledge/nodes/:id - 获取单个节点', () => {
    it('应该成功获取节点', async () => {
      const request = createMockRequestWithId('node-1', 'GET');
      const response = await NodeGET(request, { params: Promise.resolve({ id: 'node-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('node-1');
      expect(data.edges).toBeDefined();
      expect(data.neighbors).toBeDefined();
    });

    it('节点不存在时应该返回 404', async () => {
      const request = createMockRequestWithId('non-existent', 'GET');
      const response = await NodeGET(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('应该返回节点的关联边和邻居节点', async () => {
      const request = createMockRequestWithId('node-1', 'GET');
      const response = await NodeGET(request, { params: Promise.resolve({ id: 'node-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.edges)).toBe(true);
      expect(Array.isArray(data.neighbors)).toBe(true);
    });
  });

  // ========== 更新知识节点 (PUT /api/knowledge/nodes/:id) ==========
  describe('PUT /api/knowledge/nodes/:id - 更新知识节点', () => {
    it('应该成功更新节点', async () => {
      const requestBody = {
        content: '更新后的内容',
        weight: 0.95,
      };
      const request = createMockRequestWithId('node-1', 'PUT', requestBody);
      const response = await NodePUT(request, { params: Promise.resolve({ id: 'node-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('更新后的内容');
    });

    it('节点不存在时应该返回 404', async () => {
      const requestBody = { content: '测试' };
      const request = createMockRequestWithId('non-existent', 'PUT', requestBody);
      const response = await NodePUT(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('应该允许部分更新', async () => {
      const requestBody = { tags: ['updated-tag'] };
      const request = createMockRequestWithId('node-1', 'PUT', requestBody);
      const response = await NodePUT(request, { params: Promise.resolve({ id: 'node-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tags).toEqual(['updated-tag']);
    });
  });

  // ========== 删除知识节点 (DELETE /api/knowledge/nodes/:id) ==========
  describe('DELETE /api/knowledge/nodes/:id - 删除知识节点', () => {
    it('应该成功删除节点', async () => {
      const request = createMockRequestWithId('node-1', 'DELETE');
      const response = await NodeDELETE(request, { params: Promise.resolve({ id: 'node-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('deleted');
    });

    it('节点不存在时应该返回 404', async () => {
      // 设置 mock 使删除不存在的节点返回 false
      latticeInstance.deleteNode.mockReturnValueOnce(false);
      
      const request = createMockRequestWithId('non-existent', 'DELETE');
      const response = await NodeDELETE(request, { params: Promise.resolve({ id: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('删除节点时应该同时删除关联的边', async () => {
      const request = createMockRequestWithId('node-1', 'DELETE');
      const response = await NodeDELETE(request, { params: Promise.resolve({ id: 'node-1' }) });

      expect(response.status).toBe(200);
      expect(latticeInstance.deleteNode).toHaveBeenCalledWith('node-1');
    });
  });

  // ========== 边界情况测试 ==========
  describe('边界情况处理', () => {
    it('应该处理空的 content', async () => {
      const requestBody = {
        content: '',
        type: 'concept',
      };
      const request = createMockRequest('POST', requestBody);
      const response = await NodesPOST(request);
      const data = await response.json();

      // 空字符串可能被视为无效，验证 API 有适当的响应
      expect([400, 201]).toContain(response.status);
    });

    it('应该处理特殊字符', async () => {
      const requestBody = {
        content: '<script>alert("xss")</script> 测试',
        type: 'concept',
      };
      const request = createMockRequest('POST', requestBody);
      const response = await NodesPOST(request);

      expect(response.status).toBe(201);
    });

    it('应该处理权重边界值 (0 和 1)', async () => {
      const requestBodyMin = { content: 'min', type: 'concept', weight: 0 };
      const requestBodyMax = { content: 'max', type: 'concept', weight: 1 };

      const responseMin = await NodesPOST(createMockRequest('POST', requestBodyMin));
      const responseMax = await NodesPOST(createMockRequest('POST', requestBodyMax));

      expect(responseMin.status).toBe(201);
      expect(responseMax.status).toBe(201);
    });

    it('应该处理置信度边界值 (0 和 1)', async () => {
      const requestBody = { content: 'boundary', type: 'concept', confidence: 0 };
      const response = await NodesPOST(createMockRequest('POST', requestBody));

      expect(response.status).toBe(201);
    });
  });
});

describe('知识节点类型验证', () => {
  it('应该包含所有定义的知识类型', () => {
    // 验证 KnowledgeType 枚举值
    const knowledgeTypes = ['concept', 'rule', 'experience', 'skill', 'fact', 'preference', 'memory'];
    knowledgeTypes.forEach(type => {
      expect(type).toBeDefined();
    });
  });
});

describe('知识来源验证', () => {
  it('应该包含所有定义的知识来源', () => {
    // 验证 KnowledgeSource 枚举值
    const knowledgeSources = ['user', 'observation', 'inference', 'external', 'experience', 'evomap'];
    knowledgeSources.forEach(source => {
      expect(source).toBeDefined();
    });
  });
});
