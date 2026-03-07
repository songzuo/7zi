'use client';

import React, { useState, useMemo, useCallback, memo, useId } from 'react';
import { useTranslations } from 'next-intl';
import { GitHubIssue } from '../app/dashboard/page';
import { useFilters } from '@/hooks/useFilters';
import { FilterPanel } from './FilterPanel';
import { FilterBar } from './FilterBar';
import { TASK_FILTER_FIELDS, FilterConfig, FilterTemplate } from '@/lib/types/filters';
import ProgressBar from './ProgressBar';

interface EnhancedTaskBoardProps {
  issues: GitHubIssue[];
  showFilterPanel?: boolean;
}

/**
 * 增强版 TaskBoard - 带高级过滤器
 */
export const EnhancedTaskBoard: React.FC<EnhancedTaskBoardProps> = ({ 
  issues,
  showFilterPanel = false,
}) => {
  const t = useTranslations('task');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // 使用过滤器 hook
  const {
    activeFilters,
    savedFilters,
    filteredData,
    addFilter,
    removeFilter,
    clearFilters,
    createFromTemplate,
    applySavedFilter,
    saveFilter,
    deleteSavedFilter,
    filterCount,
    dataCount,
    filteredCount,
  } = useFilters(issues, TASK_FILTER_FIELDS, 'taskFilters');

  // 简单过滤（兼容旧版）
  const [simpleFilter, setSimpleFilter] = useState<'all' | 'open' | 'closed'>('open');
  const filterId = useId();

  // 最终显示的数据（结合简单过滤和高级过滤）
  const displayIssues = useMemo(() => {
    let result = filteredData;
    
    // 应用简单过滤
    if (simpleFilter !== 'all') {
      result = result.filter(issue => issue.state === simpleFilter);
    }
    
    return result;
  }, [filteredData, simpleFilter]);

  // 统计
  const stats = useMemo(() => ({
    open: issues.filter(i => i.state === 'open').length,
    closed: issues.filter(i => i.state === 'closed').length,
    total: issues.length,
  }), [issues]);

  const progress = stats.total > 0
    ? Math.round((stats.closed / stats.total) * 100)
    : 0;

  // 处理过滤器保存
  const handleFilterSave = useCallback((filter: FilterConfig) => {
    addFilter(filter);
    saveFilter(filter);
    setIsFilterPanelOpen(false);
  }, [addFilter, saveFilter]);

  // 处理模板选择
  const handleTemplateSelect = useCallback((template: FilterTemplate) => {
    createFromTemplate(template);
  }, [createFromTemplate]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      {/* 头部 */}
      <header className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 transition-colors">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* 标题行 */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span aria-hidden="true">📋</span> {t('title')}
            </h2>
            
            {/* 过滤器按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
                           rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                           ${isFilterPanelOpen || filterCount > 0
                             ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                             : 'text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                           }`}
                aria-expanded={isFilterPanelOpen}
                aria-label="高级过滤器"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">过滤器</span>
                {filterCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                    {filterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 过滤器栏 */}
          {(isFilterPanelOpen || filterCount > 0) && (
            <FilterBar
              data={issues}
              fields={TASK_FILTER_FIELDS}
              filteredData={filteredData}
              activeFilters={activeFilters}
              savedFilters={savedFilters}
              onAddFilter={addFilter}
              onRemoveFilter={removeFilter}
              onClearFilters={clearFilters}
              onCreateFromTemplate={handleTemplateSelect}
              onApplySavedFilter={applySavedFilter}
              showStats
            />
          )}

          {/* 过滤器面板 */}
          {isFilterPanelOpen && showFilterPanel && (
            <div className="mt-2">
              <FilterPanel
                type="task"
                onSave={handleFilterSave}
                onCancel={() => setIsFilterPanelOpen(false)}
              />
            </div>
          )}

          {/* 简单过滤 + 进度 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* 状态选择 */}
            <div className="flex items-center gap-2">
              <label htmlFor={filterId} className="sr-only">{t('filterStatus')}</label>
              <select
                id={filterId}
                value={simpleFilter}
                onChange={(e) => setSimpleFilter(e.target.value as 'all' | 'open' | 'closed')}
                className="flex-1 sm:flex-none text-sm border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200 px-2 sm:px-3 py-2"
              >
                <option value="open">{t('status.open')}</option>
                <option value="closed">{t('status.closed')}</option>
                <option value="all">{t('all', { defaultValue: '全部' })}</option>
              </select>
            </div>

            {/* 进度条 */}
            <div className="flex-1 max-w-md" role="group" aria-label={t('taskProgress')}>
              <ProgressBar 
                value={progress} 
                size="sm" 
                color="green"
                showPercentage
                animated
              />
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span>🟢 {stats.open} {t('status.open')}</span>
                <span>✅ {stats.closed} {t('status.closed')}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 任务列表 */}
      <div 
        className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] sm:max-h-[600px] overflow-y-auto"
        role="list"
        aria-label={t('taskList')}
      >
        {displayIssues.length === 0 ? (
          <div className="px-4 sm:px-6 py-10 sm:py-12 text-center text-gray-500 dark:text-gray-400" role="status">
            <p className="text-base sm:text-lg mb-2" aria-hidden="true">📭</p>
            <p>{t('noTasks')}</p>
            {(filterCount > 0 || simpleFilter !== 'all') && (
              <button
                onClick={() => {
                  clearFilters();
                  setSimpleFilter('all');
                }}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                清除所有过滤条件
              </button>
            )}
          </div>
        ) : (
          displayIssues.map(issue => (
            <TaskCard key={issue.number} issue={issue} t={t} />
          ))
        )}
      </div>

      {/* 底部统计 */}
      {displayIssues.length > 0 && (
        <footer className="px-4 sm:px-6 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400 transition-colors">
          {t('showing')} {displayIssues.length} / {issues.length} {t('tasks')}
          {filterCount > 0 && ` (${filterCount} 个过滤器激活)`}
        </footer>
      )}
    </div>
  );
};

