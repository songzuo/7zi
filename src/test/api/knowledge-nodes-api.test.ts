/**
 * Knowledge API 全面单元测试
 * 测试知识图谱 API 的所有端点
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock KnowledgeLattice class - must be before any imports that use it
const mockLattice = {
  getAllNodes: vi.fn(),
  getNode: vi.fn(),
  addNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  getNodesByType: vi.fn(),
  getNodesByTag: vi.fn(),
  getNodesBySource: vi.fn(),
};

// Mock the KnowledgeLattice class constructor
vi.mock('@/lib/agents/knowledge-lattice', () => {
  return {
    KnowledgeLattice: vi.fn().mockImplementation(() => mockLattice),
    KnowledgeType: {
      CONCEPT: 'concept',
      FACT: 'fact',
      RULE: 'rule',
      PROCESS: 'process',
      RESOURCE: 'resource',
      INSIGHT: 'insight',
    },
    KnowledgeSource: {
      USER: 'user',
      AI: 'ai',
      EXTERNAL: 'external',
      SYSTEM: 'system',
    },
  };
});

// Import route handlers AFTER mock is set up
// and re-import them in beforeEach to reset the singleton
let getNodes: (request: NextRequest) => Promise<Response>;
let postNodes: (request: NextRequest) => Promise<Response>;

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
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Knowledge Nodes API', () => {
  beforeEach(async () => {
    // Reset modules to clear the singleton latticeInstance in the route
    vi.resetModules();
    
    // Re-import the mocked module and route handlers
    const routeModule = await import('@/app/api/knowledge/nodes/route');
    getNodes = routeModule.GET;
    postNodes = routeModule.POST;
    
    // Reset mock functions
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/knowledge/nodes', () => {
    it('应该返回所有节点', async () => {
      const mockNodes = [
        { id: 'node-1', content: '概念1', type: 'concept', weight: 0.8 },
        { id: 'node-2', content: '事实1', type: 'fact', weight: 0.6 },
      ];
      mockLattice.getAllNodes.mockReturnValue(mockNodes);

      const request = createMockRequest('GET');
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockNodes);
    });

    it('应该按类型过滤节点', async () => {
      const mockNodes = [
        { id: 'node-1', content: '概念1', type: 'concept', weight: 0.8 },
        { id: 'node-2', content: '概念2', type: 'concept', weight: 0.7 },
        { id: 'node-3', content: '事实1', type: 'fact', weight: 0.6 },
      ];
      mockLattice.getAllNodes.mockReturnValue(mockNodes);

      const request = createMockRequest('GET', undefined, { type: 'concept' });
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => n.type === 'concept')).toBe(true);
    });

    it('应该按来源过滤节点', async () => {
      const mockNodes = [
        { id: 'node-1', content: '用户知识', type: 'concept', source: 'user' },
        { id: 'node-2', content: 'AI知识', type: 'fact', source: 'ai' },
      ];
      mockLattice.getAllNodes.mockReturnValue(mockNodes);

      const request = createMockRequest('GET', undefined, { source: 'user' });
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => n.source === 'user')).toBe(true);
    });

    it('应该按标签过滤节点', async () => {
      const mockNodes = [
        { id: 'node-1', content: '重要概念', type: 'concept', tags: ['important', 'core'] },
        { id: 'node-2', content: '一般概念', type: 'concept', tags: ['general'] },
      ];
      mockLattice.getAllNodes.mockReturnValue(mockNodes);

      const request = createMockRequest('GET', undefined, { tags: 'important,core' });
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => 
        n.tags.some((t: string) => ['important', 'core'].includes(t))
      )).toBe(true);
    });

    it('应该按最小权重过滤节点', async () => {
      const mockNodes = [
        { id: 'node-1', content: '高权重', type: 'concept', weight: 0.9 },
        { id: 'node-2', content: '中等权重', type: 'concept', weight: 0.6 },
        { id: 'node-3', content: '低权重', type: 'concept', weight: 0.3 },
      ];
      mockLattice.getAllNodes.mockReturnValue(mockNodes);

      const request = createMockRequest('GET', undefined, { minWeight: '0.5' });
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => n.weight >= 0.5)).toBe(true);
    });

    it('应该按最小置信度过滤节点', async () => {
      const mockNodes = [
        { id: 'node-1', content: '高置信', type: 'fact', confidence: 0.95 },
        { id: 'node-2', content: '中等置信', type: 'fact', confidence: 0.7 },
      ];
      mockLattice.getAllNodes.mockReturnValue(mockNodes);

      const request = createMockRequest('GET', undefined, { minConfidence: '0.8' });
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.every((n: any) => n.confidence >= 0.8)).toBe(true);
    });

    it('应该支持分页', async () => {
      const mockNodes = Array.from({ length: 25 }, (_, i) => ({
        id: `node-${i}`,
        content: `节点${i}`,
        type: 'concept',
        weight: 0.5,
      }));
      mockLattice.getAllNodes.mockReturnValue(mockNodes);

      const request = createMockRequest('GET', undefined, { limit: '10', offset: '5' });
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(10);
      expect(data.pagination.total).toBe(25);
      expect(data.pagination.offset).toBe(5);
      expect(data.pagination.limit).toBe(10);
    });

    it('应该支持组合过滤条件', async () => {
      const mockNodes = [
        { id: 'node-1', content: '用户概念', type: 'concept', source: 'user', weight: 0.8 },
        { id: 'node-2', content: 'AI概念', type: 'concept', source: 'ai', weight: 0.9 },
        { id: 'node-3', content: '用户事实', type: 'fact', source: 'user', weight: 0.7 },
      ];
      mockLattice.getAllNodes.mockReturnValue(mockNodes);

      const request = createMockRequest('GET', undefined, { 
        type: 'concept', 
        source: 'user',
        minWeight: '0.5'
      });
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.length).toBe(1);
      expect(data.data[0].id).toBe('node-1');
    });

    it('空结果时应该返回空数组', async () => {
      mockLattice.getAllNodes.mockReturnValue([]);

      const request = createMockRequest('GET');
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it('错误时应该返回 500', async () => {
      mockLattice.getAllNodes.mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = createMockRequest('GET');
      const response = await getNodes(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/knowledge/nodes', () => {
    it('应该创建新节点', async () => {
      const newNode = {
        content: '新知识节点',
        type: 'concept',
        weight: 0.8,
        confidence: 0.9,
        source: 'user',
      };
      
      mockLattice.addNode.mockReturnValue('node-new');
      mockLattice.getNode.mockReturnValue({
        id: 'node-new',
        ...newNode,
        timestamp: Date.now(),
      });

      const request = createMockRequest('POST', newNode);
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe(newNode.content);
    });

    it('缺少 content 时应该返回 400', async () => {
      const request = createMockRequest('POST', { type: 'concept' });
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('content');
    });

    it('缺少 type 时应该返回 400', async () => {
      const request = createMockRequest('POST', { content: '测试内容' });
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('type');
    });

    it('无效类型时应该返回 400', async () => {
      const request = createMockRequest('POST', {
        content: '测试内容',
        type: 'invalid_type',
      });
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid type');
    });

    it('应该使用默认值', async () => {
      mockLattice.addNode.mockReturnValue('node-default');
      mockLattice.getNode.mockReturnValue({
        id: 'node-default',
        content: '默认值测试',
        type: 'concept',
        weight: 0.5,
        confidence: 0.5,
        source: 'user',
      });

      const request = createMockRequest('POST', {
        content: '默认值测试',
        type: 'concept',
      });
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.weight).toBe(0.5);
      expect(data.data.confidence).toBe(0.5);
    });

    it('应该支持添加标签', async () => {
      mockLattice.addNode.mockReturnValue('node-tags');
      mockLattice.getNode.mockReturnValue({
        id: 'node-tags',
        content: '带标签的节点',
        type: 'concept',
        tags: ['important', 'ai-generated'],
      });

      const request = createMockRequest('POST', {
        content: '带标签的节点',
        type: 'concept',
        tags: ['important', 'ai-generated'],
      });
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.tags).toEqual(['important', 'ai-generated']);
    });

    it('应该支持添加元数据', async () => {
      mockLattice.addNode.mockReturnValue('node-meta');
      mockLattice.getNode.mockReturnValue({
        id: 'node-meta',
        content: '带元数据的节点',
        type: 'fact',
        metadata: { author: 'AI', version: '1.0' },
      });

      const request = createMockRequest('POST', {
        content: '带元数据的节点',
        type: 'fact',
        metadata: { author: 'AI', version: '1.0' },
      });
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.metadata).toEqual({ author: 'AI', version: '1.0' });
    });

    it('应该支持添加嵌入向量', async () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockLattice.addNode.mockReturnValue('node-embedding');
      mockLattice.getNode.mockReturnValue({
        id: 'node-embedding',
        content: '带嵌入的节点',
        type: 'concept',
        embedding,
      });

      const request = createMockRequest('POST', {
        content: '带嵌入的节点',
        type: 'concept',
        embedding,
      });
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.embedding).toEqual(embedding);
    });

    it('错误时应该返回 500', async () => {
      mockLattice.addNode.mockImplementation(() => {
        throw new Error('Failed to add node');
      });

      const request = createMockRequest('POST', {
        content: '测试',
        type: 'concept',
      });
      const response = await postNodes(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});

describe('Knowledge API - 边界情况', () => {
  let getNodes: (request: NextRequest) => Promise<Response>;
  let postNodes: (request: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const routeModule = await import('@/app/api/knowledge/nodes/route');
    getNodes = routeModule.GET;
    postNodes = routeModule.POST;
    vi.clearAllMocks();
  });

  it('应该处理超长内容', async () => {
    const longContent = 'A'.repeat(10000);
    mockLattice.addNode.mockReturnValue('node-long');
    mockLattice.getNode.mockReturnValue({
      id: 'node-long',
      content: longContent,
      type: 'concept',
    });

    const request = createMockRequest('POST', {
      content: longContent,
      type: 'concept',
    });
    const response = await postNodes(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.content.length).toBe(10000);
  });

  it('应该处理特殊字符内容', async () => {
    const specialContent = '<script>alert("XSS")</script> 测试内容 🎉';
    mockLattice.addNode.mockReturnValue('node-special');
    mockLattice.getNode.mockReturnValue({
      id: 'node-special',
      content: specialContent,
      type: 'concept',
    });

    const request = createMockRequest('POST', {
      content: specialContent,
      type: 'concept',
    });
    const response = await postNodes(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.content).toBe(specialContent);
  });

  it('应该处理极端权重值', async () => {
    mockLattice.addNode.mockReturnValue('node-weight');
    mockLattice.getNode.mockReturnValue({
      id: 'node-weight',
      content: '极端权重',
      type: 'concept',
      weight: 0.0,
    });

    const request = createMockRequest('POST', {
      content: '极端权重',
      type: 'concept',
      weight: 0.0,
    });
    const response = await postNodes(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.weight).toBe(0.0);
  });

  it('应该处理大量标签', async () => {
    const manyTags = Array.from({ length: 100 }, (_, i) => `tag-${i}`);
    mockLattice.addNode.mockReturnValue('node-many-tags');
    mockLattice.getNode.mockReturnValue({
      id: 'node-many-tags',
      content: '多标签节点',
      type: 'concept',
      tags: manyTags,
    });

    const request = createMockRequest('POST', {
      content: '多标签节点',
      type: 'concept',
      tags: manyTags,
    });
    const response = await postNodes(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.tags.length).toBe(100);
  });

  it('应该处理大量分页请求', async () => {
    const manyNodes = Array.from({ length: 1000 }, (_, i) => ({
      id: `node-${i}`,
      content: `节点${i}`,
      type: 'concept',
      weight: 0.5,
    }));
    mockLattice.getAllNodes.mockReturnValue(manyNodes);

    const request = createMockRequest('GET', undefined, { limit: '100', offset: '500' });
    const response = await getNodes(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.length).toBe(100);
    expect(data.pagination.total).toBe(1000);
  });
});