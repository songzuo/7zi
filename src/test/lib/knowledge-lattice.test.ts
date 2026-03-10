/**
 * 知识晶格系统单元测试
 * 
 * 测试 KnowledgeLattice 类的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  describe('Node Operations', () => {
    describe('addNode', () => {
      it('应该成功添加节点并返回 ID', () => {
        const node: LatticeNode = {
          id: 'test-node-1',
          content: '测试内容',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const id = lattice.addNode(node);
        expect(id).toBe('test-node-1');
      });

      it('应该为没有 ID 的节点自动生成 ID', () => {
        const node: LatticeNode = {
          id: '',
          content: '无 ID 节点',
          type: KnowledgeType.FACT,
          weight: 0.5,
          confidence: 0.7,
          timestamp: Date.now(),
          source: KnowledgeSource.OBSERVATION,
          metadata: {},
        };

        const id = lattice.addNode(node);
        expect(id).toBeDefined();
        expect(id.startsWith('node-')).toBe(true);
      });

      it('应该自动设置时间戳', () => {
        const node: LatticeNode = {
          id: 'test-node-2',
          content: '测试时间戳',
          type: KnowledgeType.RULE,
          weight: 0.6,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.INFERENCE,
          metadata: {},
        };

        const beforeAdd = Date.now();
        lattice.addNode(node);
        const addedNode = lattice.getNode('test-node-2');
        
        expect(addedNode?.timestamp).toBeDefined();
        expect(addedNode?.timestamp).toBeGreaterThanOrEqual(beforeAdd);
      });

      it('应该初始化 metadata 为空对象', () => {
        const node: LatticeNode = {
          id: 'test-node-3',
          content: '测试 metadata',
          type: KnowledgeType.SKILL,
          weight: 0.7,
          confidence: 0.85,
          timestamp: Date.now(),
          source: KnowledgeSource.EXPERIENCE,
          metadata: {},
        };

        lattice.addNode(node);
        const addedNode = lattice.getNode('test-node-3');
        
        expect(addedNode?.metadata).toEqual({});
      });

      it('应该触发 nodeAdded 事件', () => {
        const eventHandler = vi.fn();
        lattice.on('nodeAdded', eventHandler);

        const node: LatticeNode = {
          id: 'test-node-4',
          content: '事件测试',
          type: KnowledgeType.MEMORY,
          weight: 0.9,
          confidence: 0.95,
          timestamp: Date.now(),
          source: KnowledgeSource.EVOMAP,
          metadata: {},
        };

        lattice.addNode(node);
        expect(eventHandler).toHaveBeenCalledWith(node);
      });
    });

    describe('getNode', () => {
      it('应该返回存在的节点', () => {
        const node: LatticeNode = {
          id: 'get-node-test',
          content: '获取测试',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        const retrieved = lattice.getNode('get-node-test');

        expect(retrieved).toBeDefined();
        expect(retrieved?.content).toBe('获取测试');
      });

      it('应该为不存在的节点返回 undefined', () => {
        const retrieved = lattice.getNode('non-existent');
        expect(retrieved).toBeUndefined();
      });
    });

    describe('updateNode', () => {
      it('应该成功更新节点', () => {
        const node: LatticeNode = {
          id: 'update-test',
          content: '原始内容',
          type: KnowledgeType.FACT,
          weight: 0.5,
          confidence: 0.6,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: { version: 1 },
        };

        lattice.addNode(node);
        const updated = lattice.updateNode('update-test', {
          content: '更新后的内容',
          weight: 0.8,
        });

        expect(updated).toBeDefined();
        expect(updated?.content).toBe('更新后的内容');
        expect(updated?.weight).toBe(0.8);
        expect(updated?.timestamp).toBeGreaterThanOrEqual(node.timestamp);
      });

      it('应该保持 ID 不变', () => {
        const node: LatticeNode = {
          id: 'update-id-test',
          content: '测试',
          type: KnowledgeType.RULE,
          weight: 0.5,
          confidence: 0.6,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        const updated = lattice.updateNode('update-id-test', {
          content: '新内容',
        });

        expect(updated?.id).toBe('update-id-test');
      });

      it('应该为不存在的节点返回 null', () => {
        const updated = lattice.updateNode('non-existent', { content: 'test' });
        expect(updated).toBeNull();
      });

      it('应该触发 nodeUpdated 事件', () => {
        const eventHandler = vi.fn();
        lattice.on('nodeUpdated', eventHandler);

        const node: LatticeNode = {
          id: 'event-update-test',
          content: '原始',
          type: KnowledgeType.CONCEPT,
          weight: 0.5,
          confidence: 0.6,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        lattice.updateNode('event-update-test', { content: '更新' });

        expect(eventHandler).toHaveBeenCalled();
      });
    });

    describe('deleteNode', () => {
      it('应该成功删除节点', () => {
        const node: LatticeNode = {
          id: 'delete-test',
          content: '待删除',
          type: KnowledgeType.FACT,
          weight: 0.5,
          confidence: 0.6,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        const result = lattice.deleteNode('delete-test');

        expect(result).toBe(true);
        expect(lattice.getNode('delete-test')).toBeUndefined();
      });

      it('应该删除相关的边', () => {
        const node1: LatticeNode = {
          id: 'node1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'node2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'edge1',
          from: 'node1',
          to: 'node2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge);
        lattice.deleteNode('node1');

        expect(lattice.getEdge('edge1')).toBeUndefined();
      });

      it('应该为不存在的节点返回 false', () => {
        const result = lattice.deleteNode('non-existent');
        expect(result).toBe(false);
      });

      it('应该触发 nodeDeleted 事件', () => {
        const eventHandler = vi.fn();
        lattice.on('nodeDeleted', eventHandler);

        const node: LatticeNode = {
          id: 'event-delete-test',
          content: '测试',
          type: KnowledgeType.FACT,
          weight: 0.5,
          confidence: 0.6,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        lattice.deleteNode('event-delete-test');

        expect(eventHandler).toHaveBeenCalledWith('event-delete-test');
      });
    });

    describe('getAllNodes', () => {
      it('应该返回所有节点', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'all-1',
            content: '节点 1',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'all-2',
            content: '节点 2',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const allNodes = lattice.getAllNodes();

        expect(allNodes.length).toBe(2);
      });

      it('空晶格应该返回空数组', () => {
        const allNodes = lattice.getAllNodes();
        expect(allNodes).toEqual([]);
      });
    });

    describe('getNodesByType', () => {
      it('应该按类型过滤节点', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'type-1',
            content: '概念 1',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'type-2',
            content: '事实 1',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'type-3',
            content: '概念 2',
            type: KnowledgeType.CONCEPT,
            weight: 0.6,
            confidence: 0.7,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const concepts = lattice.getNodesByType(KnowledgeType.CONCEPT);

        expect(concepts.length).toBe(2);
        expect(concepts.every(n => n.type === KnowledgeType.CONCEPT)).toBe(true);
      });
    });

    describe('getNodesByTag', () => {
      it('应该按标签过滤节点', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'tag-1',
            content: '带标签 1',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
            tags: ['important', 'core'],
          },
          {
            id: 'tag-2',
            content: '带标签 2',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
            tags: ['important'],
          },
          {
            id: 'tag-3',
            content: '无标签',
            type: KnowledgeType.RULE,
            weight: 0.6,
            confidence: 0.7,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const important = lattice.getNodesByTag('important');

        expect(important.length).toBe(2);
      });
    });

    describe('getNodesBySource', () => {
      it('应该按来源过滤节点', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'source-1',
            content: '用户输入',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'source-2',
            content: '观察结果',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.OBSERVATION,
            metadata: {},
          },
          {
            id: 'source-3',
            content: '用户输入 2',
            type: KnowledgeType.RULE,
            weight: 0.6,
            confidence: 0.7,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const userNodes = lattice.getNodesBySource(KnowledgeSource.USER);

        expect(userNodes.length).toBe(2);
        expect(userNodes.every(n => n.source === KnowledgeSource.USER)).toBe(true);
      });
    });
  });

  // ============== 边操作测试 ==============

  describe('Edge Operations', () => {
    describe('addEdge', () => {
      it('应该成功添加边并返回 ID', () => {
        const node1: LatticeNode = {
          id: 'edge-node-1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'edge-node-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'test-edge',
          from: 'edge-node-1',
          to: 'edge-node-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        const id = lattice.addEdge(edge);
        expect(id).toBe('test-edge');
      });

      it('应该为没有 ID 的边自动生成 ID', () => {
        const node1: LatticeNode = {
          id: 'auto-edge-1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'auto-edge-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'test-edge-700',
          from: 'auto-edge-1',
          to: 'auto-edge-2',
          type: RelationType.CAUSAL,
          weight: 0.8,
          timestamp: Date.now(),
        };

        const id = lattice.addEdge(edge);
        expect(id).toBeDefined();
      });

      it('当节点不存在时应该抛出错误', () => {
        const edge: LatticeEdge = {
          id: 'invalid-edge',
          from: 'non-existent-1',
          to: 'non-existent-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        expect(() => lattice.addEdge(edge)).toThrow(
          'Both nodes must exist before adding an edge'
        );
      });

      it('应该触发 edgeAdded 事件', () => {
        const eventHandler = vi.fn();
        lattice.on('edgeAdded', eventHandler);

        const node1: LatticeNode = {
          id: 'event-edge-1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'event-edge-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'event-edge',
          from: 'event-edge-1',
          to: 'event-edge-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge);
        expect(eventHandler).toHaveBeenCalledWith(edge);
      });
    });

    describe('getEdge', () => {
      it('应该返回存在的边', () => {
        const node1: LatticeNode = {
          id: 'get-edge-1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'get-edge-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'get-edge-test',
          from: 'get-edge-1',
          to: 'get-edge-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge);
        const retrieved = lattice.getEdge('get-edge-test');

        expect(retrieved).toBeDefined();
        expect(retrieved?.type).toBe(RelationType.ASSOCIATION);
      });

      it('应该为不存在的边返回 undefined', () => {
        const retrieved = lattice.getEdge('non-existent-edge');
        expect(retrieved).toBeUndefined();
      });
    });

    describe('deleteEdge', () => {
      it('应该成功删除边', () => {
        const node1: LatticeNode = {
          id: 'del-edge-1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'del-edge-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'del-edge-test',
          from: 'del-edge-1',
          to: 'del-edge-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge);
        const result = lattice.deleteEdge('del-edge-test');

        expect(result).toBe(true);
        expect(lattice.getEdge('del-edge-test')).toBeUndefined();
      });

      it('应该为不存在的边返回 false', () => {
        const result = lattice.deleteEdge('non-existent-edge');
        expect(result).toBe(false);
      });

      it('应该触发 edgeDeleted 事件', () => {
        const eventHandler = vi.fn();
        lattice.on('edgeDeleted', eventHandler);

        const node1: LatticeNode = {
          id: 'event-del-1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'event-del-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'event-del-edge',
          from: 'event-del-1',
          to: 'event-del-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge);
        lattice.deleteEdge('event-del-edge');

        expect(eventHandler).toHaveBeenCalledWith('event-del-edge');
      });
    });

    describe('getAllEdges', () => {
      it('应该返回所有边', () => {
        const node1: LatticeNode = {
          id: 'all-edge-1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'all-edge-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node3: LatticeNode = {
          id: 'all-edge-3',
          content: '节点 3',
          type: KnowledgeType.CONCEPT,
          weight: 0.6,
          confidence: 0.7,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);
        lattice.addNode(node3);

        const edge1: LatticeEdge = {
          id: 'edge-1',
          from: 'all-edge-1',
          to: 'all-edge-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        const edge2: LatticeEdge = {
          id: 'edge-2',
          from: 'all-edge-2',
          to: 'all-edge-3',
          type: RelationType.CAUSAL,
          weight: 0.8,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge1);
        lattice.addEdge(edge2);

        const allEdges = lattice.getAllEdges();
        expect(allEdges.length).toBe(2);
      });
    });

    describe('getAdjacentEdges', () => {
      it('应该获取节点相关的所有边', () => {
        const node1: LatticeNode = {
          id: 'adj-1',
          content: '中心节点',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'adj-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node3: LatticeNode = {
          id: 'adj-3',
          content: '节点 3',
          type: KnowledgeType.CONCEPT,
          weight: 0.6,
          confidence: 0.7,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);
        lattice.addNode(node3);

        const edge1: LatticeEdge = {
          id: 'adj-edge-1',
          from: 'adj-1',
          to: 'adj-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        const edge2: LatticeEdge = {
          id: 'adj-edge-2',
          from: 'adj-3',
          to: 'adj-1',
          type: RelationType.CAUSAL,
          weight: 0.8,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge1);
        lattice.addEdge(edge2);

        const adjacent = lattice.getAdjacentEdges('adj-1');
        expect(adjacent.length).toBe(2);
      });
    });

    describe('getEdgesBetween', () => {
      it('应该获取两个节点之间的边', () => {
        const node1: LatticeNode = {
          id: 'between-1',
          content: '节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'between-2',
          content: '节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'between-edge',
          from: 'between-1',
          to: 'between-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge);

        const edges = lattice.getEdgesBetween('between-1', 'between-2');
        expect(edges.length).toBe(1);
        expect(edges[0].id).toBe('between-edge');
      });
    });
  });

  // ============== 晶格操作测试 ==============

  describe('Lattice Operations', () => {
    describe('findNearestNeighbors', () => {
      it('应该使用图距离查找最近邻（无嵌入向量）', () => {
        const node1: LatticeNode = {
          id: 'neighbor-1',
          content: '中心节点',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'neighbor-2',
          content: '邻居 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node3: LatticeNode = {
          id: 'neighbor-3',
          content: '邻居 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.6,
          confidence: 0.7,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);
        lattice.addNode(node3);

        const edge1: LatticeEdge = {
          id: 'neighbor-edge-1',
          from: 'neighbor-1',
          to: 'neighbor-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        const edge2: LatticeEdge = {
          id: 'neighbor-edge-2',
          from: 'neighbor-2',
          to: 'neighbor-3',
          type: RelationType.ASSOCIATION,
          weight: 0.8,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge1);
        lattice.addEdge(edge2);

        const neighbors = lattice.findNearestNeighbors('neighbor-1', 2);
        expect(neighbors.length).toBe(2);
        expect(neighbors[0].node.id).toBe('neighbor-2');
        expect(neighbors[0].distance).toBe(1);
      });

      it('应该使用向量相似度查找最近邻（有嵌入向量）', () => {
        const node1: LatticeNode = {
          id: 'vector-1',
          content: '查询节点',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
          embedding: [1, 0, 0],
        };

        const node2: LatticeNode = {
          id: 'vector-2',
          content: '相似节点',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
          embedding: [0.9, 0.1, 0],
        };

        const node3: LatticeNode = {
          id: 'vector-3',
          content: '不相似节点',
          type: KnowledgeType.CONCEPT,
          weight: 0.6,
          confidence: 0.7,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
          embedding: [0, 1, 0],
        };

        lattice.addNode(node1);
        lattice.addNode(node2);
        lattice.addNode(node3);

        const neighbors = lattice.findNearestNeighbors('vector-1', 1);
        expect(neighbors.length).toBe(1);
        expect(neighbors[0].node.id).toBe('vector-2');
      });

      it('应该为不存在的节点返回空数组', () => {
        const neighbors = lattice.findNearestNeighbors('non-existent');
        expect(neighbors).toEqual([]);
      });
    });

    describe('findPath', () => {
      it('应该找到两个节点之间的路径', () => {
        const node1: LatticeNode = {
          id: 'path-1',
          content: '起点',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'path-2',
          content: '中间点',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node3: LatticeNode = {
          id: 'path-3',
          content: '终点',
          type: KnowledgeType.CONCEPT,
          weight: 0.6,
          confidence: 0.7,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);
        lattice.addNode(node3);

        const edge1: LatticeEdge = {
          id: 'path-edge-1',
          from: 'path-1',
          to: 'path-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        const edge2: LatticeEdge = {
          id: 'path-edge-2',
          from: 'path-2',
          to: 'path-3',
          type: RelationType.ASSOCIATION,
          weight: 0.8,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge1);
        lattice.addEdge(edge2);

        const path = lattice.findPath('path-1', 'path-3');
        expect(path).toEqual(['path-1', 'path-2', 'path-3']);
      });

      it('当起点等于终点时应该返回单元素数组', () => {
        const node: LatticeNode = {
          id: 'same-node',
          content: '单节点',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        const path = lattice.findPath('same-node', 'same-node');
        expect(path).toEqual(['same-node']);
      });

      it('当没有路径时应该返回 null', () => {
        const node1: LatticeNode = {
          id: 'no-path-1',
          content: '孤立节点 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'no-path-2',
          content: '孤立节点 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const path = lattice.findPath('no-path-1', 'no-path-2');
        expect(path).toBeNull();
      });
    });

    describe('query', () => {
      it('应该按类型过滤查询结果', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'query-1',
            content: '概念',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'query-2',
            content: '事实',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const result = lattice.query({ type: KnowledgeType.CONCEPT });

        expect(result.nodes.length).toBe(1);
        expect(result.nodes[0].type).toBe(KnowledgeType.CONCEPT);
      });

      it('应该按来源过滤查询结果', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'query-src-1',
            content: '用户输入',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'query-src-2',
            content: '观察',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.OBSERVATION,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const result = lattice.query({ source: KnowledgeSource.USER });

        expect(result.nodes.length).toBe(1);
      });

      it('应该按标签过滤查询结果', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'query-tag-1',
            content: '带标签',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
            tags: ['important'],
          },
          {
            id: 'query-tag-2',
            content: '无标签',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const result = lattice.query({ tags: ['important'] });

        expect(result.nodes.length).toBe(1);
      });

      it('应该按最小权重过滤查询结果', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'query-weight-1',
            content: '高权重',
            type: KnowledgeType.CONCEPT,
            weight: 0.9,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'query-weight-2',
            content: '低权重',
            type: KnowledgeType.FACT,
            weight: 0.3,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const result = lattice.query({ minWeight: 0.5 });

        expect(result.nodes.length).toBe(1);
        expect(result.nodes[0].weight).toBe(0.9);
      });

      it('应该按最小可信度过滤查询结果', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'query-conf-1',
            content: '高可信度',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.95,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'query-conf-2',
            content: '低可信度',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.4,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));
        const result = lattice.query({ minConfidence: 0.8 });

        expect(result.nodes.length).toBe(1);
        expect(result.nodes[0].confidence).toBe(0.95);
      });

      it('应该计算相关性分数', () => {
        const node: LatticeNode = {
          id: 'query-relevance',
          content: '测试',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        const result = lattice.query();

        expect(result.relevanceScores.length).toBe(1);
        expect(result.relevanceScores[0]).toBeCloseTo(0.85, 2); // (0.8 * 0.5) + (0.9 * 0.5)
      });
    });

    describe('infer', () => {
      it('应该基于图遍历进行推理', () => {
        const node1: LatticeNode = {
          id: 'infer-1',
          content: '起点',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        const node2: LatticeNode = {
          id: 'infer-2',
          content: '相关节点',
          type: KnowledgeType.RULE,
          weight: 0.7,
          confidence: 0.85,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const edge: LatticeEdge = {
          id: 'infer-edge',
          from: 'infer-1',
          to: 'infer-2',
          type: RelationType.CAUSAL,
          weight: 0.9,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge);

        const result = lattice.infer('infer-1');
        expect(result).toBeDefined();
        expect(result?.supportingNodes.length).toBeGreaterThan(0);
        expect(result?.confidence).toBeGreaterThan(0);
      });

      it('应该限制推理深度', () => {
        const nodes: LatticeNode[] = [
          { id: 'depth-0', content: '0', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
          { id: 'depth-1', content: '1', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
          { id: 'depth-2', content: '2', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
          { id: 'depth-3', content: '3', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
          { id: 'depth-4', content: '4', type: KnowledgeType.CONCEPT, weight: 0.8, confidence: 0.9, timestamp: Date.now(), source: KnowledgeSource.USER, metadata: {} },
        ];

        nodes.forEach(node => lattice.addNode(node));

        for (let i = 0; i < 4; i++) {
          lattice.addEdge({
            id: `depth-edge-${i}`,
            from: `depth-${i}`,
            to: `depth-${i + 1}`,
            type: RelationType.ASSOCIATION,
            weight: 0.9,
            timestamp: Date.now(),
          });
        }

        const result = lattice.infer('depth-0', 2);
        expect(result?.path.length).toBeLessThanOrEqual(3); // 起点 + 2 层
      });

      it('当没有相关节点时应该返回 null', () => {
        const node: LatticeNode = {
          id: 'infer-isolated',
          content: '孤立节点',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        const result = lattice.infer('infer-isolated');

        expect(result).toBeNull();
      });
    });
  });

  // ============== 统计测试 ==============

  describe('Statistics', () => {
    describe('getStats', () => {
      it('应该返回正确的统计信息', () => {
        const nodes: LatticeNode[] = [
          {
            id: 'stat-1',
            content: '概念 1',
            type: KnowledgeType.CONCEPT,
            weight: 0.8,
            confidence: 0.9,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
          {
            id: 'stat-2',
            content: '事实 1',
            type: KnowledgeType.FACT,
            weight: 0.7,
            confidence: 0.8,
            timestamp: Date.now(),
            source: KnowledgeSource.USER,
            metadata: {},
          },
        ];

        nodes.forEach(node => lattice.addNode(node));

        const edge: LatticeEdge = {
          id: 'stat-edge',
          from: 'stat-1',
          to: 'stat-2',
          type: RelationType.ASSOCIATION,
          weight: 0.9,
          timestamp: Date.now(),
        };

        lattice.addEdge(edge);

        const stats = lattice.getStats();

        expect(stats.totalNodes).toBe(2);
        expect(stats.totalEdges).toBe(1);
        expect(stats.nodesByType[KnowledgeType.CONCEPT]).toBe(1);
        expect(stats.nodesByType[KnowledgeType.FACT]).toBe(1);
        expect(stats.averageWeight).toBeCloseTo(0.75, 2);
        expect(stats.averageConfidence).toBeCloseTo(0.85, 2);
      });

      it('空晶格应该返回零值统计', () => {
        const stats = lattice.getStats();

        expect(stats.totalNodes).toBe(0);
        expect(stats.totalEdges).toBe(0);
        expect(stats.averageWeight).toBe(0);
        expect(stats.averageConfidence).toBe(0);
      });
    });
  });

  // ============== 工具方法测试 ==============

  describe('Utility Methods', () => {
    describe('clear', () => {
      it('应该清空所有节点和边', () => {
        const node: LatticeNode = {
          id: 'clear-test',
          content: '测试',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        lattice.clear();

        expect(lattice.getAllNodes().length).toBe(0);
        expect(lattice.getAllEdges().length).toBe(0);
      });

      it('应该触发 cleared 事件', () => {
        const eventHandler = vi.fn();
        lattice.on('cleared', eventHandler);

        lattice.clear();
        expect(eventHandler).toHaveBeenCalled();
      });
    });

    describe('export', () => {
      it('应该导出所有节点和边', () => {
        const node: LatticeNode = {
          id: 'export-test',
          content: '导出测试',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(node);
        const data = lattice.export();

        expect(data.nodes.length).toBe(1);
        expect(data.nodes[0].id).toBe('export-test');
        expect(data.edges.length).toBe(0);
      });
    });

    describe('import', () => {
      it('应该导入节点和边', () => {
        const data = {
          nodes: [
            {
              id: 'import-test',
              content: '导入测试',
              type: KnowledgeType.CONCEPT,
              weight: 0.8,
              confidence: 0.9,
              timestamp: Date.now(),
              source: KnowledgeSource.USER,
              metadata: {},
            } as LatticeNode,
          ],
          edges: [] as LatticeEdge[],
        };

        lattice.import(data);
        const node = lattice.getNode('import-test');

        expect(node).toBeDefined();
        expect(node?.content).toBe('导入测试');
      });

      it('导入前应该清空现有数据', () => {
        const existingNode: LatticeNode = {
          id: 'existing',
          content: '原有数据',
          type: KnowledgeType.FACT,
          weight: 0.5,
          confidence: 0.6,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
        };

        lattice.addNode(existingNode);

        const data = {
          nodes: [
            {
              id: 'import-new',
              content: '新数据',
              type: KnowledgeType.CONCEPT,
              weight: 0.8,
              confidence: 0.9,
              timestamp: Date.now(),
              source: KnowledgeSource.USER,
              metadata: {},
            } as LatticeNode,
          ],
          edges: [] as LatticeEdge[],
        };

        lattice.import(data);

        expect(lattice.getNode('existing')).toBeUndefined();
        expect(lattice.getNode('import-new')).toBeDefined();
      });

      it('应该触发 imported 事件', () => {
        const eventHandler = vi.fn();
        lattice.on('imported', eventHandler);

        lattice.import({ nodes: [], edges: [] });
        expect(eventHandler).toHaveBeenCalled();
      });
    });

    describe('cosineDistance', () => {
      it('应该计算正确的余弦距离（相似向量）', () => {
        // 使用非常相似的向量，距离应接近 0
        const node1: LatticeNode = {
          id: 'cosine-1',
          content: '测试 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
          embedding: [1, 0, 0],
        };

        const node2: LatticeNode = {
          id: 'cosine-2',
          content: '测试 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
          embedding: [0.99, 0.01, 0],
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        const neighbors = lattice.findNearestNeighbors('cosine-1', 1);
        expect(neighbors.length).toBe(1);
        expect(neighbors[0].distance).toBeLessThan(0.01);
      });

      it('应该处理不同长度的向量', () => {
        const node1: LatticeNode = {
          id: 'cosine-diff-1',
          content: '测试 1',
          type: KnowledgeType.CONCEPT,
          weight: 0.8,
          confidence: 0.9,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
          embedding: [1, 0],
        };

        const node2: LatticeNode = {
          id: 'cosine-diff-2',
          content: '测试 2',
          type: KnowledgeType.CONCEPT,
          weight: 0.7,
          confidence: 0.8,
          timestamp: Date.now(),
          source: KnowledgeSource.USER,
          metadata: {},
          embedding: [0, 1, 0],
        };

        lattice.addNode(node1);
        lattice.addNode(node2);

        // 不同长度向量返回距离 0，会被过滤掉
        const neighbors = lattice.findNearestNeighbors('cosine-diff-1', 1);
        expect(neighbors.length).toBe(0); // 不同长度返回 0，被过滤
      });
    });
  });
});
