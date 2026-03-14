/**
 * 知识晶格模块单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  KnowledgeLattice,
  KnowledgeType,
  KnowledgeSource,
  RelationType,
  LatticeNode,
  LatticeEdge,
} from './knowledge-lattice';

describe('KnowledgeLattice', () => {
  let lattice: KnowledgeLattice;

  // 测试用的辅助函数
  const createTestNode = (overrides: Partial<LatticeNode> = {}): LatticeNode => ({
    id: `test-node-${Date.now()}-${Math.random()}`,
    content: 'Test content',
    type: KnowledgeType.CONCEPT,
    weight: 0.8,
    confidence: 0.9,
    timestamp: Date.now(),
    source: KnowledgeSource.USER,
    metadata: {},
    ...overrides,
  });

  const createTestEdge = (
    from: string,
    to: string,
    overrides: Partial<LatticeEdge> = {}
  ): LatticeEdge => ({
    id: `test-edge-${Date.now()}-${Math.random()}`,
    from,
    to,
    type: RelationType.ASSOCIATION,
    weight: 0.7,
    timestamp: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    lattice = new KnowledgeLattice();
  });

  // ============== 构造函数和初始化 ==============
  describe('Constructor and Initialization', () => {
    it('should create an empty lattice', () => {
      expect(lattice).toBeInstanceOf(KnowledgeLattice);
      expect(lattice.getAllNodes()).toHaveLength(0);
      expect(lattice.getAllEdges()).toHaveLength(0);
    });

    it('should be an EventEmitter', () => {
      expect(typeof lattice.on).toBe('function');
      expect(typeof lattice.emit).toBe('function');
    });

    it('should have max listeners set to 100', () => {
      expect(lattice.getMaxListeners()).toBe(100);
    });

    it('should return empty stats for empty lattice', () => {
      const stats = lattice.getStats();
      expect(stats.totalNodes).toBe(0);
      expect(stats.totalEdges).toBe(0);
      expect(stats.averageWeight).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });
  });

  // ============== addNode 方法 ==============
  describe('addNode', () => {
    it('should add a node and return its id', () => {
      const node = createTestNode();
      const id = lattice.addNode(node);
      
      expect(id).toBeDefined();
      expect(id).toBe(node.id);
    });

    it('should generate id if not provided', () => {
      const node = createTestNode({ id: undefined as unknown as string });
      const id = lattice.addNode(node);
      
      expect(id).toBeDefined();
      expect(id).toMatch(/^node-/);
      expect(lattice.getNode(id)).toBeDefined();
    });

    it('should set timestamp if not provided', () => {
      const beforeTime = Date.now();
      const node = createTestNode({ timestamp: undefined as unknown as number });
      const id = lattice.addNode(node);
      const afterTime = Date.now();
      
      const addedNode = lattice.getNode(id);
      expect(addedNode?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(addedNode?.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should set empty metadata if not provided', () => {
      const node = createTestNode({ metadata: undefined as unknown as Record<string, unknown> });
      const id = lattice.addNode(node);
      
      const addedNode = lattice.getNode(id);
      expect(addedNode?.metadata).toEqual({});
    });

    it('should store all node properties', () => {
      const node = createTestNode({
        content: 'Custom content',
        type: KnowledgeType.SKILL,
        weight: 0.5,
        confidence: 0.7,
        tags: ['tag1', 'tag2'],
        embedding: [0.1, 0.2, 0.3],
      });
      const id = lattice.addNode(node);
      
      const stored = lattice.getNode(id);
      expect(stored).toEqual(expect.objectContaining({
        content: 'Custom content',
        type: KnowledgeType.SKILL,
        weight: 0.5,
        confidence: 0.7,
        tags: ['tag1', 'tag2'],
        embedding: [0.1, 0.2, 0.3],
      }));
    });

    it('should update stats after adding nodes', () => {
      lattice.addNode(createTestNode({ type: KnowledgeType.CONCEPT }));
      lattice.addNode(createTestNode({ type: KnowledgeType.RULE }));
      
      const stats = lattice.getStats();
      expect(stats.totalNodes).toBe(2);
      expect(stats.nodesByType[KnowledgeType.CONCEPT]).toBe(1);
      expect(stats.nodesByType[KnowledgeType.RULE]).toBe(1);
    });
  });

  // ============== addEdge 方法 ==============
  describe('addEdge', () => {
    let node1Id: string;
    let node2Id: string;

    beforeEach(() => {
      node1Id = lattice.addNode(createTestNode());
      node2Id = lattice.addNode(createTestNode());
    });

    it('should add an edge and return its id', () => {
      const edge = createTestEdge(node1Id, node2Id);
      const id = lattice.addEdge(edge);
      
      expect(id).toBeDefined();
      expect(id).toBe(edge.id);
    });

    it('should generate id if not provided', () => {
      const edge = createTestEdge(node1Id, node2Id, { id: undefined as unknown as string });
      const id = lattice.addEdge(edge);
      
      expect(id).toBeDefined();
      expect(id).toMatch(/^node-/);
      expect(lattice.getEdge(id)).toBeDefined();
    });

    it('should set timestamp if not provided', () => {
      const beforeTime = Date.now();
      const edge = createTestEdge(node1Id, node2Id, { timestamp: undefined as unknown as number });
      const id = lattice.addEdge(edge);
      const afterTime = Date.now();
      
      const addedEdge = lattice.getEdge(id);
      expect(addedEdge?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(addedEdge?.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should throw error if from node does not exist', () => {
      const edge = createTestEdge('non-existent', node2Id);
      
      expect(() => lattice.addEdge(edge)).toThrow('Both nodes must exist before adding an edge');
    });

    it('should throw error if to node does not exist', () => {
      const edge = createTestEdge(node1Id, 'non-existent');
      
      expect(() => lattice.addEdge(edge)).toThrow('Both nodes must exist before adding an edge');
    });

    it('should update adjacency lists', () => {
      const edge = createTestEdge(node1Id, node2Id);
      lattice.addEdge(edge);
      
      const adjacentEdges = lattice.getAdjacentEdges(node1Id);
      expect(adjacentEdges).toHaveLength(1);
      expect(adjacentEdges[0].id).toBe(edge.id);
    });

    it('should update stats after adding edges', () => {
      lattice.addEdge(createTestEdge(node1Id, node2Id, { type: RelationType.ASSOCIATION }));
      
      const stats = lattice.getStats();
      expect(stats.totalEdges).toBe(1);
      expect(stats.edgesByType[RelationType.ASSOCIATION]).toBe(1);
    });

    it('should store all edge properties', () => {
      const edge = createTestEdge(node1Id, node2Id, {
        type: RelationType.CAUSAL,
        weight: 0.9,
        metadata: { customProp: 'value' },
      });
      const id = lattice.addEdge(edge);
      
      const stored = lattice.getEdge(id);
      expect(stored).toEqual(expect.objectContaining({
        type: RelationType.CAUSAL,
        weight: 0.9,
        metadata: { customProp: 'value' },
      }));
    });
  });

  // ============== query 方法 ==============
  describe('query', () => {
    beforeEach(() => {
      // 添加测试节点
      lattice.addNode(createTestNode({
        id: 'node-1',
        type: KnowledgeType.CONCEPT,
        source: KnowledgeSource.USER,
        weight: 0.9,
        confidence: 0.9,
        tags: ['important', 'core'],
      }));
      lattice.addNode(createTestNode({
        id: 'node-2',
        type: KnowledgeType.RULE,
        source: KnowledgeSource.INFERENCE,
        weight: 0.5,
        confidence: 0.6,
        tags: ['derived'],
      }));
      lattice.addNode(createTestNode({
        id: 'node-3',
        type: KnowledgeType.CONCEPT,
        source: KnowledgeSource.USER,
        weight: 0.3,
        confidence: 0.4,
        tags: ['core'],
      }));
      
      // 添加边
      lattice.addEdge(createTestEdge('node-1', 'node-2', { id: 'edge-1' }));
      lattice.addEdge(createTestEdge('node-2', 'node-3', { id: 'edge-2' }));
    });

    it('should return all nodes and edges when no filters', () => {
      const result = lattice.query({});
      
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.relevanceScores).toHaveLength(3);
    });

    it('should filter by type', () => {
      const result = lattice.query({ type: KnowledgeType.CONCEPT });
      
      expect(result.nodes).toHaveLength(2);
      result.nodes.forEach(node => {
        expect(node.type).toBe(KnowledgeType.CONCEPT);
      });
    });

    it('should filter by source', () => {
      const result = lattice.query({ source: KnowledgeSource.USER });
      
      expect(result.nodes).toHaveLength(2);
      result.nodes.forEach(node => {
        expect(node.source).toBe(KnowledgeSource.USER);
      });
    });

    it('should filter by tags', () => {
      const result = lattice.query({ tags: ['core'] });
      
      expect(result.nodes).toHaveLength(2);
    });

    it('should filter by minWeight', () => {
      const result = lattice.query({ minWeight: 0.7 });
      
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('node-1');
    });

    it('should filter by minConfidence', () => {
      const result = lattice.query({ minConfidence: 0.8 });
      
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('node-1');
    });

    it('should combine multiple filters', () => {
      const result = lattice.query({
        type: KnowledgeType.CONCEPT,
        source: KnowledgeSource.USER,
        minWeight: 0.5,
      });
      
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('node-1');
    });

    it('should only include edges between filtered nodes', () => {
      const result = lattice.query({ type: KnowledgeType.RULE });
      
      // 只有一个 RULE 节点，没有边连接它
      expect(result.nodes).toHaveLength(1);
      expect(result.edges).toHaveLength(0);
    });

    it('should calculate relevance scores correctly', () => {
      const result = lattice.query({});
      
      result.nodes.forEach((node, index) => {
        const expectedScore = (node.weight * 0.5) + (node.confidence * 0.5);
        expect(result.relevanceScores[index]).toBeCloseTo(expectedScore);
      });
    });
  });

  // ============== 事件发射 ==============
  describe('Event Emission', () => {
    it('should emit nodeAdded event when adding a node', () => {
      const handler = vi.fn();
      lattice.on('nodeAdded', handler);
      
      const node = createTestNode();
      lattice.addNode(node);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        id: node.id,
        content: node.content,
      }));
    });

    it('should emit edgeAdded event when adding an edge', () => {
      const node1Id = lattice.addNode(createTestNode());
      const node2Id = lattice.addNode(createTestNode());
      
      const handler = vi.fn();
      lattice.on('edgeAdded', handler);
      
      const edge = createTestEdge(node1Id, node2Id);
      lattice.addEdge(edge);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        id: edge.id,
        from: node1Id,
        to: node2Id,
      }));
    });

    it('should emit nodeUpdated event when updating a node', () => {
      const nodeId = lattice.addNode(createTestNode());
      
      const handler = vi.fn();
      lattice.on('nodeUpdated', handler);
      
      lattice.updateNode(nodeId, { content: 'Updated content' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        id: nodeId,
        content: 'Updated content',
      }));
    });

    it('should emit nodeDeleted event when deleting a node', () => {
      const nodeId = lattice.addNode(createTestNode());
      
      const handler = vi.fn();
      lattice.on('nodeDeleted', handler);
      
      lattice.deleteNode(nodeId);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(nodeId);
    });

    it('should emit edgeDeleted event when deleting an edge', () => {
      const node1Id = lattice.addNode(createTestNode());
      const node2Id = lattice.addNode(createTestNode());
      const edgeId = lattice.addEdge(createTestEdge(node1Id, node2Id));
      
      const handler = vi.fn();
      lattice.on('edgeDeleted', handler);
      
      lattice.deleteEdge(edgeId);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(edgeId);
    });

    it('should emit cleared event when clearing lattice', () => {
      const handler = vi.fn();
      lattice.on('cleared', handler);
      
      lattice.clear();
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should emit imported event when importing data', () => {
      const handler = vi.fn();
      lattice.on('imported', handler);
      
      lattice.import({
        nodes: [createTestNode({ id: 'imported-node' })],
        edges: [],
      });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ============== 额外方法测试 ==============
  describe('Additional Methods', () => {
    describe('getNode', () => {
      it('should return undefined for non-existent node', () => {
        expect(lattice.getNode('non-existent')).toBeUndefined();
      });

      it('should return node for existing id', () => {
        const node = createTestNode({ id: 'test-id' });
        lattice.addNode(node);
        
        expect(lattice.getNode('test-id')).toEqual(expect.objectContaining({
          id: 'test-id',
        }));
      });
    });

    describe('updateNode', () => {
      it('should return null for non-existent node', () => {
        const result = lattice.updateNode('non-existent', { content: 'New' });
        expect(result).toBeNull();
      });

      it('should not allow id to be changed', () => {
        const nodeId = lattice.addNode(createTestNode({ id: 'original-id' }));
        const updated = lattice.updateNode(nodeId, { id: 'new-id' } as Partial<LatticeNode>);
        
        expect(updated?.id).toBe('original-id');
      });
    });

    describe('deleteNode', () => {
      it('should return false for non-existent node', () => {
        expect(lattice.deleteNode('non-existent')).toBe(false);
      });

      it('should delete related edges when deleting node', () => {
        const node1Id = lattice.addNode(createTestNode());
        const node2Id = lattice.addNode(createTestNode());
        const edgeId = lattice.addEdge(createTestEdge(node1Id, node2Id));
        
        expect(lattice.getAllEdges()).toHaveLength(1);
        
        lattice.deleteNode(node1Id);
        
        expect(lattice.getEdge(edgeId)).toBeUndefined();
        expect(lattice.getAllEdges()).toHaveLength(0);
      });
    });

    describe('findNearestNeighbors', () => {
      it('should return empty array for non-existent node', () => {
        const neighbors = lattice.findNearestNeighbors('non-existent');
        expect(neighbors).toEqual([]);
      });

      it('should use graph distance when no embeddings', () => {
        const node1Id = lattice.addNode(createTestNode({ id: 'node-1' }));
        const node2Id = lattice.addNode(createTestNode({ id: 'node-2' }));
        const node3Id = lattice.addNode(createTestNode({ id: 'node-3' }));
        
        lattice.addEdge(createTestEdge(node1Id, node2Id));
        lattice.addEdge(createTestEdge(node2Id, node3Id));
        
        const neighbors = lattice.findNearestNeighbors('node-1', 5);
        
        expect(neighbors.length).toBeGreaterThan(0);
        // node-2 should be closer (distance 1) than node-3 (distance 2)
        const node2Neighbor = neighbors.find(n => n.node.id === 'node-2');
        const node3Neighbor = neighbors.find(n => n.node.id === 'node-3');
        
        expect(node2Neighbor).toBeDefined();
        expect(node2Neighbor?.distance).toBe(1);
        expect(node3Neighbor?.distance).toBe(2);
      });

      it('should use cosine distance when embeddings present', () => {
        const node1Id = lattice.addNode(createTestNode({
          id: 'node-1',
          embedding: [1, 0, 0],
        }));
        const node2Id = lattice.addNode(createTestNode({
          id: 'node-2',
          embedding: [0.9, 0.1, 0],
        }));
        const node3Id = lattice.addNode(createTestNode({
          id: 'node-3',
          embedding: [0, 0, 1],
        }));
        
        const neighbors = lattice.findNearestNeighbors('node-1', 2);
        
        expect(neighbors.length).toBe(2);
        // node-2 should be closer (more similar embedding)
        expect(neighbors[0].node.id).toBe('node-2');
      });
    });

    describe('findPath', () => {
      it('should return single-element path for same node', () => {
        const nodeId = lattice.addNode(createTestNode());
        const path = lattice.findPath(nodeId, nodeId);
        
        expect(path).toEqual([nodeId]);
      });

      it('should return null when no path exists', () => {
        const node1Id = lattice.addNode(createTestNode());
        const node2Id = lattice.addNode(createTestNode());
        // No edge between them
        
        const path = lattice.findPath(node1Id, node2Id);
        expect(path).toBeNull();
      });

      it('should find direct path', () => {
        const node1Id = lattice.addNode(createTestNode());
        const node2Id = lattice.addNode(createTestNode());
        lattice.addEdge(createTestEdge(node1Id, node2Id));
        
        const path = lattice.findPath(node1Id, node2Id);
        expect(path).toEqual([node1Id, node2Id]);
      });

      it('should find longer path', () => {
        const node1Id = lattice.addNode(createTestNode());
        const node2Id = lattice.addNode(createTestNode());
        const node3Id = lattice.addNode(createTestNode());
        
        lattice.addEdge(createTestEdge(node1Id, node2Id));
        lattice.addEdge(createTestEdge(node2Id, node3Id));
        
        const path = lattice.findPath(node1Id, node3Id);
        expect(path).toEqual([node1Id, node2Id, node3Id]);
      });
    });

    describe('infer', () => {
      it('should return null for non-existent node', () => {
        const result = lattice.infer('non-existent');
        expect(result).toBeNull();
      });

      it('should return null when no related nodes', () => {
        const nodeId = lattice.addNode(createTestNode());
        const result = lattice.infer(nodeId);
        
        expect(result).toBeNull();
      });

      it('should return inference result for connected nodes', () => {
        const node1Id = lattice.addNode(createTestNode({ confidence: 0.9 }));
        const node2Id = lattice.addNode(createTestNode({ confidence: 0.8 }));
        const node3Id = lattice.addNode(createTestNode({ confidence: 0.7 }));
        
        lattice.addEdge(createTestEdge(node1Id, node2Id));
        lattice.addEdge(createTestEdge(node2Id, node3Id));
        
        const result = lattice.infer(node1Id);
        
        expect(result).not.toBeNull();
        expect(result?.path).toContain(node1Id);
        expect(result?.supportingNodes.length).toBeGreaterThan(0);
        expect(result?.confidence).toBeGreaterThanOrEqual(0);
        expect(result?.confidence).toBeLessThanOrEqual(1);
      });
    });

    describe('getNodesByType', () => {
      it('should return empty array for no matching nodes', () => {
        lattice.addNode(createTestNode({ type: KnowledgeType.CONCEPT }));
        
        const rules = lattice.getNodesByType(KnowledgeType.RULE);
        expect(rules).toHaveLength(0);
      });

      it('should return nodes of specified type', () => {
        lattice.addNode(createTestNode({ type: KnowledgeType.CONCEPT }));
        lattice.addNode(createTestNode({ type: KnowledgeType.CONCEPT }));
        lattice.addNode(createTestNode({ type: KnowledgeType.RULE }));
        
        const concepts = lattice.getNodesByType(KnowledgeType.CONCEPT);
        expect(concepts).toHaveLength(2);
      });
    });

    describe('getNodesByTag', () => {
      it('should return nodes with specified tag', () => {
        lattice.addNode(createTestNode({ tags: ['tag1', 'tag2'] }));
        lattice.addNode(createTestNode({ tags: ['tag2', 'tag3'] }));
        lattice.addNode(createTestNode({ tags: ['tag4'] }));
        
        const nodes = lattice.getNodesByTag('tag2');
        expect(nodes).toHaveLength(2);
      });
    });

    describe('getNodesBySource', () => {
      it('should return nodes from specified source', () => {
        lattice.addNode(createTestNode({ source: KnowledgeSource.USER }));
        lattice.addNode(createTestNode({ source: KnowledgeSource.INFERENCE }));
        
        const userNodes = lattice.getNodesBySource(KnowledgeSource.USER);
        expect(userNodes).toHaveLength(1);
      });
    });

    describe('getEdgesBetween', () => {
      it('should return edges between two nodes', () => {
        const node1Id = lattice.addNode(createTestNode());
        const node2Id = lattice.addNode(createTestNode());
        lattice.addEdge(createTestEdge(node1Id, node2Id));
        
        const edges = lattice.getEdgesBetween(node1Id, node2Id);
        expect(edges).toHaveLength(1);
      });

      it('should return bidirectional edges', () => {
        const node1Id = lattice.addNode(createTestNode());
        const node2Id = lattice.addNode(createTestNode());
        lattice.addEdge(createTestEdge(node1Id, node2Id));
        
        const edges = lattice.getEdgesBetween(node2Id, node1Id);
        expect(edges).toHaveLength(1);
      });
    });

    describe('export and import', () => {
      it('should export all nodes and edges', () => {
        const node1Id = lattice.addNode(createTestNode());
        const node2Id = lattice.addNode(createTestNode());
        lattice.addEdge(createTestEdge(node1Id, node2Id));
        
        const data = lattice.export();
        
        expect(data.nodes).toHaveLength(2);
        expect(data.edges).toHaveLength(1);
      });

      it('should import data and clear existing', () => {
        lattice.addNode(createTestNode({ id: 'old-node' }));
        
        lattice.import({
          nodes: [createTestNode({ id: 'new-node' })],
          edges: [],
        });
        
        expect(lattice.getNode('old-node')).toBeUndefined();
        expect(lattice.getNode('new-node')).toBeDefined();
        expect(lattice.getAllNodes()).toHaveLength(1);
      });
    });
  });
});
