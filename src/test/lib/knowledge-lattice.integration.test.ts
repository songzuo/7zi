/**
 * 知识晶格系统集成测试
 * 
 * 测试多个方法协同工作的场景
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

describe('KnowledgeLattice Integration Tests', () => {
  let lattice: KnowledgeLattice;

  beforeEach(() => {
    lattice = new KnowledgeLattice();
  });

  // ============== 场景测试 ==============

  describe('Knowledge Management Workflow', () => {
    it('应该支持完整的知识管理流程', () => {
      // 1. 添加多个知识节点
      const conceptNode: LatticeNode = {
        id: 'concept-1',
        content: '机器学习是一种人工智能技术',
        type: KnowledgeType.CONCEPT,
        weight: 0.9,
        confidence: 0.95,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: { domain: 'AI' },
        tags: ['AI', 'ML', 'core'],
      };

      const ruleNode: LatticeNode = {
        id: 'rule-1',
        content: '如果数据量大，使用深度学习',
        type: KnowledgeType.RULE,
        weight: 0.8,
        confidence: 0.85,
        timestamp: Date.now(),
        source: KnowledgeSource.EXPERIENCE,
        metadata: { condition: 'large-data' },
        tags: ['ML', 'rule'],
      };

      const experienceNode: LatticeNode = {
        id: 'exp-1',
        content: '使用 ResNet 在图像分类任务中效果很好',
        type: KnowledgeType.EXPERIENCE,
        weight: 0.85,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.EXPERIENCE,
        metadata: { task: 'image-classification' },
        tags: ['DL', 'CNN'],
      };

      const factNode: LatticeNode = {
        id: 'fact-1',
        content: 'Python 是最流行的 AI 开发语言',
        type: KnowledgeType.FACT,
        weight: 0.7,
        confidence: 0.8,
        timestamp: Date.now(),
        source: KnowledgeSource.OBSERVATION,
        metadata: {},
        tags: ['programming'],
      };

      // 添加所有节点
      lattice.addNode(conceptNode);
      lattice.addNode(ruleNode);
      lattice.addNode(experienceNode);
      lattice.addNode(factNode);

      // 2. 建立关系
      const edges: LatticeEdge[] = [
        {
          id: 'edge-1',
          from: 'concept-1',
          to: 'rule-1',
          type: RelationType.CAUSAL,
          weight: 0.9,
          timestamp: Date.now(),
        },
        {
          id: 'edge-2',
          from: 'rule-1',
          to: 'exp-1',
          type: RelationType.ASSOCIATION,
          weight: 0.85,
          timestamp: Date.now(),
        },
        {
          id: 'edge-3',
          from: 'concept-1',
          to: 'fact-1',
          type: RelationType.ASSOCIATION,
          weight: 0.7,
          timestamp: Date.now(),
        },
      ];

      edges.forEach(edge => lattice.addEdge(edge));

      // 3. 验证节点数量
      expect(lattice.getAllNodes().length).toBe(4);
      expect(lattice.getAllEdges().length).toBe(3);

      // 4. 按类型查询
      const concepts = lattice.getNodesByType(KnowledgeType.CONCEPT);
      expect(concepts.length).toBe(1);
      expect(concepts[0].id).toBe('concept-1');

      // 5. 按标签查询
      const mlNodes = lattice.getNodesByTag('ML');
      expect(mlNodes.length).toBe(2);

      // 6. 复杂查询
      const highQualityNodes = lattice.query({
        minWeight: 0.8,
        minConfidence: 0.85,
      });
      expect(highQualityNodes.nodes.length).toBe(3);

      // 7. 查找路径
      const path = lattice.findPath('concept-1', 'exp-1');
      expect(path).toEqual(['concept-1', 'rule-1', 'exp-1']);

      // 8. 查找最近邻
      const neighbors = lattice.findNearestNeighbors('concept-1', 2);
      expect(neighbors.length).toBe(2);

      // 9. 推理
      const inference = lattice.infer('concept-1');
      expect(inference).toBeDefined();
      expect(inference?.supportingNodes.length).toBeGreaterThan(0);

      // 10. 获取统计
      const stats = lattice.getStats();
      expect(stats.totalNodes).toBe(4);
      expect(stats.totalEdges).toBe(3);
      expect(stats.nodesByType[KnowledgeType.CONCEPT]).toBe(1);
      expect(stats.nodesByType[KnowledgeType.RULE]).toBe(1);
      expect(stats.nodesByType[KnowledgeType.EXPERIENCE]).toBe(1);
      expect(stats.nodesByType[KnowledgeType.FACT]).toBe(1);
    });
  });

  describe('Knowledge Evolution', () => {
    it('应该支持知识的演化和更新', () => {
      // 1. 初始知识
      const initialNode: LatticeNode = {
        id: 'evolving-1',
        content: '初始版本的知识',
        type: KnowledgeType.CONCEPT,
        weight: 0.5,
        confidence: 0.6,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: { version: 1 },
      };

      lattice.addNode(initialNode);

      // 2. 更新知识（提高可信度）
      const updated1 = lattice.updateNode('evolving-1', {
        content: '经过验证的知识',
        confidence: 0.8,
        metadata: { version: 2 },
      });

      expect(updated1?.confidence).toBe(0.8);
      expect(updated1?.metadata.version).toBe(2);

      // 3. 再次更新（基于新证据）
      const updated2 = lattice.updateNode('evolving-1', {
        confidence: 0.95,
        weight: 0.9,
        source: KnowledgeSource.EXPERIENCE,
        metadata: { version: 3, verified: true },
      });

      expect(updated2?.confidence).toBe(0.95);
      expect(updated2?.weight).toBe(0.9);

      // 4. 添加相关知识
      const relatedNode: LatticeNode = {
        id: 'evolving-2',
        content: '相关知识',
        type: KnowledgeType.RULE,
        weight: 0.8,
        confidence: 0.85,
        timestamp: Date.now(),
        source: KnowledgeSource.INFERENCE,
        metadata: {},
      };

      lattice.addNode(relatedNode);

      const edge: LatticeEdge = {
        id: 'evolving-edge',
        from: 'evolving-1',
        to: 'evolving-2',
        type: RelationType.CAUSAL,
        weight: 0.9,
        timestamp: Date.now(),
      };

      lattice.addEdge(edge);

      // 5. 验证演化后的结构
      const stats = lattice.getStats();
      expect(stats.totalNodes).toBe(2);
      expect(stats.averageConfidence).toBeGreaterThan(0.8);
    });
  });

  describe('Knowledge Network Analysis', () => {
    it('应该支持知识网络分析', () => {
      // 创建一个知识网络
      const nodes: LatticeNode[] = [
        { id: 'hub', content: '中心知识', type: KnowledgeType.CONCEPT, weight: 0.95, confidence: 0.95, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {}, tags: ['hub'] },
        { id: 'leaf-1', content: '叶子 1', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
        { id: 'leaf-2', content: '叶子 2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
        { id: 'leaf-3', content: '叶子 3', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
        { id: 'bridge', content: '桥梁知识', type: KnowledgeType.RULE, weight: 0.8, confidence: 0.85, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
      ];

      nodes.forEach(node => lattice.addNode(node));

      // 创建星型结构
      const edges: LatticeEdge[] = [
        { id: 'hub-1', from: 'hub', to: 'leaf-1', type: RelationType.ASSOCIATION, weight: 0.9, timestamp: Date.now() },
        { id: 'hub-2', from: 'hub', to: 'leaf-2', type: RelationType.ASSOCIATION, weight: 0.9, timestamp: Date.now() },
        { id: 'hub-3', from: 'hub', to: 'leaf-3', type: RelationType.ASSOCIATION, weight: 0.9, timestamp: Date.now() },
        { id: 'hub-bridge', from: 'hub', to: 'bridge', type: RelationType.CAUSAL, weight: 0.95, timestamp: Date.now() },
        { id: 'bridge-1', from: 'bridge', to: 'leaf-1', type: RelationType.ASSOCIATION, weight: 0.8, timestamp: Date.now() },
      ];

      edges.forEach(edge => lattice.addEdge(edge));

      // 分析中心节点
      const hubEdges = lattice.getAdjacentEdges('hub');
      expect(hubEdges.length).toBe(4);

      // 分析叶子节点
      const leaf1Edges = lattice.getAdjacentEdges('leaf-1');
      expect(leaf1Edges.length).toBe(2);

      // 查找从 hub 到所有节点的路径
      for (const node of nodes) {
        if (node.id !== 'hub') {
          const path = lattice.findPath('hub', node.id);
          expect(path).toBeDefined();
          expect(path?.length).toBeLessThanOrEqual(3);
        }
      }

      // 查询高权重节点
      const highWeightNodes = lattice.query({ minWeight: 0.8 });
      expect(highWeightNodes.nodes.length).toBe(2); // hub 和 bridge
    });
  });

  describe('Knowledge Import/Export', () => {
    it('应该支持知识的导入导出循环', () => {
      // 1. 创建初始知识晶格
      const nodes: LatticeNode[] = [
        {
          id: 'export-1',
          content: '知识 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: { key: 'value1' },
          tags: ['tag1'],
        },
        {
          id: 'export-2',
          content: '知识 2',
          type: KnowledgeType.RULE,
          weight: 0.7,
          confidence: 0.85,
          timestamp: Date.now(),
          source: KnowledgeSource.EXPERIENCE,
          metadata: { key: 'value2' },
          tags: ['tag2'],
        },
      ];

      nodes.forEach(node => lattice.addNode(node));

      const edges: LatticeEdge[] = [
        {
          id: 'export-edge',
          from: 'export-1',
          to: 'export-2',
          type: RelationType.CAUSAL,
          weight: 0.9,
          timestamp: Date.now(),
          metadata: { relationship: 'causes' },
        },
      ];

      edges.forEach(edge => lattice.addEdge(edge));

      // 2. 导出
      const exported = lattice.export();
      expect(exported.nodes.length).toBe(2);
      expect(exported.edges.length).toBe(1);

      // 3. 创建新晶格并导入
      const newLattice = new KnowledgeLattice();
      newLattice.import(exported);

      // 4. 验证导入后的数据
      expect(newLattice.getAllNodes().length).toBe(2);
      expect(newLattice.getAllEdges().length).toBe(1);

      const importedNode1 = newLattice.getNode('export-1');
      expect(importedNode1).toBeDefined();
      expect(importedNode1?.content).toBe('知识 1');
      expect(importedNode1?.type).toBe(KnowledgeType.CONCEPT);
      expect(importedNode1?.tags).toEqual(['tag1']);

      const importedEdge = newLattice.getEdge('export-edge');
      expect(importedEdge).toBeDefined();
      expect(importedEdge?.type).toBe(RelationType.CAUSAL);

      // 5. 验证统计信息一致
      const originalStats = lattice.getStats();
      const importedStats = newLattice.getStats();
      expect(importedStats.totalNodes).toBe(originalStats.totalNodes);
      expect(importedStats.totalEdges).toBe(originalStats.totalEdges);
    });
  });

  describe('Event System', () => {
    it('应该正确触发所有事件', () => {
      const events: string[] = [];

      lattice.on('nodeAdded', (node) => {
        events.push(`nodeAdded:${node.id}`);
      });

      lattice.on('nodeUpdated', (node) => {
        events.push(`nodeUpdated:${node.id}`);
      });

      lattice.on('nodeDeleted', (id) => {
        events.push(`nodeDeleted:${id}`);
      });

      lattice.on('edgeAdded', (edge) => {
        events.push(`edgeAdded:${edge.id}`);
      });

      lattice.on('edgeDeleted', (id) => {
        events.push(`edgeDeleted:${id}`);
      });

      lattice.on('cleared', () => {
        events.push('cleared');
      });

      lattice.on('imported', () => {
        events.push('imported');
      });

      // 触发事件
      const node: LatticeNode = {
        id: 'event-node',
        content: '测试',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      };

      lattice.addNode(node);
      lattice.updateNode('event-node', { content: '更新' });

      const node2: LatticeNode = {
        id: 'event-node-2',
        content: '测试 2',
        type: KnowledgeType.FACT,
        weight: 0.7,
        confidence: 0.8,
        timestamp: Date.now(),
        source: KnowledgeSource.USER,
        metadata: {},
      };

      lattice.addNode(node2);

      const edge: LatticeEdge = {
        id: 'event-edge',
        from: 'event-node',
        to: 'event-node-2',
        type: RelationType.ASSOCIATION,
        weight: 0.9,
        timestamp: Date.now(),
      };

      lattice.addEdge(edge);
      lattice.deleteEdge('event-edge');
      lattice.deleteNode('event-node-2');
      lattice.clear();

      // 验证事件顺序
      expect(events).toEqual([
        'nodeAdded:event-node',
        'nodeUpdated:event-node',
        'nodeAdded:event-node-2',
        'edgeAdded:event-edge',
        'edgeDeleted:event-edge',
        'nodeDeleted:event-node-2',
        'cleared',
      ]);
    });
  });

  describe('Complex Query Scenarios', () => {
    it('应该支持复杂的多条件查询', () => {
      // 创建多样化的知识节点
      const nodes: LatticeNode[] = [
        { id: 'q1', content: '高权重概念', type: KnowledgeType.CONCEPT, weight: 0.95, confidence: 0.95, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {}, tags: ['important', 'core'] },
        { id: 'q2', content: '高权重事实', type: KnowledgeType.FACT, weight: 0.9, confidence: 0.85, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {}, tags: ['important'] },
        { id: 'q3', content: '低权重概念', type: KnowledgeType.CONCEPT, weight: 0.3, confidence: 0.9, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {}, tags: ['draft'] },
        { id: 'q4', content: '用户经验', type: KnowledgeType.EXPERIENCE, weight: 0.8, confidence: 0.95, timestamp: Date.now(), source: KnowledgeSource.EXPERIENCE, metadata: {}, tags: ['important', 'verified'] },
        { id: 'q5', content: '推理规则', type: KnowledgeType.RULE, weight: 0.85, confidence: 0.8, timestamp: Date.now(), source: KnowledgeSource.INFERENCE, metadata: {}, tags: ['core'] },
        { id: 'q6', content: '外部数据', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.6, timestamp: Date.now(), source: KnowledgeSource.EXTERNAL, metadata: {}, tags: ['external'] },
      ];

      nodes.forEach(node => lattice.addNode(node));

      // 查询 1: 高权重且高可信度的节点
      const query1 = lattice.query({
        minWeight: 0.8,
        minConfidence: 0.8,
      });
      expect(query1.nodes.length).toBe(4); // q1, q2, q4, q5

      // 查询 2: 特定类型的概念
      const query2 = lattice.query({
        type: KnowledgeType.CONCEPT,
        minWeight: 0.5,
      });
      expect(query2.nodes.length).toBe(1); // q1 only (q3 has low weight)

      // 查询 3: 带特定标签的节点
      const query3 = lattice.query({
        tags: ['important'],
      });
      expect(query3.nodes.length).toBe(3); // q1, q2, q4

      // 查询 4: 用户来源的高可信度知识
      const query4 = lattice.query({
        source: KnowledgeSource.USER,
        minConfidence: 0.9,
      });
      expect(query4.nodes.length).toBe(2); // q1, q2

      // 查询 5: 多标签查询（匹配任意标签）
      const query5 = lattice.query({
        tags: ['core', 'verified'],
      });
      expect(query5.nodes.length).toBe(3); // q1 (core), q4 (verified), q5 (core)
    });
  });

  describe('Inference Chain', () => {
    it('应该支持推理链的构建和遍历', () => {
      // 创建一个推理链：A -> B -> C -> D
      const nodes: LatticeNode[] = [
        { id: 'infer-a', content: '前提 A', type: KnowledgeType.FACT, weight: 0.9, confidence: 0.95, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {}, tags: ['premise'] },
        { id: 'infer-b', content: '规则 B', type: KnowledgeType.RULE, weight: 0.85, confidence: 0.9, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {}, tags: ['rule'] },
        { id: 'infer-c', content: '推论 C', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.85, timestamp: Date.now(), source: KnowledgeSource.INFERENCE, metadata: {}, tags: ['inference'] },
        { id: 'infer-d', content: '结论 D', type: KnowledgeType.CONCEPT, weight: 0.75, confidence: 0.8, timestamp: Date.now(), source: KnowledgeSource.INFERENCE, metadata: {}, tags: ['conclusion'] },
      ];

      nodes.forEach(node => lattice.addNode(node));

      const edges: LatticeEdge[] = [
        { id: 'infer-edge-1', from: 'infer-a', to: 'infer-b', type: RelationType.CAUSAL, weight: 0.95, timestamp: Date.now() },
        { id: 'infer-edge-2', from: 'infer-b', to: 'infer-c', type: RelationType.CAUSAL, weight: 0.9, timestamp: Date.now() },
        { id: 'infer-edge-3', from: 'infer-c', to: 'infer-d', type: RelationType.CAUSAL, weight: 0.85, timestamp: Date.now() },
      ];

      edges.forEach(edge => lattice.addEdge(edge));

      // 从前提开始推理
      const inference = lattice.infer('infer-a', 3);
      expect(inference).toBeDefined();
      expect(inference?.path).toContain('infer-a');
      expect(inference?.path.length).toBeGreaterThan(1);
      expect(inference?.supportingNodes.length).toBeGreaterThan(0);

      // 验证推理路径
      const fullPath = lattice.findPath('infer-a', 'infer-d');
      expect(fullPath).toEqual(['infer-a', 'infer-b', 'infer-c', 'infer-d']);
    });
  });

  describe('Knowledge Validation', () => {
    it('应该验证知识的完整性和一致性', () => {
      // 添加节点和边
      const nodes: LatticeNode[] = [
        { id: 'valid-1', content: '节点 1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
        { id: 'valid-2', content: '节点 2', type: KnowledgeType.FACT, weight: 0.7, confidence: 0.8, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
        { id: 'valid-3', content: '节点 3', type: KnowledgeType.RULE, weight: 0.75, confidence: 0.85, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
      ];

      nodes.forEach(node => lattice.addNode(node));

      const edges: LatticeEdge[] = [
        { id: 'valid-edge-1', from: 'valid-1', to: 'valid-2', type: RelationType.ASSOCIATION, weight: 0.9, timestamp: Date.now() },
        { id: 'valid-edge-2', from: 'valid-2', to: 'valid-3', type: RelationType.CAUSAL, weight: 0.85, timestamp: Date.now() },
      ];

      edges.forEach(edge => lattice.addEdge(edge));

      // 验证统计
      const stats = lattice.getStats();
      expect(stats.totalNodes).toBe(3);
      expect(stats.totalEdges).toBe(2);

      // 验证所有节点都可访问
      for (const node of nodes) {
        const retrieved = lattice.getNode(node.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(node.id);
      }

      // 验证所有边都可访问
      for (const edge of edges) {
        const retrieved = lattice.getEdge(edge.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(edge.id);
      }

      // 验证邻接关系
      const node1Edges = lattice.getAdjacentEdges('valid-1');
      expect(node1Edges.length).toBe(1);

      const node2Edges = lattice.getAdjacentEdges('valid-2');
      expect(node2Edges.length).toBe(2);

      const node3Edges = lattice.getAdjacentEdges('valid-3');
      expect(node3Edges.length).toBe(1);
    });
  });

  describe('Performance Scenario', () => {
    it('应该能处理大量节点', () => {
      // 添加 100 个节点
      const nodeCount = 100;
      for (let i = 0; i < nodeCount; i++) {
        const node: LatticeNode = {
          id: `perf-${i}`,
          content: `性能测试节点 ${i}`,
          type: Object.values(KnowledgeType)[i % Object.values(KnowledgeType).length],
          weight: Math.random(),
          confidence: Math.random(),
          timestamp: Date.now(),
          source: Object.values(KnowledgeSource)[i % Object.values(KnowledgeSource).length],
          metadata: { index: i },
          tags: [`tag-${i % 10}`],
        };
        lattice.addNode(node);
      }

      // 添加一些边
      for (let i = 0; i < nodeCount - 1; i += 2) {
        const edge: LatticeEdge = {
          id: `perf-edge-${i}`,
          from: `perf-${i}`,
          to: `perf-${i + 1}`,
          type: RelationType.ASSOCIATION,
          weight: Math.random(),
          timestamp: Date.now(),
        };
        lattice.addEdge(edge);
      }

      // 验证
      expect(lattice.getAllNodes().length).toBe(nodeCount);
      expect(lattice.getAllEdges().length).toBe(Math.floor(nodeCount / 2));

      // 查询性能
      const result = lattice.query({ minWeight: 0.5 });
      expect(result.nodes.length).toBeGreaterThan(0);

      // 统计性能
      const stats = lattice.getStats();
      expect(stats.totalNodes).toBe(nodeCount);
    });
  });
});
