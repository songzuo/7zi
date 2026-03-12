/**
 * 知识晶格演示页面
 *
 * 展示知识晶格系统的功能
 */

'use client';

import React from 'react';
import { ControlPanel } from '@/components/knowledge-lattice/ControlPanel';
import { PageHeader } from '@/components/knowledge-lattice/PageHeader';
import { VisualizationContainer } from '@/components/knowledge-lattice/VisualizationContainer';
import { KnowledgeSidebar } from '@/components/knowledge-lattice/KnowledgeSidebar';
import { useKnowledgeLattice } from '@/components/knowledge-lattice/useKnowledgeLattice';

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
        <PageHeader />
        <ControlPanel
          layout={layout}
          showStats={showStats}
          totalNodes={stats.totalNodes}
          totalEdges={stats.totalEdges}
          onLayoutChange={setLayout}
          onStatsToggle={() => {}}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <VisualizationContainer
            nodes={nodes}
            edges={edges}
            layout={layout}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
          />
          <KnowledgeSidebar
            selectedNode={selectedNode}
            showStats={showStats}
            stats={stats}
          />
        </div>
      </div>
    </div>
  );
}