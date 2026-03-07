'use client';

import React, { useState, useCallback, memo, useMemo, useId } from 'react';
import { useFilters } from '@/hooks/useFilters';
import {
  FilterConfig,
  FieldConfig,
  FilterTemplate,
  FILTER_TEMPLATES,
  OPERATOR_LABELS,
} from '@/lib/types/filters';

// ============================================================================
// 类型定义
// ============================================================================

interface FilterBarProps<T extends Record<string, any>> {
  data: T[];
  fields: FieldConfig[];
  filteredData: T[];
  activeFilters: FilterConfig[];
  savedFilters: FilterConfig[];
  onAddFilter: (filter: FilterConfig) => void;
  onRemoveFilter: (filterId: string) => void;
  onClearFilters: () => void;
  onCreateFromTemplate: (template: FilterTemplate) => void;
  onApplySavedFilter: (filterId: string) => void;
  showStats?: boolean;
  className?: string;
}

interface ActiveFilterChipProps {
  filter: FilterConfig;
  fields: FieldConfig[];
  onRemove: () => void;
}

interface SavedFiltersDropdownProps {
  savedFilters: FilterConfig[];
  onApply: (filterId: string) => void;
  onDelete?: (filterId: string) => void;
}

// ============================================================================
// 激活过滤器标签组件
// ============================================================================

const ActiveFilterChip = memo(function ActiveFilterChip({
  filter,
  fields,
  onRemove,
}: ActiveFilterChipProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 获取条件的简要描述
  const conditionSummary = useMemo(() => {
    if (filter.conditions.length === 1) {
      const cond = filter.conditions[0];
      const field = fields.find(f => f.name === cond.field);
      const valueDisplay = cond.value !== null && cond.value !== undefined
        ? Array.isArray(cond.value)
          ? cond.value.join(', ')
          : String(cond.value)
        : '';
      
      return `${field?.label || cond.field} ${OPERATOR_LABELS[cond.operator]} ${valueDisplay}`;
    }
    return `${filter.conditions.length} 个条件 (${filter.logic})`;
  }, [filter, fields]);

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div 
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 
                   bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 
                   rounded-full text-sm cursor-default"
        role="group"
        aria-label={`激活过滤器：${filter.name}`}
      >
        <span className="font-medium truncate max-w-[120px]">{filter.name}</span>
        <button
          onClick={onRemove}
          className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`移除过滤器：${filter.name}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 展开详情 */}
      {isExpanded && (
        <div 
          className="absolute top-full left-0 z-20 mt-1 p-3 min-w-[200px] max-w-[300px]
                     bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                     rounded-lg shadow-lg text-sm"
          role="tooltip"
        >
          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">{filter.name}</p>
          <ul className="space-y-1">
            {filter.conditions.map((cond, idx) => {
              const field = fields.find(f => f.name === cond.field);
              const valueDisplay = cond.value !== null && cond.value !== undefined
                ? Array.isArray(cond.value)
                  ? cond.value.join(', ')
                  : String(cond.value)
                : '(空)';
              
              return (
                <li key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                  {field?.label || cond.field} {OPERATOR_LABELS[cond.operator]} {valueDisplay}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500">
            逻辑：{filter.logic === 'AND' ? '全部满足' : '任一满足'}
          </p>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 保存过滤器下拉组件
// ============================================================================

const SavedFiltersDropdown = memo(function SavedFiltersDropdown({
  savedFilters,
  onApply,
  onDelete,
}: SavedFiltersDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (savedFilters.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
                   text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                   border border-gray-300 dark:border-gray-600 rounded-lg 
                   hover:bg-gray-50 dark:hover:bg-gray-600 
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <span>已保存 ({savedFilters.length})</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
             fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 z-10 mt-1 w-64 max-h-[300px] overflow-y-auto
                     bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                     rounded-lg shadow-lg"
          role="listbox"
        >
          {savedFilters.map(filter => (
            <div 
              key={filter.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 
                         dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 last:border-0"
              role="option"
            >
              <button
                onClick={() => {
                  onApply(filter.id);
                  setIsOpen(false);
                }}
                className="flex-1 text-left"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {filter.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {filter.conditions.length} 条件 · {filter.logic}
                </p>
              </button>
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(filter.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 
                             dark:hover:bg-red-900/20 rounded
                             focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`删除过滤器：${filter.name}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// 过滤器栏组件
// ============================================================================

export function FilterBar<T extends Record<string, any>>({
  data,
  fields,
  filteredData,
  activeFilters,
  savedFilters,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
  onCreateFromTemplate,
  onApplySavedFilter,
  showStats = true,
  className = '',
}: FilterBarProps<T>) {
  const [showTemplates, setShowTemplates] = useState(false);
  const barId = useId();
  
  // 获取相关模板
  const templates = useMemo(() => {
    const type = fields === require('@/lib/types/filters').TASK_FILTER_FIELDS ? 'task' : 'member';
    return FILTER_TEMPLATES.filter(t => t.category === type || t.category === 'general');
  }, [fields]);

  const hasFilters = activeFilters.length > 0;
  const hasData = data.length > 0;

  return (
    <div 
      className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 ${className}`}
      role="toolbar"
      aria-label="过滤器工具栏"
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* 统计信息 */}
        {showStats && hasData && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {filteredData.length}
            </span>
            <span>/</span>
            <span>{data.length}</span>
            {hasFilters && (
              <span className="text-blue-600 dark:text-blue-400">已过滤</span>
            )}
          </div>
        )}

        {/* 分隔符 */}
        {showStats && hasData && (
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" role="separator" />
        )}

        {/* 激活的过滤器标签 */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="激活的过滤器">
            {activeFilters.map(filter => (
              <ActiveFilterChip
                key={filter.id}
                filter={filter}
                fields={fields}
                onRemove={() => onRemoveFilter(filter.id)}
              />
            ))}
          </div>
        )}

        {/* 清除按钮 */}
        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium 
                       text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400
                       hover:bg-red-50 dark:hover:bg-red-900/20 rounded
                       focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            aria-label="清除所有过滤器"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" />
            </svg>
            清除全部
          </button>
        )}

        {/* 右侧操作区 */}
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          {/* 保存的过滤器 */}
          <SavedFiltersDropdown
            savedFilters={savedFilters}
            onApply={onApplySavedFilter}
          />

          {/* 模板按钮 */}
          {templates.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
                           text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                           border border-gray-300 dark:border-gray-600 rounded-lg 
                           hover:bg-gray-50 dark:hover:bg-gray-600 
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-expanded={showTemplates}
                aria-haspopup="listbox"
              >
                <span>📋</span>
                <span className="hidden sm:inline">快速过滤</span>
              </button>

              {showTemplates && (
                <div 
                  className="absolute top-full right-0 z-10 mt-1 w-56 max-h-[300px] overflow-y-auto
                             bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                             rounded-lg shadow-lg"
                  role="listbox"
                >
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => {
                        onCreateFromTemplate(template);
                        setShowTemplates(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left 
                                 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                                 focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/30"
                      role="option"
                    >
                      <span className="text-lg">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {template.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilterBar;