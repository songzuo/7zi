/**
 * 控制面板组件
 */

'use client';

import React from 'react';
import type { LayoutType } from './hooks/useKnowledgeLattice';

interface ControlPanelProps {
  layout: LayoutType;
  showStats: boolean;
  totalNodes: number;
  totalEdges: number;
  onLayoutChange: (layout: LayoutType) => void;
  onStatsToggle: () => void;
}

export function ControlPanel({
  layout,
  showStats,
  totalNodes,
  totalEdges,
  onLayoutChange,
  onStatsToggle,
}: ControlPanelProps) {
  return (
    <div className="mb-6 bg-slate-800 p-4 rounded-lg">
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm text-slate-400 mb-1">布局</label>
          <select
            value={layout}
            onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
            className="bg-slate-700 border border-slate-600 rounded px-3 py-2"
          >
            <option value="force">力导向</option>
            <option value="circular">圆形</option>
            <option value="hierarchical">分层</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">统计</label>
          <button
            onClick={onStatsToggle}
            className={`${
              showStats ? 'bg-blue-600' : 'bg-slate-600'
            } hover:bg-blue-700 px-4 py-2 rounded`}
          >
            {showStats ? '隐藏统计' : '显示统计'}
          </button>
        </div>
        <div className="ml-auto text-slate-400 text-sm">
          节点: {totalNodes} | 边: {totalEdges}
        </div>
      </div>
    </div>
  );
}
