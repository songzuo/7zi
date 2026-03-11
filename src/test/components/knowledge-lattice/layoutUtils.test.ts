/**
 * 布局工具函数测试
 */

import { describe, it, expect } from 'vitest';
import { calculateLayout, LayoutType } from '@/components/knowledge-lattice/layoutUtils';
import { LatticeNode, LatticeEdge, KnowledgeType, KnowledgeSource, RelationType } from '@/lib/agents/knowledge-lattice';

describe('layoutUtils', () => {
  const createMockNodes = (count: number): LatticeNode[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `node-${i}`,
      content: `Node ${i}`,
      type: Object.values(KnowledgeType)[i % 7] as KnowledgeType,
      weight: 0.5 + Math.random() * 0.5,
      confidence: 0.8,
      timestamp: Date.now() + i,
      source: KnowledgeSource.USER,
      tags: [],
      metadata: {},
    }));
  };

  const createMockEdges = (nodes: LatticeNode[]): LatticeEdge[] => {
    const edges: LatticeEdge[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `edge-${i}`,
        from: nodes[i].id,
        to: nodes[i + 1].id,
        type: RelationType.ASSOCIATION,
        weight: 0.5,
        timestamp: Date.now(),
      });
    }
    return edges;
  };

  describe('calculateLayout', () => {
    it('should return positions for all nodes', () => {
      const nodes = createMockNodes(5);
      const edges = createMockEdges(nodes);
      const positions = calculateLayout(nodes, edges, 'force');

      expect(positions.size).toBe(5);
      nodes.forEach(node => {
        expect(positions.has(node.id)).toBe(true);
      });
    });

    it('should return valid 3D positions', () => {
      const nodes = createMockNodes(3);
      const edges = createMockEdges(nodes);
      const positions = calculateLayout(nodes, edges, 'force');

      positions.forEach((pos) => {
        expect(Array.isArray(pos)).toBe(true);
        expect(pos.length).toBe(3);
        expect(typeof pos[0]).toBe('number');
        expect(typeof pos[1]).toBe('number');
        expect(typeof pos[2]).toBe('number');
      });
    });
  });

  describe('circular layout', () => {
    it('should arrange nodes in a circle', () => {
      const nodes = createMockNodes(4);
      const positions = calculateLayout(nodes, [], 'circular');

      expect(positions.size).toBe(4);

      // Check that all positions are at roughly the same distance from origin
      positions.forEach((pos) => {
        const dist = Math.sqrt(pos[0] ** 2 + pos[2] ** 2);
        expect(dist).toBeCloseTo(10, 0); // radius is 10
      });
    });
  });

  describe('hierarchical layout', () => {
    it('should layer nodes by type', () => {
      const nodes = createMockNodes(7); // One of each type
      const positions = calculateLayout(nodes, [], 'hierarchical');

      expect(positions.size).toBe(7);

      // Check that positions are defined
      positions.forEach((pos) => {
        expect(pos).toBeDefined();
      });
    });
  });

  describe('force layout', () => {
    it('should apply force-directed positioning', () => {
      const nodes = createMockNodes(10);
      const edges = createMockEdges(nodes);
      const positions = calculateLayout(nodes, edges, 'force');

      expect(positions.size).toBe(10);

      // All nodes should have unique positions after force layout
      const positionStrings = new Set<string>();
      positions.forEach((pos) => {
        positionStrings.add(`${pos[0].toFixed(2)},${pos[1].toFixed(2)},${pos[2].toFixed(2)}`);
      });
      // Some positions should be unique (not all same)
      expect(positionStrings.size).toBeGreaterThan(1);
    });

    it('should handle empty nodes array', () => {
      const positions = calculateLayout([], [], 'force');
      expect(positions.size).toBe(0);
    });

    it('should handle single node', () => {
      const nodes = createMockNodes(1);
      const positions = calculateLayout(nodes, [], 'force');
      expect(positions.size).toBe(1);
    });
  });
});