/**
 * 节点详情组件
 */

'use client';

import React from 'react';
import { LatticeNode, KnowledgeType } from '@/lib/agents/knowledge-lattice';

const typeColors: Record<KnowledgeType, string> = {
  [KnowledgeType.CONCEPT]: 'bg-blue-500',
  [KnowledgeType.RULE]: 'bg-red-500',
  [KnowledgeType.EXPERIENCE]: 'bg-green-500',
  [KnowledgeType.SKILL]: 'bg-orange-500',
  [KnowledgeType.FACT]: 'bg-purple-500',
  [KnowledgeType.PREFERENCE]: 'bg-pink-500',
  [KnowledgeType.MEMORY]: 'bg-gray-500',
};

interface NodeDetailsProps {
  node: LatticeNode | null;
}

export function NodeDetails({ node }: NodeDetailsProps) {
  if (!node) return null;

  return (
    <div className="bg-slate-800 p-4 rounded-lg">
      <h2 className="text-lg font-bold mb-3">节点详情</h2>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 w-20">类型:</span>
          <span className={`px-2 py-1 rounded text-xs ${typeColors[node.type]}`}>
            {node.type}
          </span>
        </div>
        <div>
          <span className="text-slate-400">内容:</span>
          <p className="mt-1 text-slate-300">{node.content}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 w-20">权重:</span>
          <div className="flex-1 bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${node.weight * 100}%` }}
            />
          </div>
          <span className="text-xs">{(node.weight * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 w-20">可信度:</span>
          <div className="flex-1 bg-slate-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${node.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs">{(node.confidence * 100).toFixed(0)}%</span>
        </div>
        {node.tags && node.tags.length > 0 && (
          <div>
            <span className="text-slate-400">标签:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {node.tags.map((tag, index) => (
                <span key={index} className="bg-slate-700 px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
