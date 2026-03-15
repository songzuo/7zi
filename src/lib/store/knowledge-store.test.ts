/**
 * @fileoverview 知识存储测试
 * @module lib/store/knowledge-store.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeStore } from './knowledge-store';
import { KnowledgeType, RelationType } from '@/lib/agents/knowledge-lattice';

describe('KnowledgeStore', () => {
  let store: KnowledgeStore;

  beforeEach(() => {
    // 创建新实例以避免状态污染
    store = new KnowledgeStore();
    store.clear();
  });

  describe('addNode', () => {
    it('should add a node with generated id', () => {
      const node = {
        content: 'Test Node',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.9,
        tags: ['test'],
      };

      const id = store.addNode(node);

      expect(id).toBeDefined();
      expect(id).toMatch(/^node-/);
      
      const retrieved = store.getNode(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.content).toBe('Test Node');
      expect(retrieved?.type).toBe(KnowledgeType.CONCEPT);
    });

    it('should use provided id if given', () => {
      const node = {
        id: 'custom-id',
        content: 'Custom Node',
        type: KnowledgeType.QUESTION,
      };

      const id = store.addNode(node);

      expect(id).toBe('custom-id');
      expect(store.getNode('custom-id')).toBeDefined();
    });

    it('should set default weight and confidence if not provided', () => {
      const node = {
        content: 'Minimal Node',
        type: KnowledgeType.IDEA,
      };

      const id = store.addNode(node);
      const retrieved = store.getNode(id);

      expect(retrieved?.weight).toBe(0.5);
      expect(retrieved?.confidence).toBe(0.5);
    });
  });

  describe('getNode', () => {
    it('should return node by id', () => {
      const id = store.addNode({ content: 'Test', type: KnowledgeType.CONCEPT });
      const node = store.getNode(id);

      expect(node).toBeDefined();
      expect(node?.content).toBe('Test');
    });

    it('should return undefined for non-existent id', () => {
      const node = store.getNode('non-existent');
      expect(node).toBeUndefined();
    });
  });

  describe('updateNode', () => {
    it('should update node fields', () => {
      const id = store.addNode({ content: 'Original', type: KnowledgeType.CONCEPT });
      
      const updated = store.updateNode(id, { content: 'Updated', weight: 0.9 });

      expect(updated).toBeDefined();
      expect(updated?.content).toBe('Updated');
      expect(updated?.weight).toBe(0.9);
    });

    it('should return null for non-existent node', () => {
      const updated = store.updateNode('non-existent', { content: 'Test' });
      expect(updated).toBeNull();
    });
  });

  describe('deleteNode', () => {
    it('should delete node', () => {
      const id = store.addNode({ content: 'To Delete', type: KnowledgeType.CONCEPT });
      
      const result = store.deleteNode(id);

      expect(result).toBe(true);
      expect(store.getNode(id)).toBeUndefined();
    });

    it('should delete related edges when deleting node', () => {
      const id1 = store.addNode({ content: 'Node 1', type: KnowledgeType.CONCEPT });
      const id2 = store.addNode({ content: 'Node 2', type: KnowledgeType.CONCEPT });
      store.addEdge({ from: id1, to: id2, type: RelationType.RELATES_TO });

      store.deleteNode(id1);

      expect(store.getNode(id1)).toBeUndefined();
      expect(store.getAllEdges().length).toBe(0);
    });
  });

  describe('getAllNodes', () => {
    it('should return all nodes', () => {
      store.addNode({ content: 'Node 1', type: KnowledgeType.CONCEPT });
      store.addNode({ content: 'Node 2', type: KnowledgeType.IDEA });
      store.addNode({ content: 'Node 3', type: KnowledgeType.QUESTION });

      const nodes = store.getAllNodes();

      expect(nodes.length).toBe(3);
    });

    it('should return empty array when no nodes', () => {
      const nodes = store.getAllNodes();
      expect(nodes).toEqual([]);
    });
  });

  describe('addEdge', () => {
    it('should add edge between existing nodes', () => {
      const id1 = store.addNode({ content: 'Node 1', type: KnowledgeType.CONCEPT });
      const id2 = store.addNode({ content: 'Node 2', type: KnowledgeType.CONCEPT });

      const edgeId = store.addEdge({
        from: id1,
        to: id2,
        type: RelationType.RELATES_TO,
        weight: 0.8,
      });

      expect(edgeId).toBeDefined();
      expect(store.getEdge(edgeId)).toBeDefined();
    });

    it('should throw error when nodes do not exist', () => {
      store.addNode({ content: 'Node 1', type: KnowledgeType.CONCEPT });

      expect(() => {
        store.addEdge({
          from: 'non-existent',
          to: 'also-non-existent',
          type: RelationType.RELATES_TO,
        });
      }).toThrow('Both nodes must exist before adding an edge');
    });
  });

  describe('queryNodes', () => {
    beforeEach(() => {
      store.addNode({ content: 'React', type: KnowledgeType.CONCEPT, tags: ['frontend'], weight: 0.9, confidence: 0.95 });
      store.addNode({ content: 'Vue', type: KnowledgeType.CONCEPT, tags: ['frontend'], weight: 0.8, confidence: 0.85 });
      store.addNode({ content: 'Database', type: KnowledgeType.CONCEPT, tags: ['backend'], weight: 0.7, confidence: 0.9 });
      store.addNode({ content: 'API Design', type: KnowledgeType.IDEA, tags: ['backend'], weight: 0.85, confidence: 0.8 });
    });

    it('should filter by type', () => {
      const result = store.queryNodes({ type: KnowledgeType.CONCEPT });
      expect(result.nodes.length).toBe(3);
    });

    it('should filter by tags', () => {
      const result = store.queryNodes({ tags: ['frontend'] });
      expect(result.nodes.length).toBe(2);
    });

    it('should filter by minWeight', () => {
      const result = store.queryNodes({ minWeight: 0.85 });
      expect(result.nodes.length).toBe(2);
    });

    it('should filter by searchText', () => {
      const result = store.queryNodes({ searchText: 'react' });
      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].content).toBe('React');
    });

    it('should support pagination with limit and offset', () => {
      const result = store.queryNodes({ limit: 2, offset: 1 });
      expect(result.nodes.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      store.addNode({ content: 'Node 1', type: KnowledgeType.CONCEPT });
      store.addNode({ content: 'Node 2', type: KnowledgeType.CONCEPT });
      store.addNode({ content: 'Node 3', type: KnowledgeType.EXPERIENCE });

      const id1 = store.addNode({ content: 'Edge Node 1', type: KnowledgeType.CONCEPT });
      const id2 = store.addNode({ content: 'Edge Node 2', type: KnowledgeType.CONCEPT });
      store.addEdge({ from: id1, to: id2, type: RelationType.RELATES_TO });

      const stats = store.getStats();

      expect(stats.totalNodes).toBe(5);
      expect(stats.totalEdges).toBe(1);
      // Check that stats contain the expected types
      expect(stats.nodesByType[KnowledgeType.CONCEPT]).toBe(4);
      expect(stats.nodesByType[KnowledgeType.EXPERIENCE]).toBe(1);
    });
  });

  describe('export/import', () => {
    it('should export and import data correctly', () => {
      const id1 = store.addNode({ content: 'Node 1', type: KnowledgeType.CONCEPT });
      const id2 = store.addNode({ content: 'Node 2', type: KnowledgeType.IDEA });
      store.addEdge({ from: id1, to: id2, type: RelationType.RELATES_TO });

      const exported = store.export();

      const newStore = new KnowledgeStore();
      newStore.clear();
      newStore.import(exported);

      expect(newStore.getAllNodes().length).toBe(2);
      expect(newStore.getAllEdges().length).toBe(1);
    });
  });
});
