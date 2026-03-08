/**
 * 知识晶格系统单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  KnowledgeLattice,
  KnowledgeType,
  KnowledgeSource,
  RelationType,
  LatticeNode,
  LatticeEdge,
} from '@/lib/agents/knowledge-lattice';

describe('KnowledgeLattice', () => {
  let lattice: KnowledgeLattice;

  beforeEach(() => {
    lattice = new KnowledgeLattice();
  });

  // ============== 节点操作测试 ==============

  describe('节点操作', () => {
    it('应该成功添加节点', () => {
      const node: LatticeNode = {
        id: 'test-node-1',
        content: '测试概念',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      };

      const nodeId = lattice.addNode(node);

      expect(nodeId).toBeDefined();
      expect(typeof nodeId).toBe('string');
      expect(lattice.getNode(nodeId)).toBeDefined();
    });

    it('应该获取已添加的节点', () => {
      const node: LatticeNode = {
        id: 'test-node-2',
        content: '测试概念',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      };

      const nodeId = lattice.addNode(node);
      const retrieved = lattice.getNode(nodeId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('测试概念');
      expect(retrieved?.type).toBe(KnowledgeType.CONCEPT);
    });

    it('应该更新节点', () => {
      const node: LatticeNode = {
        id: 'test-node-3',
        content: '原始内容',
        type: KnowledgeType.CONCEPT,
        weight: 0.5,
        confidence: 0.5,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      };

      const nodeId = lattice.addNode(node);
      const updated = lattice.updateNode(nodeId, {
        content: '更新后的内容',
        weight: 0.9,
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toBe('更新后的内容');
      expect(updated?.weight).toBe(0.9);
      expect(updated?.type).toBe(KnowledgeType.CONCEPT); // 不变
    });

    it('应该删除节点', () => {
      const node: LatticeNode = {
        id: 'test-node-4',
        content: '测试概念',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      };

      const nodeId = lattice.addNode(node);
      const deleted = lattice.deleteNode(nodeId);

      expect(deleted).toBe(true);
      expect(lattice.getNode(nodeId)).toBeUndefined();
    });

    it('应该按类型过滤节点', () => {
      lattice.addNode({
        id: 'test-node-100',
        content: '概念1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      lattice.addNode({
        id: 'test-node-101',
        content: '规则1',
        type: KnowledgeType.RULE,
        weight: 0.7,
        confidence: 0.8,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const concepts = lattice.getNodesByType(KnowledgeType.CONCEPT);

      expect(concepts).toHaveLength(1);
      expect(concepts[0].type).toBe(KnowledgeType.CONCEPT);
    });

    it('应该按标签过滤节点', () => {
      lattice.addNode({
        id: 'test-node-102',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        tags: ['tag1', 'tag2'],
        metadata: {},
      });

      lattice.addNode({
        id: 'test-node-103',
        content: '节点2',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        tags: ['tag3'],
        metadata: {},
      });

      const tagged = lattice.getNodesByTag('tag1');

      expect(tagged).toHaveLength(1);
      expect(tagged[0].tags).toContain('tag1');
    });
  });

  // ============== 边操作测试 ==============

  describe('边操作', () => {
    it('应该成功添加边', () => {
      const node1Id = lattice.addNode({
        id: 'test-node-104',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node2Id = lattice.addNode({
        id: 'test-node-105',
        content: '节点2',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const edge: LatticeEdge = {
        id: 'test-edge-200',
        from: node1Id,
        to: node2Id,
        type: RelationType.ASSOCIATION,
        weight: 0.7,
        timestamp: Date.now(),
      };

      const edgeId = lattice.addEdge(edge);

      expect(edgeId).toBeDefined();
      expect(typeof edgeId).toBe('string');
      expect(lattice.getEdge(edgeId)).toBeDefined();
    });

    it('应该获取节点相关的边', () => {
      const node1Id = lattice.addNode({
        id: 'test-node-106',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node2Id = lattice.addNode({
        id: 'test-node-107',
        content: '节点2',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node3Id = lattice.addNode({
        id: 'test-node-108',
        content: '节点3',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      lattice.addEdge({
        id: 'test-edge-300',
        from: node1Id,
        to: node2Id,
        type: RelationType.ASSOCIATION,
        weight: 0.7,
        timestamp: Date.now(),
      });

      lattice.addEdge({
        id: 'test-edge-301',
        from: node1Id,
        to: node3Id,
        type: RelationType.PARTIAL_ORDER,
        weight: 0.8,
        timestamp: Date.now(),
      });

      const edges = lattice.getAdjacentEdges(node1Id);

      expect(edges).toHaveLength(2);
    });

    it('应该删除边', () => {
      const node1Id = lattice.addNode({
        id: 'test-node-109',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node2Id = lattice.addNode({
        id: 'test-node-110',
        content: '节点2',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const edgeId = lattice.addEdge({
        id: 'test-edge-302',
        from: node1Id,
        to: node2Id,
        type: RelationType.ASSOCIATION,
        weight: 0.7,
        timestamp: Date.now(),
      });

      const deleted = lattice.deleteEdge(edgeId);

      expect(deleted).toBe(true);
      expect(lattice.getEdge(edgeId)).toBeUndefined();
    });
  });

  // ============== 晶格操作测试 ==============

  describe('晶格操作', () => {
    it('应该查找最近邻节点', () => {
      const node1Id = lattice.addNode({
        id: 'test-node-111',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node2Id = lattice.addNode({
        id: 'test-node-112',
        content: '节点2',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      lattice.addEdge({
        id: 'test-edge-303',
        from: node1Id,
        to: node2Id,
        type: RelationType.ASSOCIATION,
        weight: 0.7,
        timestamp: Date.now(),
      });

      const neighbors = lattice.findNearestNeighbors(node1Id, 5);

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].node.id).toBe(node2Id);
    });

    it('应该查找路径', () => {
      const node1Id = lattice.addNode({
        id: 'test-node-113',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node2Id = lattice.addNode({
        id: 'test-node-114',
        content: '节点2',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node3Id = lattice.addNode({
        id: 'test-node-115',
        content: '节点3',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      lattice.addEdge({
        id: 'test-edge-304',
        from: node1Id,
        to: node2Id,
        type: RelationType.ASSOCIATION,
        weight: 0.7,
        timestamp: Date.now(),
      });

      lattice.addEdge({
        id: 'test-edge-305',
        from: node2Id,
        to: node3Id,
        type: RelationType.ASSOCIATION,
        weight: 0.7,
        timestamp: Date.now(),
      });

      const path = lattice.findPath(node1Id, node3Id);

      expect(path).toEqual([node1Id, node2Id, node3Id]);
    });

    it('应该执行查询', () => {
      lattice.addNode({
        id: 'test-node-116',
        content: '概念1',
        type: KnowledgeType.CONCEPT,
        weight: 0.9,
        confidence: 0.8,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      lattice.addNode({
        id: 'test-node-117',
        content: '规则1',
        type: KnowledgeType.RULE,
        weight: 0.7,
        confidence: 0.6,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const result = lattice.query({
        type: KnowledgeType.CONCEPT,
        minWeight: 0.8,
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe(KnowledgeType.CONCEPT);
    });

    it('应该执行推理', () => {
      const node1Id = lattice.addNode({
        id: 'test-node-118',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node2Id = lattice.addNode({
        id: 'test-node-119',
        content: '节点2',
        type: KnowledgeType.RULE,
        weight: 0.7,
        confidence: 0.8,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      lattice.addEdge({
        id: 'test-edge-306',
        from: node1Id,
        to: node2Id,
        type: RelationType.CAUSAL,
        weight: 0.9,
        timestamp: Date.now(),
      });

      const result = lattice.infer(node1Id, 3);

      expect(result).toBeDefined();
      expect(result?.supportingNodes).toBeDefined();
      expect(result?.supportingNodes.length).toBeGreaterThan(0);
    });
  });

  // ============== 统计测试 ==============

  describe('统计', () => {
    it('应该返回正确的统计信息', () => {
      lattice.addNode({
        id: 'test-node-120',
        content: '概念1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      lattice.addNode({
        id: 'test-node-121',
        content: '规则1',
        type: KnowledgeType.RULE,
        weight: 0.7,
        confidence: 0.8,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node1Id = lattice.addNode({
        id: 'test-node-122',
        content: '概念2',
        type: KnowledgeType.CONCEPT,
        weight: 0.6,
        confidence: 0.7,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const node2Id = lattice.addNode({
        id: 'test-node-123',
        content: '规则2',
        type: KnowledgeType.RULE,
        weight: 0.5,
        confidence: 0.6,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      lattice.addEdge({
        id: 'test-edge-307',
        from: node1Id,
        to: node2Id,
        type: RelationType.ASSOCIATION,
        weight: 0.7,
        timestamp: Date.now(),
      });

      const stats = lattice.getStats();

      expect(stats.totalNodes).toBe(4);
      expect(stats.totalEdges).toBe(1);
      expect(stats.nodesByType[KnowledgeType.CONCEPT]).toBe(2);
      expect(stats.nodesByType[KnowledgeType.RULE]).toBe(2);
      expect(stats.averageWeight).toBeCloseTo(0.65);
      expect(stats.averageConfidence).toBeCloseTo(0.75);
    });
  });

  // ============== 导入导出测试 ==============

  describe('导入导出', () => {
    it('应该导出晶格数据', () => {
      lattice.addNode({
        id: 'test-node-124',
        content: '测试概念',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const data = lattice.export();

      expect(data.nodes).toBeDefined();
      expect(data.edges).toBeDefined();
      expect(data.nodes).toHaveLength(1);
      expect(data.edges).toHaveLength(0);
    });

    it('应该导入晶格数据', () => {
      const node1Id = lattice.addNode({
        id: 'test-node-125',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      const data = lattice.export();

      const newLattice = new KnowledgeLattice();
      newLattice.import(data);

      expect(newLattice.getAllNodes()).toHaveLength(1);
      expect(newLattice.getAllNodes()[0].content).toBe('节点1');
    });
  });

  // ============== 清空测试 ==============

  describe('清空', () => {
    it('应该清空晶格', () => {
      lattice.addNode({
        id: 'test-node-126',
        content: '节点1',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      });

      expect(lattice.getAllNodes()).toHaveLength(1);

      lattice.clear();

      expect(lattice.getAllNodes()).toHaveLength(0);
      expect(lattice.getAllEdges()).toHaveLength(0);
    });
  });
});
