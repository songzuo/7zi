/**
 * Knowledge API 单元测试
 * 测试知识图谱 API 的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/knowledge/nodes/route';

// Mock 依赖
vi.mock('@/lib/agents/knowledge-lattice', () => {
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
    {
      id: 'node-4',
      content: '测试经验',
      type: 'experience',
      weight: 0.6,
      confidence: 0.7,
      source: 'experience',
      timestamp: 1700000000003,
      metadata: {},
      tags: ['learning'],
    },
  ];

  return {
    KnowledgeLattice: vi.fn(function () {
      return {
        getAllNodes: vi.fn(() => [...mockNodes]),
        getNode: vi.fn((id: string) => mockNodes.find((n) => n.id === id)),
        addNode: vi.fn((node: any) => node.id || 'new-node-id'),
        updateNode: vi.fn((id: string, updates: any) => ({ ...mockNodes.find((n) => n.id === id), ...updates })),
        deleteNode: vi.fn((id: string) => true),
        getEdges: vi.fn(() => []),
        addEdge: vi.fn((edge: any) => edge.id || 'new-edge-id'),
        query: vi.fn(() => mockNodes),
        getLattice: vi.fn(() => ({})),
      };
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
  };
});

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    audit: vi.fn(),
    info: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// 辅助函数
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

describe('Knowledge Nodes API 单元测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/knowledge/nodes', () => {
    it('应该返回所有节点', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(4);
    });

    it('应该按类型过滤节点', async () => {
      const request = createMockRequest('GET', undefined, { type: 'concept' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => n.type === 'concept')).toBe(true);
    });

    it('应该按来源过滤节点', async () => {
      const request = createMockRequest('GET', undefined, { source: 'user' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => n.source === 'user')).toBe(true);
    });

    it('应该按标签过滤节点', async () => {
      const request = createMockRequest('GET', undefined, { tags: 'core,important' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((node: any) => {
        expect(node.tags.some((t: string) => ['core', 'important'].includes(t))).toBe(true);
      });
    });

    it('应该按最小权重过滤', async () => {
      const request = createMockRequest('GET', undefined, { minWeight: '0.8' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((node: any) => {
        expect(node.weight).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('应该按最小置信度过滤', async () => {
      const request = createMockRequest('GET', undefined, { minConfidence: '0.9' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.forEach((node: any) => {
        expect(node.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('应该支持分页 - limit', async () => {
      const request = createMockRequest('GET', undefined, { limit: '2' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(4);
      expect(data.pagination.limit).toBe(2);
    });

    it('应该支持分页 - offset', async () => {
      const request = createMockRequest('GET', undefined, { offset: '2', limit: '1' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.pagination.offset).toBe(2);
    });

    it('应该返回正确的分页元数据', async () => {
      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(4);
      expect(data.pagination.offset).toBe(0);
      expect(data.pagination.limit).toBe(4);
    });

    it('当没有匹配节点时应返回空数组', async () => {
      const request = createMockRequest('GET', undefined, { type: 'nonexistent' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });
  });

  describe('POST /api/knowledge/nodes', () => {
    it('应该创建新节点', async () => {
      const requestBody = {
        content: '新知识节点',
        type: 'concept',
        weight: 0.8,
        confidence: 0.9,
        source: 'user',
        tags: ['new'],
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('应该验证必填字段 - content', async () => {
      const requestBody = {
        type: 'concept',
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('content');
    });

    it('应该验证必填字段 - type', async () => {
      const requestBody = {
        content: '测试内容',
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
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
      const response = await POST(request);
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
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.weight).toBe(0.5);
      expect(data.data.confidence).toBe(0.5);
      expect(data.data.source).toBe('user');
      expect(data.data.tags).toEqual([]);
      expect(data.data.metadata).toEqual({});
    });

    it('应该接受 embedding', async () => {
      const requestBody = {
        content: '带嵌入的节点',
        type: 'concept',
        embedding: [0.1, 0.2, 0.3, 0.4],
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('应该接受 metadata', async () => {
      const requestBody = {
        content: '带元数据的节点',
        type: 'fact',
        metadata: { author: 'test', version: 1 },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('应该接受 tags 数组', async () => {
      const requestBody = {
        content: '带标签的节点',
        type: 'skill',
        tags: ['important', 'learning', 'core'],
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('节点操作边界情况', () => {
    it('应该处理空的 content', async () => {
      const requestBody = {
        content: '',
        type: 'concept',
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      // 空字符串会被认为是有效值
      expect(response.status).toBe(201);
    });

    it('应该处理特殊字符 content', async () => {
      const requestBody = {
        content: '<script>alert("xss")</script> 测试',
        type: 'concept',
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('应该处理最大权重值', async () => {
      const requestBody = {
        content: '最大权重节点',
        type: 'concept',
        weight: 1.0,
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('应该处理最小权重值', async () => {
      const requestBody = {
        content: '最小权重节点',
        type: 'concept',
        weight: 0.0,
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});

describe('Knowledge Type 枚举测试', () => {
  it('应该包含所有定义的知识类型', async () => {
    const { KnowledgeType } = await import('@/lib/agents/knowledge-lattice');
    
    expect(KnowledgeType.CONCEPT).toBe('concept');
    expect(KnowledgeType.RULE).toBe('rule');
    expect(KnowledgeType.EXPERIENCE).toBe('experience');
    expect(KnowledgeType.SKILL).toBe('skill');
    expect(KnowledgeType.FACT).toBe('fact');
    expect(KnowledgeType.PREFERENCE).toBe('preference');
    expect(KnowledgeType.MEMORY).toBe('memory');
  });
});

describe('Knowledge Source 枚举测试', () => {
  it('应该包含所有定义的知识来源', async () => {
    const { KnowledgeSource } = await import('@/lib/agents/knowledge-lattice');
    
    expect(KnowledgeSource.USER).toBe('user');
    expect(KnowledgeSource.OBSERVATION).toBe('observation');
    expect(KnowledgeSource.INFERENCE).toBe('inference');
    expect(KnowledgeSource.EXTERNAL).toBe('external');
    expect(KnowledgeSource.EXPERIENCE).toBe('experience');
    expect(KnowledgeSource.EVOMAP).toBe('evomap');
  });
});
