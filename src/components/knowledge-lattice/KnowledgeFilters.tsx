/**
 * 知识晶格筛选器组件
 */

'use client';

import React from 'react';
import { KnowledgeType, RelationType } from '@/lib/agents/knowledge-lattice';

export interface KnowledgeFiltersProps {
  selectedTypes: KnowledgeType[];
  selectedRelations: RelationType[];
  onTypeChange: (types: KnowledgeType[]) => void;
  onRelationChange: (relations: RelationType[]) => void;
}

const KNOWLEDGE_TYPES: { value: KnowledgeType; label: string; color: string }[] = [
  { value: KnowledgeType.CONCEPT, label: '概念', color: '#3B82F6' },
  { value: KnowledgeType.RULE, label: '规则', color: '#EF4444' },
  { value: KnowledgeType.EXPERIENCE, label: '经验', color: '#10B981' },
  { value: KnowledgeType.SKILL, label: '技能', color: '#F59E0B' },
  { value: KnowledgeType.FACT, label: '事实', color: '#8B5CF6' },
  { value: KnowledgeType.PREFERENCE, label: '偏好', color: '#EC4899' },
  { value: KnowledgeType.MEMORY, label: '记忆', color: '#6B7280' },
];

const RELATION_TYPES: { value: RelationType; label: string }[] = [
  { value: RelationType.PARTIAL_ORDER, label: '偏序' },
  { value: RelationType.EQUIVALENCE, label: '等价' },
  { value: RelationType.COMPLEMENT, label: '互补' },
  { value: RelationType.ASSOCIATION, label: '关联' },
  { value: RelationType.CAUSAL, label: '因果' },
];

export default function KnowledgeFilters({
  selectedTypes,
  selectedRelations,
  onTypeChange,
  onRelationChange,
}: KnowledgeFiltersProps) {
  const handleTypeToggle = (type: KnowledgeType) => {
    if (selectedTypes.includes(type)) {
      onTypeChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypeChange([...selectedTypes, type]);
    }
  };

  const handleRelationToggle = (relation: RelationType) => {
    if (selectedRelations.includes(relation)) {
      onRelationChange(selectedRelations.filter(r => r !== relation));
    } else {
      onRelationChange([...selectedRelations, relation]);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">知识类型</h3>
        <div className="flex flex-wrap gap-2">
          {KNOWLEDGE_TYPES.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => handleTypeToggle(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedTypes.includes(value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              style={{
                borderLeft: `3px solid ${color}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">关系类型</h3>
        <div className="flex flex-wrap gap-2">
          {RELATION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleRelationToggle(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedRelations.includes(value)
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}