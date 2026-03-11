/**
 * 统计面板组件
 */

'use client';

import React from 'react';
import { KnowledgeType } from '@/lib/agents/knowledge-lattice';

const typeColors: Record<KnowledgeType, string> = {
  [KnowledgeType.CONCEPT]: 'bg-blue-500',
  [KnowledgeType.RULE]: 'bg-red-500',
  [KnowledgeType.EXPERIENCE]: 'bg-green-500',
  [KnowledgeType.SKILL]: 'bg-orange-500',
  [KnowledgeType.FACT]: 'bg-purple-500',
  [KnowledgeType.PREFERENCE]: 'bg-pink-500',
  [KnowledgeType.MEMORY]: 'bg-gray-500',
};

interface Stats {
  totalNodes: number;
  totalEdges: number;
  averageWeight: number;
  averageConfidence: number;
  nodesByType: Record<string, number>;
}

interface StatsPanelProps {
  stats: Stats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
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
                <div className={`w-2 h-2 rounded ${typeColors[type as KnowledgeType]}`} />
                <span className="flex-1">{type}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
