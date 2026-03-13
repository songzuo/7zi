/**
 * 3D 可视化容器组件
 */

'use client';

import React from 'react';
import { LatticeNode, LatticeEdge } from '@/lib/agents/knowledge-lattice';
import type { LayoutType } from './layoutUtils';
import KnowledgeLattice3D from './KnowledgeLattice3D';

interface VisualizationContainerProps {
  nodes: LatticeNode[];
  edges: LatticeEdge[];
  layout: LayoutType;
  onNodeClick: (node: LatticeNode) => void;
  onNodeHover: (node: LatticeNode | null) => void;
}

export function VisualizationContainer({
  nodes,
  edges,
  layout,
  onNodeClick,
  onNodeHover,
}: VisualizationContainerProps) {
  return (
    <div className="lg:col-span-2 bg-slate-800 rounded-lg overflow-hidden">
      <div className="h-[600px]">
        <KnowledgeLattice3D
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
          layout={layout}
        />
      </div>
    </div>
  );
}
