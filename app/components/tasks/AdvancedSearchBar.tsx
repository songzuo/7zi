'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { TaskFilter, TaskTag } from '@/lib/tasks/types';

/**
 * 高级搜索栏组件
 * 支持关键词搜索 + 快捷筛选
 */

export interface AdvancedSearchBarProps {
  filter: TaskFilter;
  onFilterChange: (filter: Partial<TaskFilter>) => void;
  availableTags?: TaskTag[];
  assignees?: string[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showAdvancedToggle?: boolean;
  onAdvancedToggle?: () => void;
  isAdvancedOpen?: boolean;
}

/**
 * 搜索历史项接口
 */
interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

// 搜索历史最大数量
const MAX_HISTORY_ITEMS = 5;

/**
 * AdvancedSearchBar - 高级搜索组件
 * 
 * 功能:
 * 1. 关键词搜索（支持标题和描述）
 * 2. 搜索历史记录
 * 3. 快捷筛选按钮
 * 4. 高级筛选面板切换
 * 5. 搜索建议
 */
export const AdvancedSearchBar = memo(function AdvancedSearchBar({
  filter,
  onFilterChange,
  placeholder = '搜索任务标题、描述...',
  className = '',
  autoFocus = false,
  showAdvancedToggle = true,
  onAdvancedToggle,
  isAdvancedOpen = false,
}: AdvancedSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // 计算激活的筛选数量
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.priority) count++;
    if (filter.status) count++;
    if (filter.tags && filter.tags.length > 0) count++;
    if (filter.assignee) count++;
    return count;
  }, [filter]);

  // 加载搜索历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem('task-search-history');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // 保存搜索历史
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.query !== query);
      const newItem: SearchHistoryItem = { query, timestamp: Date.now() };
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      
      try {
        localStorage.setItem('task-search-history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      
      return updated;
    });
  }, []);

  // 清除搜索历史
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('task-search-history');
    } catch {
      // ignore
    }
    setShowHistory(false);
  }, []);

  // 点击外部关闭历史
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 输入处理
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value || undefined });
  }, [onFilterChange]);

  // 提交搜索
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (filter.search?.trim()) {
      saveToHistory(filter.search.trim());
      setShowHistory(false);
      inputRef.current?.blur();
    }
  }, [filter.search, saveToHistory]);

  // 从历史选择
  const handleHistorySelect = useCallback((query: string) => {
    onFilterChange({ search: query });
    setShowHistory(false);
    inputRef.current?.focus();
  }, [onFilterChange]);

  // 清除搜索
  const handleClear = useCallback(() => {
    onFilterChange({ search: undefined });
    inputRef.current?.focus();
  }, [onFilterChange]);

  // 快捷筛选
  const handleQuickFilter = useCallback((type: 'today' | 'week' | 'overdue' | 'high') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (type) {
      case 'today': {
        onFilterChange({ 
          dueDateFrom: today.toISOString(),
          dueDateTo: new Date(today.getTime() + 86400000).toISOString(),
        });
        break;
      }
      case 'week': {
        const weekEnd = new Date(today.getTime() + 7 * 86400000);
        onFilterChange({ 
          dueDateFrom: today.toISOString(),
          dueDateTo: weekEnd.toISOString(),
        });
        break;
      }
      case 'overdue':
        onFilterChange({ 
          dueDateTo: today.toISOString(),
          status: undefined,
        });
        break;
      case 'high':
        onFilterChange({ priority: 'high' });
        break;
    }
  }, [onFilterChange]);

  // 键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Cmd/Ctrl + K 聚焦搜索
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      inputRef.current?.focus();
    }
    // Escape 清除搜索
    if (e.key === 'Escape') {
      if (filter.search) {
        handleClear();
      } else {
        inputRef.current?.blur();
      }
    }
  }, [filter.search, handleClear]);

  return (
    <div className={`relative ${className}`}>
      {/* 搜索输入框 */}
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative flex items-center transition-all duration-200 ${
          isFocused ? 'ring-2 ring-blue-500' : ''
        }`}>
          {/* 搜索图标 */}
          <div className="absolute left-3 pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={filter.search || ''}
            onChange={handleInputChange}
            onFocus={() => {
              setIsFocused(true);
              setShowHistory(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full pl-10 pr-24 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-800 text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none transition-all duration-200"
            aria-label="搜索任务"
          />

          {/* 右侧按钮组 */}
          <div className="absolute right-2 flex items-center gap-1">
            {/* 清除按钮 */}
            {filter.search && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  rounded transition-colors"
                aria-label="清除搜索"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* 高级筛选按钮 */}
            {showAdvancedToggle && (
              <button
                type="button"
                onClick={onAdvancedToggle}
                className={`relative p-1.5 rounded transition-colors ${
                  isAdvancedOpen || activeFilterCount > 0
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                aria-label="高级筛选"
                aria-expanded={isAdvancedOpen}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-medium
                    bg-blue-600 text-white rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* 搜索历史下拉 */}
      {showHistory && searchHistory.length > 0 && (
        <div
          ref={historyRef}
          className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">搜索历史</span>
            <button
              onClick={clearHistory}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              清除
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {searchHistory.map((item, index) => (
              <li key={`${item.query}-${index}`}>
                <button
                  type="button"
                  onClick={() => handleHistorySelect(item.query)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700
                    flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate">{item.query}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 快捷筛选按钮 */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <QuickFilterButton
          label="今日到期"
          onClick={() => handleQuickFilter('today')}
        />
        <QuickFilterButton
          label="本周到期"
          onClick={() => handleQuickFilter('week')}
        />
        <QuickFilterButton
          label="已逾期"
          onClick={() => handleQuickFilter('overdue')}
        />
        <QuickFilterButton
          label="高优先级"
          onClick={() => handleQuickFilter('high')}
        />
      </div>
    </div>
  );
});

// ============================================================================
// 快捷筛选按钮
// ============================================================================

interface QuickFilterButtonProps {
  label: string;
  onClick: () => void;
}

const QuickFilterButton = memo(function QuickFilterButton({ label, onClick }: QuickFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700
        text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800
        hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400
        hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
    >
      {label}
    </button>
  );
});

export default AdvancedSearchBar;