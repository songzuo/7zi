/**
 * 知识晶格演示页面
 *
 * 展示知识晶格系统的功能
 */

'use client';

import React, { useState, useEffect } from 'react';
import KnowledgeLattice3D from '@/components/knowledge-lattice/KnowledgeLattice3D';
import {
  KnowledgeLattice,
  LatticeNode,
  LatticeEdge,
  KnowledgeType,
  KnowledgeSource,
  RelationType,
} from '@/lib/agents/knowledge-lattice';

export default function KnowledgeLatticeDemo() {
  const [lattice] = useState(() => new KnowledgeLattice());
  const [nodes, setNodes] = useState<LatticeNode[]>([]);
  const [edges, setEdges] = useState<LatticeEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<LatticeNode | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [layout, setLayout] = useState<'force' | 'circular' | 'hierarchical'>('force');

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

  const handleNodeClick = (node: LatticeNode) => {
    setSelectedNode(node);
  };

  const handleNodeHover = (node: LatticeNode | null) => {
    // 可以在这里处理悬停事件
  };

  const stats = lattice.getStats();

  const typeColors: Record<KnowledgeType, string> = {
    [KnowledgeType.CONCEPT]: 'bg-blue-500',
    [KnowledgeType.RULE]: 'bg-red-500',
    [KnowledgeType.EXPERIENCE]: 'bg-green-500',
    [KnowledgeType.SKILL]: 'bg-orange-500',
    [KnowledgeType.FACT]: 'bg-purple-500',
    [KnowledgeType.PREFERENCE]: 'bg-pink-500',
    [KnowledgeType.MEMORY]: 'bg-gray-500',
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">智能体知识晶格系统</h1>
          <p className="text-slate-400">
            为智能体量身定制的知识管理系统，采用晶格结构组织和表达知识
          </p>
        </div>

        {/* 控制面板 */}
        <div className="mb-6 bg-slate-800 p-4 rounded-lg">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm text-slate-400 mb-1">布局</label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as 'force' | 'circular' | 'hierarchical')}
                className="bg-slate-700 border border-slate-600 rounded px-3 py-2"
              >
                <option value="force">力导向</option>
                <option value="circular">圆形</option>
                <option value="hierarchical">分层</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">布局</label>
              <button
                onClick={() => setShowStats(!showStats)}
                className={`${
                  showStats ? 'bg-blue-600' : 'bg-slate-600'
                } hover:bg-blue-700 px-4 py-2 rounded`}
              >
                {showStats ? '隐藏统计' : '显示统计'}
              </button>
            </div>
            <div className="ml-auto text-slate-400 text-sm">
              节点: {stats.totalNodes} | 边: {stats.totalEdges}
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D 可视化 */}
          <div className="lg:col-span-2 bg-slate-800 rounded-lg overflow-hidden">
            <div className="h-[600px]">
              <KnowledgeLattice3D
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                layout={layout}
              />
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 选中节点详情 */}
            {selectedNode && (
              <div className="bg-slate-800 p-4 rounded-lg">
                <h2 className="text-lg font-bold mb-3">节点详情</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-20">类型:</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        typeColors[selectedNode.type]
                      }`}
                    >
                      {selectedNode.type}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">内容:</span>
                    <p className="mt-1 text-slate-300">{selectedNode.content}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-20">权重:</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${selectedNode.weight * 100}%` }}
                      />
                    </div>
                    <span className="text-xs">{(selectedNode.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-20">可信度:</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${selectedNode.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs">{(selectedNode.confidence * 100).toFixed(0)}%</span>
                  </div>
                  {selectedNode.tags && selectedNode.tags.length > 0 && (
                    <div>
                      <span className="text-slate-400">标签:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedNode.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-slate-700 px-2 py-1 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 统计信息 */}
            {showStats && (
              <div className="bg-slate-800 p-4 rounded-lg">
                <h2 className="text-lg font-bold mb-3">统计信息</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">总节点数:</span>
                    <span>{stats.totalNodes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">总边数:</span>
                    <span>{stats.totalEdges}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">平均权重:</span>
                    <span>{stats.averageWeight.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">平均可信度:</span>
                    <span>{stats.averageConfidence.toFixed(2)}</span>
                  </div>
                  <div className="mt-3">
                    <span className="text-slate-400">按类型分布:</span>
                    <div className="mt-2 space-y-1">
                      {Object.entries(stats.nodesByType).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded ${typeColors[type as KnowledgeType]}`}
                          />
                          <span className="flex-1">{type}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 使用说明 */}
            <div className="bg-slate-800 p-4 rounded-lg">
              <h2 className="text-lg font-bold mb-3">使用说明</h2>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• 点击节点查看详情</li>
                <li>• 拖拽旋转 3D 视图</li>
                <li>• 滚轮缩放</li>
                <li>• 悬停显示节点标签</li>
                <li>• 切换布局查看不同排列</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}