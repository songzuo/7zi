/**
 * 3D 可视化容器组件
 */

'use client';

import React from 'react';
import { KnowledgeNode, KnowledgeEdge, LayoutType } from './types';
import { KnowledgeLattice3D } from './KnowledgeLattice3D';

interface VisualizationContainerProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  layout: LayoutType;
  onNodeClick: (node: KnowledgeNode) => void;
  onNodeHover: (node: KnowledgeNode | null) => void;
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
