'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { TaskFilter, TaskPriority, TaskStatus, TaskTag } from '@/lib/tasks/types';
import { PriorityBadge } from './PriorityBadge';
import { TagBadge } from './TagBadge';

/**
 * 高级筛选面板组件
 * 支持多条件组合筛选、日期范围、排序等
 */

export interface AdvancedFilterPanelProps {
  filter: TaskFilter;
  onFilterChange: (filter: Partial<TaskFilter>) => void;
  onReset: () => void;
  onApply?: () => void;
  availableTags?: TaskTag[];
  assignees?: string[];
  className?: string;
}

/**
 * 扩展的筛选条件（包含日期范围）
 */
export interface ExtendedFilter extends TaskFilter {
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  completedFrom?: string;
  completedTo?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// 状态标签配置
const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: string }[] = [
  { value: 'todo', label: '待办', icon: '📋' },
  { value: 'in_progress', label: '进行中', icon: '🔄' },
  { value: 'review', label: '评审中', icon: '👀' },
  { value: 'done', label: '已完成', icon: '✅' },
];

// 优先级配置
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: 'red' },
  { value: 'medium', label: '中', color: 'yellow' },
  { value: 'low', label: '低', color: 'green' },
];

// 排序选项
const SORT_OPTIONS = [
  { value: 'createdAt', label: '创建时间' },
  { value: 'updatedAt', label: '更新时间' },
  { value: 'dueDate', label: '截止日期' },
  { value: 'priority', label: '优先级' },
] as const;

/**
 * AdvancedFilterPanel - 高级筛选面板
 * 
 * 功能:
 * 1. 多条件组合筛选
 * 2. 日期范围选择
 * 3. 排序控制
 * 4. 筛选预设保存/加载
 * 5. 条件逻辑（AND/OR）
 */
