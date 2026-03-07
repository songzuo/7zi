'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { TaskFilter, TaskPriority, TaskStatus, TaskTag } from '@/lib/tasks/types';
import { PriorityBadge } from './PriorityBadge';

interface TaskFilterPanelProps {
  filter: TaskFilter;
  onFilterChange: (filter: Partial<TaskFilter>) => void;
  onReset: () => void;
  availableTags?: TaskTag[];
  assignees?: string[];
  className?: string;
}

// 状态标签配置 - 移到组件外部
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  review: '评审中',
  done: '已完成',
};

const PRIORITIES: TaskPriority[] = ['high', 'medium', 'low'];
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

/**
 * 任务过滤器面板组件 - 性能优化版本
 * 
 * 优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 使用 useCallback 缓存事件处理函数
 * 3. 配置移到组件外部
 */
export const TaskFilterPanel = memo(function TaskFilterPanel({
  filter,
  onFilterChange,
  onReset,
  availableTags = [],
  assignees = [],
  className = '',
}: TaskFilterPanelProps) {
  const hasActiveFilters = useMemo(() =>
    !!(filter.priority || filter.status || (filter.tags && filter.tags.length > 0) || filter.assignee || filter.search),
    [filter.priority, filter.status, filter.tags, filter.assignee, filter.search]
  );

  // 使用 useCallback 缓存事件处理
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value || undefined });
  }, [onFilterChange]);

  const handlePriorityChange = useCallback((priority: TaskPriority) => () => {
    const isActive = filter.priority === priority;
    onFilterChange({ priority: isActive ? undefined : priority });
  }, [filter.priority, onFilterChange]);

  const handleStatusChange = useCallback((status: TaskStatus) => () => {
    const isActive = filter.status === status;
    onFilterChange({ status: isActive ? undefined : status });
  }, [filter.status, onFilterChange]);

  const handleTagChange = useCallback((tagId: string) => () => {
    const currentTags = filter.tags || [];
    const isActive = currentTags.includes(tagId);
    const newTags = isActive
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId];
    onFilterChange({ tags: newTags.length > 0 ? newTags : undefined });
  }, [filter.tags, onFilterChange]);

  const handleAssigneeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ assignee: e.target.value || undefined });
  }, [onFilterChange]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 ${className}`}
    >
      <FilterHeader hasActiveFilters={hasActiveFilters} onReset={onReset} />

      <div className="space-y-4">
        {/* 搜索 */}
        <SearchInput
          value={filter.search || ''}
          onChange={handleSearchChange}
        />

        {/* 优先级 */}
        <PriorityFilter
          activePriority={filter.priority}
          onPriorityChange={handlePriorityChange}
        />

        {/* 状态 */}
        <StatusFilter
          activeStatus={filter.status}
          onStatusChange={handleStatusChange}
        />

        {/* 标签 */}
        {availableTags.length > 0 && (
          <TagFilter
            availableTags={availableTags}
            activeTags={filter.tags || []}
            onTagChange={handleTagChange}
          />
        )}

        {/* 负责人 */}
        {assignees.length > 0 && (
          <AssigneeFilter
            assignees={assignees}
            value={filter.assignee || ''}
            onChange={handleAssigneeChange}
          />
        )}
      </div>
    </div>
  );
});

// ============================================================================
// 子组件
// ============================================================================

interface FilterHeaderProps {
  hasActiveFilters: boolean;
  onReset: () => void;
}

const FilterHeader = memo(function FilterHeader({ hasActiveFilters, onReset }: FilterHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">筛选任务</h3>
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          重置筛选
        </button>
      )}
    </div>
  );
});

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchInput = memo(function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div>
      <label
        htmlFor="filter-search"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        搜索
      </label>
      <input
        id="filter-search"
        type="text"
        value={value}
        onChange={onChange}
        placeholder="搜索任务标题或描述..."
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
    </div>
  );
});

interface PriorityFilterProps {
  activePriority?: TaskPriority;
  onPriorityChange: (priority: TaskPriority) => () => void;
}

const PriorityFilter = memo(function PriorityFilter({ activePriority, onPriorityChange }: PriorityFilterProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        优先级
      </label>
      <div className="flex flex-wrap gap-2">
        {PRIORITIES.map((priority) => (
          <FilterButton
            key={priority}
            isActive={activePriority === priority}
            onClick={onPriorityChange(priority)}
          >
            <PriorityBadge priority={priority} size="sm" showLabel />
          </FilterButton>
        ))}
      </div>
    </div>
  );
});

interface StatusFilterProps {
  activeStatus?: TaskStatus;
  onStatusChange: (status: TaskStatus) => () => void;
}

const StatusFilter = memo(function StatusFilter({ activeStatus, onStatusChange }: StatusFilterProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        状态
      </label>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <FilterButton
            key={status}
            isActive={activeStatus === status}
            onClick={onStatusChange(status)}
          >
            {STATUS_LABELS[status]}
          </FilterButton>
        ))}
      </div>
    </div>
  );
});

interface TagFilterProps {
  availableTags: TaskTag[];
  activeTags: string[];
  onTagChange: (tagId: string) => () => void;
}

const TagFilter = memo(function TagFilter({ availableTags, activeTags, onTagChange }: TagFilterProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        标签
      </label>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <FilterButton
            key={tag.id}
            isActive={activeTags.includes(tag.id)}
            onClick={onTagChange(tag.id)}
          >
            {tag.name}
          </FilterButton>
        ))}
      </div>
    </div>
  );
});

interface AssigneeFilterProps {
  assignees: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const AssigneeFilter = memo(function AssigneeFilter({ assignees, value, onChange }: AssigneeFilterProps) {
  return (
    <div>
      <label
        htmlFor="filter-assignee"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        负责人
      </label>
      <select
        id="filter-assignee"
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        <option value="">全部</option>
        {assignees.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
});

// ============================================================================
// 通用按钮组件
// ============================================================================

interface FilterButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const FilterButton = memo(function FilterButton({ isActive, onClick, children }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-sm rounded-lg border-2 transition-all
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${
          isActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
      aria-pressed={isActive}
    >
      {children}
    </button>
  );
});
