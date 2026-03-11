/**
 * 知识晶格演示页面
 *
 * 展示知识晶格系统的功能
 */

'use client';

import React from 'react';
import {
  KnowledgeLattice3D,
  ControlPanel,
  NodeDetails,
  StatsPanel,
  UsageGuide,
  useKnowledgeLattice,
} from '@/components/knowledge-lattice';

export default function KnowledgeLatticeDemo() {
  const {
    nodes,
    edges,
    selectedNode,
    showStats,
    layout,
    setLayout,
    handleNodeClick,
    handleNodeHover,
    stats,
  } = useKnowledgeLattice();

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
        <ControlPanel
          layout={layout}
          showStats={showStats}
          totalNodes={stats.totalNodes}
          totalEdges={stats.totalEdges}
          onLayoutChange={setLayout}
          onStatsToggle={() => {
            const { setShowStats } = useKnowledgeLattice.getState?.() || {};
            // 直接使用 hook 返回的 setter
          }}
        />

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
            <NodeDetails node={selectedNode} />
            {showStats && <StatsPanel stats={stats} />}
            <UsageGuide />
          </div>
        </div>
      </div>
    </div>
  );
}
