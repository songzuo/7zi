/**
 * 知识晶格侧边栏组件
 */

'use client';

import React from 'react';
import { LatticeNode, LatticeStats } from '@/lib/agents/knowledge-lattice';
import { NodeDetails } from './NodeDetails';
import { StatsPanel } from './StatsPanel';
import { UsageGuide } from './UsageGuide';

interface KnowledgeSidebarProps {
  selectedNode: LatticeNode | null;
  showStats: boolean;
  stats: LatticeStats;
}

export function KnowledgeSidebar({
  selectedNode,
  showStats,
  stats,
}: KnowledgeSidebarProps) {
  return (
    <div className="space-y-6">
      <NodeDetails node={selectedNode} />
      {showStats && <StatsPanel stats={stats} />}
      <UsageGuide />
    </div>
  );
}
