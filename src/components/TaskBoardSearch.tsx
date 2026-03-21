'use client';

/**
 * @fileoverview 任务板搜索与过滤组件
 * @description 为 GitHub Issues 任务板提供搜索、过滤、排序功能
 */

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { GitHubIssue } from '@/types';
import { SearchFilter } from '@/components/SearchFilter';
import { ISSUE_FILTER_CONFIGS, ISSUE_SORT_CONFIGS } from '@/types/search-filter';
import {
  extractLabelOptions,
  extractAssigneeOptions,
  highlightSearchTerm,
} from '@/lib/search-filter';
import { formatTimeAgo } from '@/lib/date';
import { ProgressBar, Card, EmptyState } from '@/components/shared';

interface TaskBoardSearchProps {
  issues: GitHubIssue[];
  /** 默认过滤状态 */
  defaultStatus?: 'all' | 'open' | 'closed';
  /** 是否显示统计信息 */
  showStats?: boolean;
}

export const TaskBoardSearch: React.FC<TaskBoardSearchProps> = ({
  issues,
  defaultStatus = 'open',
  showStats = true,
}) => {
  const [filteredIssues, setFilteredIssues] = useState<GitHubIssue[]>(() => {
    if (defaultStatus === 'all') return issues;
    return issues.filter(issue => issue.state === defaultStatus);
  });
  const [searchResults, setSearchResults] = useState<{
    total: number;
    filtered: number;
  }>({ total: issues.length, filtered: issues.length });

  // 提取动态过滤器选项
  const labelOptions = useMemo(() => extractLabelOptions(issues), [issues]);
  const assigneeOptions = useMemo(() => extractAssigneeOptions(issues), [issues]);

  // 更新过滤器配置
  const filterConfigs = useMemo(() => {
    return ISSUE_FILTER_CONFIGS.map(config => {
      if (config.id === 'labels') {
        return { ...config, options: labelOptions };
      }
      if (config.id === 'assignees') {
        return { ...config, options: assigneeOptions };
      }
      return config;
    });
  }, [labelOptions, assigneeOptions]);

  // 处理搜索过滤结果变化
  const handleResultsChange = (result: { items: GitHubIssue[]; totalResults: number; filteredResults: number }) => {
    setFilteredIssues(result.items);
    setSearchResults({
      total: result.totalResults,
      filtered: result.filteredResults,
    });
  };

  // 计算进度
  const progress = issues.length > 0
    ? Math.round((issues.filter(i => i.state === 'closed').length / issues.length) * 100)
    : 0;

  const openIssues = issues.filter(i => i.state === 'open');
  const closedIssues = issues.filter(i => i.state === 'closed');

  return (
    <Card padding="none" className="flex flex-col h-full">
      {/* 看板头部 */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>📋</span> GitHub 任务
            {searchResults.filtered !== searchResults.total && (
              <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                ({searchResults.filtered}/{searchResults.total})
              </span>
            )}
          </h2>
        </div>

        {/* 进度条 */}
        {showStats && (
          <div className="space-y-2">
            <ProgressBar progress={progress} showLabel />
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>🟢 {openIssues.length} 进行中</span>
              <span>✅ {closedIssues.length} 已完成</span>
            </div>
          </div>
        )}
      </div>

      {/* 搜索与过滤区域 */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <SearchFilter
          items={issues}
          filters={filterConfigs}
          sorts={ISSUE_SORT_CONFIGS}
          onResultsChange={handleResultsChange}
          searchPlaceholder="搜索任务标题、标签..."
          showFilterCount={true}
          collapsible={true}
          defaultExpanded={false}
        />
      </div>

      {/* 任务列表 */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-700 flex-1 overflow-y-auto max-h-[600px]">
        {filteredIssues.length === 0 ? (
          <EmptyState
            icon="📭"
            title="暂无匹配任务"
            description="尝试调整搜索关键词或过滤器条件"
          />
        ) : (
          filteredIssues.map(issue => (
            <TaskCard key={issue.number} issue={issue} />
          ))
        )}
      </div>

      {/* 底部统计 */}
      {filteredIssues.length > 0 && (
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500 dark:text-zinc-400">
          显示 {filteredIssues.length} / {issues.length} 个任务
        </div>
      )}
    </Card>
  );
};

// ============================================================================
// 任务卡片组件 - 支持搜索高亮
// ============================================================================

interface TaskCardProps {
  issue: GitHubIssue;
  /** 搜索关键词（用于高亮） */
  searchQuery?: string;
}

const TaskCardBase: React.FC<TaskCardProps> = ({ issue, searchQuery }) => {
  const stateConfig = {
    open: { color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', label: '🟢 进行中' },
    closed: { color: 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-700', label: '✅ 已完成' },
  };

  const config = stateConfig[issue.state];

  // 高亮标题中的搜索关键词
  const highlightedTitle = searchQuery
    ? highlightSearchTerm(issue.title, searchQuery)
    : issue.title;

  return (
    <div className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-200 group border-l-2 border-transparent hover:border-cyan-500 hover:translate-x-1">
      <div className="flex items-start gap-3">
        {/* 状态图标 */}
        <div className="mt-1 flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.color} transition-transform group-hover:scale-105`}>
            {config.label}
          </span>
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 hover:underline transition-colors"
            >
              #{issue.number}
            </a>
            {/* 使用 dangerouslySetInnerHTML 渲染高亮标题 */}
            <h3
              className="text-sm font-medium text-zinc-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors"
              dangerouslySetInnerHTML={{ __html: highlightedTitle }}
            />
          </div>

          {/* 标签 */}
          {issue.labels && issue.labels.length > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {issue.labels.slice(0, 5).map((label, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {issue.labels.length > 5 && (
                <span className="text-xs text-zinc-400">+{issue.labels.length - 5}</span>
              )}
            </div>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            {issue.assignee && (
              <div className="flex items-center gap-1">
                <Image
                  src={issue.assignee.avatar_url}
                  alt={issue.assignee.login}
                  width={16}
                  height={16}
                  className="rounded-full"
                  unoptimized
                />
                <span>{issue.assignee.login}</span>
              </div>
            )}
            <span>·</span>
            <span title={new Date(issue.updated_at).toLocaleString()}>
              更新于 {formatTimeAgo(issue.updated_at)}
            </span>
          </div>
        </div>

        {/* 外部链接 */}
        <div className="flex-shrink-0">
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            查看 →
          </a>
        </div>
      </div>
    </div>
  );
};

// 使用 React.memo 优化 TaskCard
const TaskCard = React.memo(TaskCardBase, (prevProps, nextProps) => {
  return (
    prevProps.issue.number === nextProps.issue.number &&
    prevProps.issue.state === nextProps.issue.state &&
    prevProps.issue.title === nextProps.issue.title &&
    prevProps.issue.updated_at === nextProps.issue.updated_at &&
    prevProps.searchQuery === nextProps.searchQuery
  );
});
