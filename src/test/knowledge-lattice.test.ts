/**
 * KnowledgeLattice 单元测试
 *
 * 测试覆盖:
 * - 类的实例化
 * - addNode 方法 - 添加知识节点
 * - addEdge 方法 - 添加知识边
 * - query 方法 - 查询知识
 * - getLattice/export 方法 - 获取晶格数据
 * - 事件发射功能测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KnowledgeLattice, KnowledgeType, KnowledgeSource, RelationType } from '@/lib/agents/knowledge-lattice';

describe('KnowledgeLattice', () => {
  let lattice: KnowledgeLattice;

  beforeEach(() => {
    lattice = new KnowledgeLattice();
  });

  afterEach(() => {
    lattice.clear();
  });

  // ============== 1. 类的实例化 ==============

  describe('实例化', () => {
    it('应该成功创建 KnowledgeLattice 实例', () => {
      expect(lattice).toBeInstanceOf(KnowledgeLattice);
    });

    it('新实例应该为空（无节点和边）', () => {
      const nodes = lattice.getAllNodes();
      const edges = lattice.getAllEdges();

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('实例应该继承 EventEmitter', () => {
      expect(typeof lattice.on).toBe('function');
      expect(typeof lattice.emit).toBe('function');
      expect(typeof lattice.listeners).toBe('function');
    });
  });

  // ============== 2. addNode 方法 - 添加知识节点 ==============

  describe('addNode - 添加知识节点', () => {
    it('应该成功添加一个知识节点', () => {
      const node = {
        id: 'node-1',
        content: '测试概念',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
      };

      const nodeId = lattice.addNode(node);

      expect(nodeId).toBe('node-1');
      expect(lattice.getNode('node-1')).toEqual(expect.objectContaining({
        id: 'node-1',
        content: '测试概念',
        type: KnowledgeType.CONCEPT,
      }));
    });

    it('未提供 ID 时应该自动生成 ID', () => {
      const node = {
        content: '测试节点',
        type: KnowledgeType.FACT,
        weight: 0.7,
        confidence: 0.8,
        source: KnowledgeSource.OBSERVATION,
        metadata: {},
      };

      const nodeId = lattice.addNode(node);

      expect(nodeId).toMatch(/^node-\d+-[a-z0-9]+$/);
    });

    it('应该添加带标签的节点', () => {
      const node = {
        id: 'node-with-tags',
        content: '带标签的节点',
        type: KnowledgeType.SKILL,
        weight: 0.9,
        confidence: 0.95,
        source: KnowledgeSource.EXPERIENCE,
        metadata: {},
        tags: ['important', 'core', 'ai'],
      };

      lattice.addNode(node);
      const retrieved = lattice.getNode('node-with-tags');

      expect(retrieved?.tags).toContain('important');
      expect(retrieved?.tags).toContain('core');
      expect(retrieved?.tags).toContain('ai');
    });

    it('应该添加带 embedding 的节点', () => {
      const node = {
        id: 'node-embedding',
        content: '带向量的节点',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.INFERENCE,
        metadata: {},
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      };

      lattice.addNode(node);
      const retrieved = lattice.getNode('node-embedding');

      expect(retrieved?.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it('应该为没有 timestamp 的节点自动添加时间戳', () => {
      const node = {
        id: 'node-no-timestamp',
        content: '无时间戳节点',
        type: KnowledgeType.MEMORY,
        weight: 0.5,
        confidence: 0.6,
        source: KnowledgeSource.USER,
        metadata: {},
      };

      const beforeAdd = Date.now();
      lattice.addNode(node);
      const afterAdd = Date.now();

      const retrieved = lattice.getNode('node-no-timestamp');
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(beforeAdd);
      expect(retrieved?.timestamp).toBeLessThanOrEqual(afterAdd);
    });

    it('应该能添加多个节点', () => {
      const node1 = { id: 'node-1', content: '节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} };
      const node2 = { id: 'node-2', content: '节点2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.OBSERVATION, metadata: {} };
      const node3 = { id: 'node-3', content: '节点3', type: KnowledgeType.RULE, weight: 0.9, confidence: 0.95, source: KnowledgeSource.INFERENCE, metadata: {} };

      lattice.addNode(node1);
      lattice.addNode(node2);
      lattice.addNode(node3);

      const nodes = lattice.getAllNodes();
      expect(nodes).toHaveLength(3);
    });

    it('添加节点后应该触发 nodeAdded 事件', () => {
      const node = {
        id: 'event-test-node',
        content: '事件测试节点',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
      };

      const listener = vi.fn();
      lattice.on('nodeAdded', listener);

      lattice.addNode(node);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        id: 'event-test-node',
        content: '事件测试节点',
      }));
    });
  });

  // ============== 3. addEdge 方法 - 添加知识边 ==============

  describe('addEdge - 添加知识边', () => {
    beforeEach(() => {
      // 先添加两个节点
      lattice.addNode({
        id: 'node-a',
        content: '节点A',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
      });
      lattice.addNode({
        id: 'node-b',
        content: '节点B',
        type: KnowledgeType.FACT,
        weight: 0.7,
        confidence: 0.8,
        source: KnowledgeSource.OBSERVATION,
        metadata: {},
      });
    });

    it('应该成功添加一条知识边', () => {
      const edge = {
        id: 'edge-1',
        from: 'node-a',
        to: 'node-b',
        type: RelationType.ASSOCIATION,
        weight: 0.8,
        metadata: {},
      };

      const edgeId = lattice.addEdge(edge);

      expect(edgeId).toBe('edge-1');
      expect(lattice.getEdge('edge-1')).toEqual(expect.objectContaining({
        id: 'edge-1',
        from: 'node-a',
        to: 'node-b',
        type: RelationType.ASSOCIATION,
      }));
    });

    it('未提供 ID 时应该自动生成 ID', () => {
      const edge = {
        from: 'node-a',
        to: 'node-b',
        type: RelationType.CAUSAL,
        weight: 0.9,
        metadata: {},
      };

      const edgeId = lattice.addEdge(edge);

      // 验证返回的是非空字符串（自动生成的 ID）
      expect(edgeId).toBeTruthy();
      expect(typeof edgeId).toBe('string');
    });

    it('节点不存在时应该抛出错误', () => {
      const edge = {
        from: 'non-existent',
        to: 'node-a',
        type: RelationType.ASSOCIATION,
        weight: 0.8,
        metadata: {},
      };

      expect(() => lattice.addEdge(edge)).toThrow('Both nodes must exist before adding an edge');
    });

    it('应该添加多种关系类型的边', () => {
      lattice.addNode({ id: 'node-c', content: '节点C', type: KnowledgeType.RULE, weight: 0.9, confidence: 0.95, source: KnowledgeSource.INFERENCE, metadata: {} });

      const edges = [
        { id: 'edge-partial', from: 'node-a', to: 'node-c', type: RelationType.PARTIAL_ORDER, weight: 0.8 },
        { id: 'edge-equivalence', from: 'node-b', to: 'node-c', type: RelationType.EQUIVALENCE, weight: 0.9 },
        { id: 'edge-complement', from: 'node-a', to: 'node-b', type: RelationType.COMPLEMENT, weight: 0.7 },
        { id: 'edge-causal', from: 'node-a', to: 'node-c', type: RelationType.CAUSAL, weight: 0.95 },
      ];

      edges.forEach(edge => lattice.addEdge(edge));

      const allEdges = lattice.getAllEdges();
      expect(allEdges).toHaveLength(4);
    });

    it('添加边后应该触发 edgeAdded 事件', () => {
      const edge = {
        id: 'event-test-edge',
        from: 'node-a',
        to: 'node-b',
        type: RelationType.ASSOCIATION,
        weight: 0.8,
        metadata: {},
      };

      const listener = vi.fn();
      lattice.on('edgeAdded', listener);

      lattice.addEdge(edge);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        id: 'event-test-edge',
        from: 'node-a',
        to: 'node-b',
      }));
    });

    it('应该能获取节点相关的边', () => {
      lattice.addNode({ id: 'node-d', content: '节点D', type: KnowledgeType.EXPERIENCE, weight: 0.6, confidence: 0.7, source: KnowledgeSource.EXPERIENCE, metadata: {} });

      lattice.addEdge({ from: 'node-a', to: 'node-b', type: RelationType.ASSOCIATION, weight: 0.8 });
      lattice.addEdge({ from: 'node-a', to: 'node-d', type: RelationType.CAUSAL, weight: 0.9 });
      lattice.addEdge({ from: 'node-b', to: 'node-d', type: RelationType.PARTIAL_ORDER, weight: 0.7 });

      const adjacentEdges = lattice.getAdjacentEdges('node-a');
      expect(adjacentEdges).toHaveLength(2);
    });
  });

  // ============== 4. query 方法 - 查询知识 ==============

  describe('query - 查询知识', () => {
    beforeEach(() => {
      // 添加多个测试节点
      lattice.addNode({
        id: 'concept-1',
        content: 'AI 概念',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
        tags: ['ai', 'core'],
      });
      lattice.addNode({
        id: 'fact-1',
        content: '机器学习是 AI 的子领域',
        type: KnowledgeType.FACT,
        weight: 0.9,
        confidence: 0.95,
        source: KnowledgeSource.OBSERVATION,
        metadata: {},
        tags: ['ai', 'ml'],
      });
      lattice.addNode({
        id: 'rule-1',
        content: '深度学习规则',
        type: KnowledgeType.RULE,
        weight: 0.7,
        confidence: 0.8,
        source: KnowledgeSource.INFERENCE,
        metadata: {},
        tags: ['ai', 'dl'],
      });
      lattice.addNode({
        id: 'skill-1',
        content: '编程技能',
        type: KnowledgeType.SKILL,
        weight: 0.6,
        confidence: 0.7,
        source: KnowledgeSource.EXPERIENCE,
        metadata: {},
        tags: ['coding'],
      });

      // 添加边
      lattice.addEdge({ from: 'concept-1', to: 'fact-1', type: RelationType.PARTIAL_ORDER, weight: 0.9 });
      lattice.addEdge({ from: 'fact-1', to: 'rule-1', type: RelationType.ASSOCIATION, weight: 0.8 });
    });

    it('无过滤条件时应该返回所有节点', () => {
      const result = lattice.query();

      expect(result.nodes).toHaveLength(4);
      expect(result.edges).toHaveLength(2);
    });

    it('应该能按类型过滤', () => {
      const result = lattice.query({ type: KnowledgeType.CONCEPT });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('concept-1');
    });

    it('应该能按来源过滤', () => {
      const result = lattice.query({ source: KnowledgeSource.USER });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].source).toBe(KnowledgeSource.USER);
    });

    it('应该能按标签过滤', () => {
      const result = lattice.query({ tags: ['ai'] });

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.map(n => n.id)).toContain('concept-1');
      expect(result.nodes.map(n => n.id)).toContain('fact-1');
      expect(result.nodes.map(n => n.id)).toContain('rule-1');
    });

    it('应该能按最小权重过滤', () => {
      const result = lattice.query({ minWeight: 0.75 });

      // 节点权重: concept-1=0.8, fact-1=0.9, rule-1=0.7, skill-1=0.6
      // minWeight=0.75 过滤后应该只有 concept-1 (0.8) 和 fact-1 (0.9)
      expect(result.nodes).toHaveLength(2);
      result.nodes.forEach(node => {
        expect(node.weight).toBeGreaterThanOrEqual(0.75);
      });
    });

    it('应该能按最小可信度过滤', () => {
      const result = lattice.query({ minConfidence: 0.85 });

      expect(result.nodes).toHaveLength(2);
      result.nodes.forEach(node => {
        expect(node.confidence).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('应该能组合多个过滤条件', () => {
      const result = lattice.query({
        type: KnowledgeType.CONCEPT,
        minWeight: 0.5,
        minConfidence: 0.5,
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('concept-1');
    });

    it('应该返回相关性分数', () => {
      const result = lattice.query();

      expect(result.relevanceScores).toBeDefined();
      expect(result.relevanceScores.length).toBe(result.nodes.length);
      result.relevanceScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('过滤后应该只返回相关的边', () => {
      const result = lattice.query({ type: KnowledgeType.CONCEPT });

      // 只有 concept-1 节点，所以应该没有边
      expect(result.edges).toHaveLength(0);
    });
  });

  // ============== 5. getLattice/export 方法 - 获取晶格数据 ==============

  describe('getLattice/export - 获取晶格数据', () => {
    beforeEach(() => {
      // 添加测试数据
      lattice.addNode({ id: 'n1', content: '节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'n2', content: '节点2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.OBSERVATION, metadata: {} });
      lattice.addEdge({ from: 'n1', to: 'n2', type: RelationType.ASSOCIATION, weight: 0.8 });
    });

    it('export 应该返回所有节点和边', () => {
      const data = lattice.export();

      expect(data.nodes).toHaveLength(2);
      expect(data.edges).toHaveLength(1);
    });

    it('export 应该包含完整的节点数据', () => {
      const data = lattice.export();

      expect(data.nodes[0]).toEqual(expect.objectContaining({
        id: 'n1',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
      }));
    });

    it('export 应该包含完整的边数据', () => {
      const data = lattice.export();

      expect(data.edges[0]).toEqual(expect.objectContaining({
        from: 'n1',
        to: 'n2',
        type: RelationType.ASSOCIATION,
      }));
    });

    it('getStats 应该返回正确的统计信息', () => {
      const stats = lattice.getStats();

      expect(stats.totalNodes).toBe(2);
      expect(stats.totalEdges).toBe(1);
      expect(stats.nodesByType[KnowledgeType.CONCEPT]).toBe(1);
      expect(stats.nodesByType[KnowledgeType.FACT]).toBe(1);
      expect(stats.edgesByType[RelationType.ASSOCIATION]).toBe(1);
    });

    it('getStats 应该计算平均权重和可信度', () => {
      const stats = lattice.getStats();

      expect(stats.averageWeight).toBeCloseTo(0.75, 2);
      expect(stats.averageConfidence).toBeCloseTo(0.85, 2);
    });

    it('import 应该正确导入数据', () => {
      const newLattice = new KnowledgeLattice();

      const importData = {
        nodes: [
          { id: 'import-1', content: '导入节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, timestamp: Date.now(), metadata: {} },
          { id: 'import-2', content: '导入节点2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.OBSERVATION, timestamp: Date.now(), metadata: {} },
        ],
        edges: [
          { id: 'import-edge-1', from: 'import-1', to: 'import-2', type: RelationType.CAUSAL, weight: 0.9, timestamp: Date.now() },
        ],
      };

      newLattice.import(importData);

      expect(newLattice.getAllNodes()).toHaveLength(2);
      expect(newLattice.getAllEdges()).toHaveLength(1);
    });

    it('import 应该触发 imported 事件', () => {
      const newLattice = new KnowledgeLattice();

      const listener = vi.fn();
      newLattice.on('imported', listener);

      newLattice.import({
        nodes: [{ id: 'i1', content: 'test', type: KnowledgeType.CONCEPT, weight: 0.5, confidence: 0.5, source: KnowledgeSource.USER, timestamp: Date.now(), metadata: {} }],
        edges: [],
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // ============== 6. 事件发射功能测试 ==============

  describe('事件发射功能', () => {
    it('nodeAdded 事件应该正确发射', () => {
      const listener = vi.fn();
      lattice.on('nodeAdded', listener);

      lattice.addNode({
        id: 'test-node',
        content: '测试',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('nodeUpdated 事件应该正确发射', () => {
      lattice.addNode({
        id: 'update-test',
        content: '原始内容',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const listener = vi.fn();
      lattice.on('nodeUpdated', listener);

      lattice.updateNode('update-test', { content: '更新内容' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        content: '更新内容',
      }));
    });

    it('nodeDeleted 事件应该正确发射', () => {
      lattice.addNode({
        id: 'delete-test',
        content: '将被删除',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const listener = vi.fn();
      lattice.on('nodeDeleted', listener);

      lattice.deleteNode('delete-test');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('delete-test');
    });

    it('edgeAdded 事件应该正确发射', () => {
      lattice.addNode({ id: 'e-test-1', content: '节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'e-test-2', content: '节点2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.OBSERVATION, metadata: {} });

      const listener = vi.fn();
      lattice.on('edgeAdded', listener);

      lattice.addEdge({
        from: 'e-test-1',
        to: 'e-test-2',
        type: RelationType.ASSOCIATION,
        weight: 0.8,
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('edgeDeleted 事件应该正确发射', () => {
      lattice.addNode({ id: 'd-edge-1', content: '节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'd-edge-2', content: '节点2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.OBSERVATION, metadata: {} });

      lattice.addEdge({
        id: 'del-edge',
        from: 'd-edge-1',
        to: 'd-edge-2',
        type: RelationType.ASSOCIATION,
        weight: 0.8,
      });

      const listener = vi.fn();
      lattice.on('edgeDeleted', listener);

      lattice.deleteEdge('del-edge');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('del-edge');
    });

    it('cleared 事件应该正确发射', () => {
      lattice.addNode({ id: 'c1', content: '节点', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });

      const listener = vi.fn();
      lattice.on('cleared', listener);

      lattice.clear();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('应该支持多个事件监听器', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      lattice.on('nodeAdded', listener1);
      lattice.on('nodeAdded', listener2);

      lattice.addNode({
        id: 'multi-listener',
        content: '测试',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
      });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('应该能移除事件监听器', () => {
      const listener = vi.fn();
      lattice.on('nodeAdded', listener);
      lattice.off('nodeAdded', listener);

      lattice.addNode({
        id: 'after-remove',
        content: '测试',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        metadata: {},
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ============== 其他功能测试 ==============

  describe('其他功能', () => {
    it('getNodesByType 应该正确按类型获取节点', () => {
      lattice.addNode({ id: 'c1', content: '概念', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'f1', content: '事实', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'c2', content: '概念2', type: KnowledgeType.CONCEPT, weight: 0.6, confidence: 0.7, source: KnowledgeSource.USER, metadata: {} });

      const concepts = lattice.getNodesByType(KnowledgeType.CONCEPT);

      expect(concepts).toHaveLength(2);
    });

    it('getNodesByTag 应该正确按标签获取节点', () => {
      lattice.addNode({ id: 't1', content: '节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {}, tags: ['tag1', 'tag2'] });
      lattice.addNode({ id: 't2', content: '节点2', type: KnowledgeType.CONCEPT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.USER, metadata: {}, tags: ['tag2'] });
      lattice.addNode({ id: 't3', content: '节点3', type: KnowledgeType.CONCEPT, weight: 0.6, confidence: 0.7, source: KnowledgeSource.USER, metadata: {}, tags: ['tag3'] });

      const nodesWithTag2 = lattice.getNodesByTag('tag2');

      expect(nodesWithTag2).toHaveLength(2);
    });

    it('getNodesBySource 应该正确按来源获取节点', () => {
      lattice.addNode({ id: 's1', content: '节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 's2', content: '节点2', type: KnowledgeType.CONCEPT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.OBSERVATION, metadata: {} });
      lattice.addNode({ id: 's3', content: '节点3', type: KnowledgeType.CONCEPT, weight: 0.6, confidence: 0.7, source: KnowledgeSource.USER, metadata: {} });

      const userNodes = lattice.getNodesBySource(KnowledgeSource.USER);

      expect(userNodes).toHaveLength(2);
    });

    it('deleteNode 应该同时删除相关边', () => {
      lattice.addNode({ id: 'del-n1', content: '节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'del-n2', content: '节点2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.USER, metadata: {} });
      lattice.addEdge({ from: 'del-n1', to: 'del-n2', type: RelationType.ASSOCIATION, weight: 0.8 });

      lattice.deleteNode('del-n1');

      expect(lattice.getNode('del-n1')).toBeUndefined();
      expect(lattice.getAllEdges()).toHaveLength(0);
    });

    it('deleteEdge 应该只删除指定的边', () => {
      lattice.addNode({ id: 'e-del-1', content: '节点1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'e-del-2', content: '节点2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'e-del-3', content: '节点3', type: KnowledgeType.RULE, weight: 0.6, confidence: 0.7, source: KnowledgeSource.USER, metadata: {} });

      lattice.addEdge({ id: 'edge-keep', from: 'e-del-1', to: 'e-del-2', type: RelationType.ASSOCIATION, weight: 0.8 });
      lattice.addEdge({ id: 'edge-remove', from: 'e-del-2', to: 'e-del-3', type: RelationType.CAUSAL, weight: 0.9 });

      lattice.deleteEdge('edge-remove');

      expect(lattice.getEdge('edge-keep')).toBeDefined();
      expect(lattice.getEdge('edge-remove')).toBeUndefined();
      expect(lattice.getAllEdges()).toHaveLength(1);
    });

    it('findPath 应该能找到节点间的路径', () => {
      lattice.addNode({ id: 'path-a', content: 'A', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'path-b', content: 'B', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'path-c', content: 'C', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'path-d', content: 'D', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });

      lattice.addEdge({ from: 'path-a', to: 'path-b', type: RelationType.PARTIAL_ORDER, weight: 0.8 });
      lattice.addEdge({ from: 'path-b', to: 'path-c', type: RelationType.PARTIAL_ORDER, weight: 0.8 });
      lattice.addEdge({ from: 'path-c', to: 'path-d', type: RelationType.PARTIAL_ORDER, weight: 0.8 });

      const path = lattice.findPath('path-a', 'path-d');

      expect(path).toEqual(['path-a', 'path-b', 'path-c', 'path-d']);
    });

    it('findPath 应该返回 null 当路径不存在时', () => {
      lattice.addNode({ id: 'no-path-a', content: 'A', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'no-path-b', content: 'B', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.USER, metadata: {} });

      const path = lattice.findPath('no-path-a', 'no-path-b');

      expect(path).toBeNull();
    });

    it('infer 应该返回推理结果', () => {
      lattice.addNode({ id: 'inf-1', content: '基础概念', type: KnowledgeType.CONCEPT, weight: 0.9, confidence: 0.95, source: KnowledgeSource.USER, metadata: {} });
      lattice.addNode({ id: 'inf-2', content: '相关事实', type: KnowledgeType.FACT, weight: 0.8, confidence: 0.9, source: KnowledgeSource.OBSERVATION, metadata: {} });
      lattice.addEdge({ from: 'inf-1', to: 'inf-2', type: RelationType.ASSOCIATION, weight: 0.8 });

      const result = lattice.infer('inf-1');

      expect(result).not.toBeNull();
      expect(result?.supportingNodes.length).toBeGreaterThan(0);
      expect(result?.path).toContain('inf-1');
    });

    it('empty lattice 的 getStats 应该返回正确的初始值', () => {
      const stats = lattice.getStats();

      expect(stats.totalNodes).toBe(0);
      expect(stats.totalEdges).toBe(0);
      expect(stats.averageWeight).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });
  });
});