// ============================================================================
// 任务卡片组件
// ============================================================================

interface TaskCardProps {
  issue: GitHubIssue;
  t: ReturnType<typeof useTranslations<'task'>>;
}

const TaskCard = memo(function TaskCard({ issue, t }: TaskCardProps) {
  const stateColors = {
    open: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    closed: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
  } as const;
  
  const stateLabels = {
    open: t('status.open'),
    closed: t('status.closed')
  } as const;
  
  const stateIcons = {
    open: '🟢',
    closed: '✅'
  } as const;

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=unknown';
  }, []);

  return (
    <article 
      className="px-3 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
      role="listitem"
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* 状态 */}
        <div className="mt-1 flex-shrink-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${stateColors[issue.state]}`}
          >
            <span aria-hidden="true">{stateIcons[issue.state]}</span>
            {stateLabels[issue.state]}
          </span>
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              #{issue.number}
            </a>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {issue.title}
            </h3>
          </div>

          {/* 标签 */}
          {issue.labels.length > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {issue.labels.slice(0, 5).map((label, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`
                  }}
                >
                  {label.name}
                </span>
              ))}
              {issue.labels.length > 5 && (
                <span className="text-xs text-gray-500">+{issue.labels.length - 5}</span>
              )}
            </div>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {issue.assignee && (
              <div className="flex items-center gap-1">
                <img
                  src={issue.assignee.avatar_url}
                  alt=""
                  className="w-4 h-4 rounded-full"
                  onError={handleImageError}
                />
                <span>{issue.assignee.login}</span>
              </div>
            )}
            <span aria-hidden="true">·</span>
            <time dateTime={issue.updated_at}>
              更新于 {formatTimeAgo(issue.updated_at)}
            </time>
          </div>
        </div>

        {/* 链接 */}
        <a
          href={issue.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          查看 →
        </a>
      </div>
    </article>
  );
});

// ============================================================================
// 工具函数
// ============================================================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString();
}

export default EnhancedTaskBoard;