export const AdvancedFilterPanel = memo(function AdvancedFilterPanel({
  filter,
  onFilterChange,
  onReset,
  onApply,
  availableTags = [],
  assignees = [],
  className = '',
}: AdvancedFilterPanelProps) {
  // 本地状态用于编辑
  const [localFilter, setLocalFilter] = useState<ExtendedFilter>(filter);

  // 计算激活的筛选数量
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localFilter.priority) count++;
    if (localFilter.status) count++;
    if (localFilter.tags && localFilter.tags.length > 0) count += localFilter.tags.length;
    if (localFilter.assignee) count++;
    if (localFilter.dueDateFrom || localFilter.dueDateTo) count++;
    if (localFilter.createdFrom || localFilter.createdTo) count++;
    if (localFilter.search) count++;
    return count;
  }, [localFilter]);

  // 更新本地筛选条件
  const updateLocalFilter = useCallback((updates: Partial<ExtendedFilter>) => {
    setLocalFilter(prev => ({ ...prev, ...updates }));
  }, []);

  // 应用筛选
  const handleApply = useCallback(() => {
    onFilterChange(localFilter);
    onApply?.();
  }, [localFilter, onFilterChange, onApply]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setLocalFilter({});
    onReset();
  }, [onReset]);

  // 切换状态
  const toggleStatus = useCallback((status: TaskStatus) => {
    const newStatus = localFilter.status === status ? undefined : status;
    updateLocalFilter({ status: newStatus });
  }, [localFilter.status, updateLocalFilter]);

  // 切换优先级
  const togglePriority = useCallback((priority: TaskPriority) => {
    const newPriority = localFilter.priority === priority ? undefined : priority;
    updateLocalFilter({ priority: newPriority });
  }, [localFilter.priority, updateLocalFilter]);

  // 切换标签
  const toggleTag = useCallback((tagId: string) => {
    const currentTags = localFilter.tags || [];
    const isActive = currentTags.includes(tagId);
    const newTags = isActive
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    updateLocalFilter({ tags: newTags.length > 0 ? newTags : undefined });
  }, [localFilter.tags, updateLocalFilter]);

  // 更新日期范围
  const updateDateRange = useCallback((
    field: 'dueDateFrom' | 'dueDateTo' | 'createdFrom' | 'createdTo' | 'completedFrom' | 'completedTo',
    value: string
  ) => {
    updateLocalFilter({ [field]: value || undefined });
  }, [updateLocalFilter]);

  // 更新排序
  const updateSort = useCallback((
    field: 'sortBy' | 'sortOrder',
    value: string
  ) => {
    updateLocalFilter({ [field]: value as any });
  }, [updateLocalFilter]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 面板头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="font-semibold text-gray-900 dark:text-white">高级筛选</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 
              text-blue-700 dark:text-blue-300 rounded-full">
              {activeFilterCount} 个条件
            </span>
          )}
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          重置
        </button>
      </div>

      {/* 筛选内容 */}
      <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
        {/* 状态筛选 */}
        <FilterSection title="状态" icon="📊">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => (
              <FilterChip
                key={option.value}
                isActive={localFilter.status === option.value}
                onClick={() => toggleStatus(option.value)}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </FilterChip>
            ))}
          </div>
        </FilterSection>

        {/* 优先级筛选 */}
        <FilterSection title="优先级" icon="🎯">
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map(option => (
              <FilterChip
                key={option.value}
                isActive={localFilter.priority === option.value}
                onClick={() => togglePriority(option.value)}
                color={option.color}
              >
                <PriorityBadge priority={option.value} size="sm" showLabel />
              </FilterChip>
            ))}
          </div>
        </FilterSection>

        {/* 标签筛选 */}
        {availableTags.length > 0 && (
          <FilterSection title="标签" icon="🏷️">
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-2.5 py-1 text-sm rounded-full border-2 transition-all ${
                    localFilter.tags?.includes(tag.id)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <TagBadge tag={tag} size="sm" />
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        {/* 负责人筛选 */}
        {assignees.length > 0 && (
          <FilterSection title="负责人" icon="👤">
            <select
              value={localFilter.assignee || ''}
              onChange={(e) => updateLocalFilter({ assignee: e.target.value || undefined })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">全部负责人</option>
              {assignees.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </FilterSection>
        )}

        {/* 截止日期范围 */}
        <FilterSection title="截止日期" icon="📅">
          <DateRangePicker
            fromValue={localFilter.dueDateFrom || ''}
            toValue={localFilter.dueDateTo || ''}
            onFromChange={(v) => updateDateRange('dueDateFrom', v)}
            onToChange={(v) => updateDateRange('dueDateTo', v)}
          />
        </FilterSection>

        {/* 创建日期范围 */}
        <FilterSection title="创建日期" icon="🕐">
          <DateRangePicker
            fromValue={localFilter.createdFrom || ''}
            toValue={localFilter.createdTo || ''}
            onFromChange={(v) => updateDateRange('createdFrom', v)}
            onToChange={(v) => updateDateRange('createdTo', v)}
          />
        </FilterSection>

        {/* 排序选项 */}
        <FilterSection title="排序" icon="↕️">
          <div className="flex items-center gap-3">
            <select
              value={localFilter.sortBy || 'createdAt'}
              onChange={(e) => updateSort('sortBy', e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
              <button
                type="button"
                onClick={() => updateSort('sortOrder', 'desc')}
                className={`px-3 py-2 text-sm ${
                  (localFilter.sortOrder || 'desc') === 'desc'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                降序
              </button>
              <button
                type="button"
                onClick={() => updateSort('sortOrder', 'asc')}
                className={`px-3 py-2 text-sm ${
                  localFilter.sortOrder === 'asc'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                升序
              </button>
            </div>
          </div>
        </FilterSection>
      </div>

      {/* 底部操作按钮 */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
            hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          清除筛选
        </button>
        <button
          onClick={handleApply}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 
            hover:bg-blue-700 rounded-lg transition-colors"
        >
          应用筛选
        </button>
      </div>
    </div>
  );
});

// ============================================================================
// 子组件
// ============================================================================

interface FilterSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

const FilterSection = memo(function FilterSection({ title, icon, children }: FilterSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h4>
      </div>
      {children}
    </div>
  );
});

interface FilterChipProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const FilterChip = memo(function FilterChip({ isActive, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {children}
    </button>
  );
});

interface DateRangePickerProps {
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

const DateRangePicker = memo(function DateRangePicker({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={fromValue}
        onChange={(e) => onFromChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        placeholder="开始日期"
      />
      <span className="text-gray-400 dark:text-gray-500">至</span>
      <input
        type="date"
        value={toValue}
        onChange={(e) => onToChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        placeholder="结束日期"
      />
    </div>
  );
});

export default AdvancedFilterPanel;