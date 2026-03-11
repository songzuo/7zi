/**
 * 知识晶格状态管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import {
  KnowledgeLattice,
  LatticeNode,
  LatticeEdge,
  KnowledgeType,
  KnowledgeSource,
  RelationType,
} from '@/lib/agents/knowledge-lattice';

export type LayoutType = 'force' | 'circular' | 'hierarchical';

export interface UseKnowledgeLatticeReturn {
  lattice: KnowledgeLattice;
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  selectedNode: LatticeNode | null;
  showStats: boolean;
  layout: LayoutType;
  setSelectedNode: (node: LatticeNode | null) => void;
  setShowStats: (show: boolean) => void;
  setLayout: (layout: LayoutType) => void;
  toggleStats: () => void;
  handleNodeClick: (node: LatticeNode) => void;
  handleNodeHover: (node: LatticeNode | null) => void;
  stats: ReturnType<KnowledgeLattice['getStats']>;
}

export function useKnowledgeLattice(): UseKnowledgeLatticeReturn {
  const [lattice] = useState(() => new KnowledgeLattice());
  const [nodes, setNodes] = useState<LatticeNode[]>([]);
  const [edges, setEdges] = useState<LatticeEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<LatticeNode | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [layout, setLayout] = useState<LayoutType>('force');

  // 初始化示例数据
  useEffect(() => {
    const demoNodes: Partial<LatticeNode>[] = [
      {
        content: '人工智能',
        type: KnowledgeType.CONCEPT,
        weight: 0.9,
        confidence: 0.95,
        source: KnowledgeSource.USER,
        tags: ['技术', '前沿'],
        metadata: { category: 'core' },
      },
      {
        content: '机器学习',
        type: KnowledgeType.CONCEPT,
        weight: 0.85,
        confidence: 0.9,
        source: KnowledgeSource.USER,
        tags: ['AI', '算法'],
        metadata: { category: 'core' },
      },
      {
        content: '深度学习',
        type: KnowledgeType.CONCEPT,
        weight: 0.8,
        confidence: 0.85,
        source: KnowledgeSource.USER,
        tags: ['AI', '神经网络'],
        metadata: { category: 'advanced' },
      },
      {
        content: '如果训练数据不足，模型会过拟合',
        type: KnowledgeType.RULE,
        weight: 0.9,
        confidence: 0.95,
        source: KnowledgeSource.EXPERIENCE,
        tags: ['最佳实践'],
        metadata: { category: 'rules' },
      },
      {
        content: '使用 dropout 防止过拟合',
        type: KnowledgeType.SKILL,
        weight: 0.85,
        confidence: 0.9,
        source: KnowledgeSource.EXPERIENCE,
        tags: ['技术', '优化'],
        metadata: { category: 'skills' },
      },
      {
        content: 'Transformer 架构改变了 NLP',
        type: KnowledgeType.FACT,
        weight: 0.9,
        confidence: 0.95,
        source: KnowledgeSource.EXTERNAL,
        tags: ['历史', '里程碑'],
        metadata: { category: 'facts' },
      },
      {
        content: '我更喜欢使用 Python 进行机器学习开发',
        type: KnowledgeType.PREFERENCE,
        weight: 0.7,
        confidence: 0.8,
        source: KnowledgeSource.USER,
        tags: ['偏好'],
        metadata: { category: 'personal' },
      },
      {
        content: '上次项目中遇到了梯度消失问题',
        type: KnowledgeType.MEMORY,
        weight: 0.6,
        confidence: 0.8,
        source: KnowledgeSource.USER,
        tags: ['经验', '问题'],
        metadata: { category: 'memories' },
      },
    ];

    const addedNodes: LatticeNode[] = [];
    demoNodes.forEach((demoNode, index) => {
      const node = {
        id: `demo_node_${index}`,
        content: demoNode.content!,
        type: demoNode.type!,
        weight: demoNode.weight!,
        confidence: demoNode.confidence!,
        timestamp: Date.now() + index,
        source: demoNode.source!,
        tags: demoNode.tags,
        metadata: demoNode.metadata || {},
      };
      lattice.addNode(node);
      addedNodes.push(node);
    });

    // 添加关系边
    const demoEdges = [
      { from: 0, to: 1, type: 'partial-order' },
      { from: 1, to: 2, type: 'partial-order' },
      { from: 1, to: 3, type: 'causal' },
      { from: 3, to: 4, type: 'association' },
      { from: 2, to: 5, type: 'association' },
      { from: 1, to: 6, type: 'association' },
      { from: 1, to: 7, type: 'association' },
    ];

    const addedEdges: LatticeEdge[] = [];
    demoEdges.forEach((demoEdge, index) => {
      const edge = {
        id: `demo_edge_${index}`,
        from: addedNodes[demoEdge.from].id,
        to: addedNodes[demoEdge.to].id,
        type: demoEdge.type as RelationType,
        weight: 0.7 + Math.random() * 0.3,
        timestamp: Date.now(),
      };
      lattice.addEdge(edge);
      addedEdges.push(edge);
    });

    requestAnimationFrame(() => {
      setNodes(addedNodes);
      setEdges(addedEdges);
    });
  }, [lattice]);

  const handleNodeClick = useCallback((node: LatticeNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((_node: LatticeNode | null) => {
    // 可以在这里处理悬停事件
  }, []);

  const stats = lattice.getStats();

  const toggleStats = useCallback(() => {
    setShowStats((prev) => !prev);
  }, []);

  return {
    lattice,
    nodes,
    edges,
    selectedNode,
    showStats,
    layout,
    setSelectedNode,
    setShowStats,
    setLayout,
    toggleStats,
    handleNodeClick,
    handleNodeHover,
    stats,
  };
}
