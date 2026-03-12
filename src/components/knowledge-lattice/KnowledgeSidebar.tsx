/**
 * 知识晶格侧边栏组件
 */

'use client';

import React from 'react';
import { KnowledgeNode, KnowledgeStats } from './types';
import { NodeDetails } from './NodeDetails';
import { StatsPanel } from './StatsPanel';
import { UsageGuide } from './UsageGuide';

interface KnowledgeSidebarProps {
  selectedNode: KnowledgeNode | null;
  showStats: boolean;
  stats: KnowledgeStats;
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
