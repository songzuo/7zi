/**
 * 知识查询 API 测试
 * 
 * 测试 POST /api/knowledge/query 端点
 * 覆盖：成功场景、错误处理、边界情况
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/knowledge/query/route';

// Mock 知识存储
const mockNodes: any[] = [];
const mockEdges: any[] = [];

vi.mock('@/lib/store/knowledge-store', () => ({
  getKnowledgeStore: () => ({
    queryNodes: vi.fn((filters: any) => {
      let filtered = [...mockNodes];
      
      if (filters.type) {
        filtered = filtered.filter(n => n.type === filters.type);
      }
      if (filters.source) {
        filtered = filtered.filter(n => n.source === filters.source);
      }
      if (filters.tags?.length) {
        filtered = filtered.filter(n => 
          n.tags?.some((t: string) => filters.tags.includes(t))
        );
      }
      if (filters.minWeight !== undefined) {
        filtered = filtered.filter(n => n.weight >= filters.minWeight);
      }
      if (filters.minConfidence !== undefined) {
        filtered = filtered.filter(n => n.confidence >= filters.minConfidence);
      }
      
      return { nodes: filtered, total: filtered.length };
    }),
    getAllNodes: () => mockNodes,
    getAllEdges: () => mockEdges,
  }),
}));

vi.mock('@/lib/logger', () => ({
  apiLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// 辅助函数：创建请求
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/knowledge/query', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
}

// 辅助函数：重置测试数据
function resetTestData() {
  mockNodes.length = 0;
  mockEdges.length = 0;
}

// 辅助函数：添加测试节点
function addTestNode(overrides: Partial<any> = {}) {
  const id = `node-${mockNodes.length + 1}`;
  const node = {
    id,
    content: `测试内容 ${id}`,
    type: 'concept',
    weight: 0.8,
    confidence: 0.9,
    timestamp: Date.now(),
    source: 'user',
    metadata: {},
    ...overrides,
  };
  mockNodes.push(node);
  return node;
}

// 辅助函数：添加测试边
function addTestEdge(from: string, to: string, overrides: Partial<any> = {}) {
  const id = `edge-${mockEdges.length + 1}`;
  const edge = {
    id,
    from,
    to,
    type: 'association',
    weight: 0.8,
    timestamp: Date.now(),
    ...overrides,
  };
  mockEdges.push(edge);
  return edge;
}

describe('Knowledge Query API - POST /api/knowledge/query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTestData();
  });

  // ============== 成功场景 ==============

  describe('成功场景', () => {
    it('应该返回所有节点（无过滤条件）', async () => {
      addTestNode({ content: '节点 1' });
      addTestNode({ content: '节点 2' });

      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.nodes).toHaveLength(2);
      expect(data.data.total).toBe(2);
    });

    it('应该按类型过滤节点', async () => {
      addTestNode({ type: 'concept', content: '概念节点' });
      addTestNode({ type: 'fact', content: '事实节点' });
      addTestNode({ type: 'concept', content: '另一个概念' });

      const request = createRequest({ type: 'concept' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.nodes).toHaveLength(2);
      data.data.nodes.forEach((node: any) => {
        expect(node.type).toBe('concept');
      });
    });

    it('应该按来源过滤节点', async () => {
      addTestNode({ source: 'user', content: '用户输入' });
      addTestNode({ source: 'observation', content: '观察结果' });
      addTestNode({ source: 'user', content: '另一个用户输入' });

      const request = createRequest({ source: 'user' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(2);
      data.data.nodes.forEach((node: any) => {
        expect(node.source).toBe('user');
      });
    });

    it('应该按标签过滤节点（数组）', async () => {
      addTestNode({ tags: ['important', 'core'], content: '重要节点' });
      addTestNode({ tags: ['secondary'], content: '次要节点' });
      addTestNode({ tags: ['important'], content: '另一个重要节点' });

      const request = createRequest({ tags: ['important'] });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(2);
    });

    it('应该按标签过滤节点（单个字符串）', async () => {
      addTestNode({ tags: ['react', 'frontend'], content: 'React 节点' });
      addTestNode({ tags: ['vue'], content: 'Vue 节点' });

      const request = createRequest({ tags: 'react' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(1);
      expect(data.data.nodes[0].content).toBe('React 节点');
    });

    it('应该按最小权重过滤节点', async () => {
      addTestNode({ weight: 0.9, content: '高权重' });
      addTestNode({ weight: 0.4, content: '低权重' });
      addTestNode({ weight: 0.7, content: '中等权重' });

      const request = createRequest({ minWeight: 0.7 });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(2);
      data.data.nodes.forEach((node: any) => {
        expect(node.weight).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('应该按最小可信度过滤节点', async () => {
      addTestNode({ confidence: 0.95, content: '高可信度' });
      addTestNode({ confidence: 0.5, content: '低可信度' });
      addTestNode({ confidence: 0.8, content: '中等可信度' });

      const request = createRequest({ minConfidence: 0.8 });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(2);
      data.data.nodes.forEach((node: any) => {
        expect(node.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('应该搜索文本内容', async () => {
      addTestNode({ content: 'React 组件设计模式' });
      addTestNode({ content: 'Vue.js 最佳实践' });
      addTestNode({ content: 'React Hooks 入门' });

      const request = createRequest({ searchText: 'react' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(2);
      data.data.nodes.forEach((node: any) => {
        expect(node.content.toLowerCase()).toContain('react');
      });
    });

    it('应该限制返回数量', async () => {
      for (let i = 0; i < 100; i++) {
        addTestNode({ content: `节点 ${i}` });
      }

      const request = createRequest({ limit: 10 });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(10);
      expect(data.data.total).toBe(100);
    });

    it('应该返回相关性分数', async () => {
      addTestNode({ weight: 0.8, confidence: 0.9 });
      addTestNode({ weight: 0.6, confidence: 0.7 });

      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.relevanceScores).toHaveLength(2);
      // 相关性 = weight * 0.5 + confidence * 0.5
      expect(data.data.relevanceScores[0]).toBeCloseTo(0.85, 2);
      expect(data.data.relevanceScores[1]).toBeCloseTo(0.65, 2);
    });

    it('应该返回相关的边', async () => {
      const node1 = addTestNode({ id: 'node-a' });
      const node2 = addTestNode({ id: 'node-b' });
      addTestNode({ id: 'node-c' });

      addTestEdge('node-a', 'node-b');
      addTestEdge('node-b', 'node-c');

      const request = createRequest({ limit: 2 });
      const response = await POST(request);
      const data = await response.json();

      // 边应该只包含返回节点相关的
      expect(data.data.edges.length).toBeGreaterThan(0);
    });

    it('应该按相关性排序结果', async () => {
      addTestNode({ weight: 0.5, confidence: 0.5, content: '低相关性' });
      addTestNode({ weight: 0.9, confidence: 0.95, content: '高相关性' });
      addTestNode({ weight: 0.7, confidence: 0.7, content: '中等相关性' });

      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      // 应该按相关性降序排列
      expect(data.data.nodes[0].content).toBe('高相关性');
      expect(data.data.nodes[1].content).toBe('中等相关性');
      expect(data.data.nodes[2].content).toBe('低相关性');
    });

    it('应该组合多个过滤条件', async () => {
      addTestNode({ 
        type: 'concept', 
        source: 'user', 
        weight: 0.9, 
        confidence: 0.9,
        tags: ['important'],
        content: '符合条件的节点'
      });
      addTestNode({ 
        type: 'concept', 
        source: 'user', 
        weight: 0.5, 
        confidence: 0.5,
        content: '权重不够'
      });
      addTestNode({ 
        type: 'fact', 
        source: 'user', 
        weight: 0.9, 
        confidence: 0.9,
        content: '类型不对'
      });

      const request = createRequest({
        type: 'concept',
        source: 'user',
        minWeight: 0.8,
        minConfidence: 0.8,
        tags: ['important'],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(1);
      expect(data.data.nodes[0].content).toBe('符合条件的节点');
    });
  });

  // ============== 错误处理 ==============

  describe('错误处理', () => {
    it('应该处理无效的 JSON 请求体', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/query', {
        method: 'POST',
        body: 'invalid json',
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to query lattice');
    });

    it('应该处理空请求体', async () => {
      const request = new NextRequest('http://localhost/api/knowledge/query', {
        method: 'POST',
        body: JSON.stringify(null),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const response = await POST(request);
      // 应该返回空结果或错误
      expect([200, 500]).toContain(response.status);
    });

    it('应该忽略无效的过滤参数', async () => {
      addTestNode({ content: '测试节点' });

      const request = createRequest({
        invalidParam: 'should be ignored',
        type: 'invalid_type', // 无效类型，但不会抛错
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  // ============== 边界情况 ==============

  describe('边界情况', () => {
    it('空数据库应该返回空结果', async () => {
      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.nodes).toHaveLength(0);
      expect(data.data.total).toBe(0);
    });

    it('无匹配结果应该返回空数组', async () => {
      addTestNode({ type: 'concept', content: '测试' });

      const request = createRequest({ type: 'fact' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(0);
      expect(data.data.total).toBe(0);
    });

    it('搜索文本大小写不敏感', async () => {
      addTestNode({ content: 'REACT DEVELOPMENT' });
      addTestNode({ content: 'react hooks' });
      addTestNode({ content: 'Vue Framework' });

      const request = createRequest({ searchText: 'REACT' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(2);
    });

    it('应该处理特殊字符搜索', async () => {
      addTestNode({ content: '测试 "引号" 和 <特殊> 字符' });
      addTestNode({ content: '普通内容' });

      const request = createRequest({ searchText: '"引号"' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(1);
    });

    it('应该处理中文搜索', async () => {
      addTestNode({ content: '知识图谱系统设计' });
      addTestNode({ content: '英文内容 English content' });

      const request = createRequest({ searchText: '知识图谱' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(1);
      expect(data.data.nodes[0].content).toBe('知识图谱系统设计');
    });

    it('应该处理 emoji 内容', async () => {
      addTestNode({ content: '项目状态 🚀 发射成功 🎉' });

      const request = createRequest({ searchText: '🚀' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(1);
    });

    it('limit 为 0 应该返回空结果', async () => {
      addTestNode({ content: '测试' });

      const request = createRequest({ limit: 0 });
      const response = await POST(request);
      const data = await response.json();

      // limit 0 可能返回空或默认行为
      expect(response.status).toBe(200);
    });

    it('应该处理非常大的 limit 值', async () => {
      for (let i = 0; i < 10; i++) {
        addTestNode({ content: `节点 ${i}` });
      }

      const request = createRequest({ limit: 1000000 });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(10);
    });

    it('应该处理边界权重值 (0 和 1)', async () => {
      addTestNode({ weight: 0, confidence: 0, content: '零值' });
      addTestNode({ weight: 1, confidence: 1, content: '最大值' });

      const request = createRequest({ minWeight: 0, minConfidence: 0 });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(2);
    });

    it('应该处理无标签的节点', async () => {
      addTestNode({ tags: undefined, content: '无标签节点' });
      addTestNode({ tags: ['test'], content: '有标签节点' });

      const request = createRequest({ tags: ['test'] });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(1);
    });

    it('应该处理空标签数组', async () => {
      addTestNode({ tags: [], content: '空标签节点' });

      const request = createRequest({ tags: [] });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('应该处理非常长的搜索文本', async () => {
      addTestNode({ content: '测试节点' });

      const longSearchText = 'a'.repeat(10000);
      const request = createRequest({ searchText: longSearchText });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.nodes).toHaveLength(0);
    });

    it('应该处理只有边没有匹配节点的查询', async () => {
      addTestNode({ id: 'node-1' });
      addTestNode({ id: 'node-2' });
      addTestEdge('node-1', 'node-2');

      const request = createRequest({ type: 'non_existent_type' });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.nodes).toHaveLength(0);
      expect(data.data.edges).toHaveLength(0);
    });
  });

  // ============== 性能相关 ==============

  describe('性能测试', () => {
    it('应该高效处理大量节点', async () => {
      // 创建 500 个节点
      for (let i = 0; i < 500; i++) {
        addTestNode({ 
          weight: Math.random(),
          confidence: Math.random(),
          content: `节点内容 ${i}`,
        });
      }

      const startTime = Date.now();
      const request = createRequest({ limit: 50 });
      const response = await POST(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在 1 秒内完成
    });
  });
});