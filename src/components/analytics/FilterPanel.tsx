/**
 * Filter Panel Component
 * 数据筛选面板
 */

'use client';

import React, { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { type AnalyticsFilters } from '@/lib/types/analytics';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FilterPanelProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  locale?: string;
  className?: string;
}

interface FilterSection {
  id: string;
  title: { en: string; zh: string };
  type: 'checkbox' | 'select' | 'multi-select';
  options?: Array<{ value: string; label: { en: string; zh: string } }>;
  selected?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const FILTER_SECTIONS: FilterSection[] = [
  {
    id: 'taskStatuses',
    title: { en: 'Task Status', zh: '任务状态' },
    type: 'checkbox',
    options: [
      { value: 'completed', label: { en: 'Completed', zh: '已完成' } },
      { value: 'in-progress', label: { en: 'In Progress', zh: '进行中' } },
      { value: 'pending', label: { en: 'Pending', zh: '待处理' } },
      { value: 'cancelled', label: { en: 'Cancelled', zh: '已取消' } }
    ]
  },
  {
    id: 'taskPriorities',
    title: { en: 'Task Priority', zh: '任务优先级' },
    type: 'checkbox',
    options: [
      { value: 'high', label: { en: 'High', zh: '高' } },
      { value: 'medium', label: { en: 'Medium', zh: '中' } },
      { value: 'low', label: { en: 'Low', zh: '低' } }
    ]
  },
  {
    id: 'taskTypes',
    title: { en: 'Task Type', zh: '任务类型' },
    type: 'checkbox',
    options: [
      { value: 'analysis', label: { en: 'Analysis', zh: '分析' } },
      { value: 'implementation', label: { en: 'Implementation', zh: '实现' } },
      { value: 'testing', label: { en: 'Testing', zh: '测试' } },
      { value: 'design', label: { en: 'Design', zh: '设计' } }
    ]
  },
  {
    id: 'providers',
    title: { en: 'AI Provider', zh: 'AI 提供商' },
    type: 'checkbox',
    options: [
      { value: 'minimax', label: { en: 'MiniMax', zh: 'MiniMax' } },
      { value: 'self-claude', label: { en: 'Self-Claude', zh: 'Self-Claude' } },
      { value: 'volcengine', label: { en: 'Volcengine', zh: '火山引擎' } },
      { value: 'bailian', label: { en: 'Bailian', zh: '百炼' } }
    ]
  },
  {
    id: 'metrics',
    title: { en: 'Metrics', zh: '指标' },
    type: 'checkbox',
    options: [
      { value: 'agents', label: { en: 'Active Agents', zh: '活跃代理' } },
      { value: 'users', label: { en: 'Active Users', zh: '活跃用户' } },
      { value: 'tasks', label: { en: 'Tasks', zh: '任务' } },
      { value: 'tokens', label: { en: 'Tokens Used', zh: 'Token 使用' } },
      { value: 'revenue', label: { en: 'Revenue', zh: '收入' } },
      { value: 'errors', label: { en: 'Errors', zh: '错误' } }
    ]
  }
];

// ============================================================================
// Main Component
// ============================================================================

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  locale = 'en',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    taskStatuses: true,
    taskPriorities: true
  });

  const t = locale === 'zh' ? 'zh' : 'en';

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleCheckboxChange = (filterId: keyof AnalyticsFilters, value: string) => {
    const currentFilters = filters[filterId] as string[] | undefined;
    const newFilters = currentFilters?.includes(value)
      ? currentFilters.filter(v => v !== value)
      : [...(currentFilters || []), value];

    onFiltersChange({
      ...filters,
      [filterId]: newFilters.length > 0 ? newFilters : undefined
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      timeRange: filters.timeRange,
      customRange: filters.customRange
    });
  };

  const getActiveFiltersCount = (): number => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'timeRange' || key === 'customRange') return;
      if (Array.isArray(value) && value.length > 0) count++;
    });
    return count;
  };

  return (
    <div className={`bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t === 'zh' ? '筛选' : 'Filters'}
          </h3>
          {getActiveFiltersCount() > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {getActiveFiltersCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {t === 'zh' ? '清除全部' : 'Clear All'}
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      {/* Filter Sections */}
      {isOpen && (
        <div className="p-4 space-y-4">
          {FILTER_SECTIONS.map(section => {
            const sectionTitle = section.title[t];
            const selectedValues = filters[section.id as keyof AnalyticsFilters] as string[] || [];

            return (
              <div key={section.id} className="border-b border-zinc-100 dark:border-zinc-700/50 last:border-0 pb-4 last:pb-0">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                >
                  {sectionTitle}
                  {expandedSections[section.id] ? (
                    <ChevronUp className="w-4 h-4 ml-2 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
                  )}
                </button>

                {expandedSections[section.id] && section.options && (
                  <div className="mt-3 space-y-2">
                    {section.options.map(option => {
                      const isChecked = selectedValues.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 rounded-lg cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(section.id as keyof AnalyticsFilters, option.value)}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {option.label[t]}
                          </span>
                          {isChecked && (
                            <X
                              className="w-4 h-4 text-blue-600 ml-auto cursor-pointer hover:text-blue-700"
                              onClick={() => handleCheckboxChange(section.id as keyof AnalyticsFilters, option.value)}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Apply Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t === 'zh' ? '应用筛选' : 'Apply Filters'}
          </button>
        </div>
      )}
    </div>
  );
};

// 使用 React.memo 优化，减少不必要的重渲染
export default React.memo(FilterPanel, (prevProps, nextProps) => {
  // 深度比较 filters 对象
  return JSON.stringify(prevProps.filters) === JSON.stringify(nextProps.filters) &&
         prevProps.locale === nextProps.locale &&
         prevProps.className === nextProps.className;
});
