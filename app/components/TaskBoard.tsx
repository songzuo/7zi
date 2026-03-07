'use client';

import React, { useState, useRef, useId, useMemo, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import { GitHubIssue } from '../app/dashboard/page';
import ProgressBar from './ProgressBar';

interface TaskBoardProps {
  issues: GitHubIssue[];
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ issues }) => {
  const t = useTranslations('task');
  
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');
  const filterRef = useRef<HTMLSelectElement>(null);
  const filterId = useId();

  // 使用 useMemo 缓存过滤后的 issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (filter === 'all') return true;
      return issue.state === filter;
    });
  }, [issues, filter]);

  // 缓存统计计算
  const stats = useMemo(() => ({
    open: issues.filter(i => i.state === 'open').length,
    closed: issues.filter(i => i.state === 'closed').length,
    total: issues.length,
  }), [issues]);

  // 计算进度
  const progress = stats.total > 0
    ? Math.round((stats.closed / stats.total) * 100)
    : 0;

  // 使用 useCallback 缓存事件处理
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as 'all' | 'open' | 'closed');
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      {/* 看板头部 */}
      <header className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span aria-hidden="true">📋</span> {t('title')}
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor={filterId} className="sr-only">{t('filterStatus')}</label>
            <select
              ref={filterRef}
              id={filterId}
              value={filter}
              onChange={handleFilterChange}
              className="flex-1 sm:flex-none text-sm border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-200 px-2 sm:px-3 py-2"
              aria-describedby="filter-description"
            >
              <option value="open">{t('status.open')}</option>
              <option value="closed">{t('status.closed')}</option>
              <option value="all">{t('all', { defaultValue: '全部' })}</option>
            </select>
            <span id="filter-description" className="sr-only">
              {t('currentFilter')}：{filter === 'all' ? t('all', { defaultValue: '全部' }) : filter === 'open' ? t('status.open') : t('status.closed')}
            </span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-2" role="group" aria-label={t('taskProgress')}>
          <ProgressBar 
            value={progress} 
            size="sm" 
            color="green"
            showPercentage
            animated
          />
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span aria-label={`${stats.open} ${t('status.open')}`}>
              <span aria-hidden="true">🟢</span> {stats.open} {t('status.open')}
            </span>
            <span aria-label={`${stats.closed} ${t('status.closed')}`}>
              <span aria-hidden="true">✅</span> {stats.closed} {t('status.closed')}
            </span>
          </div>
        </div>
      </header>

      {/* 任务列表 */}
      <div 
        className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] sm:max-h-[600px] overflow-y-auto"
        role="list"
        aria-label={t('taskList')}
      >
        {filteredIssues.length === 0 ? (
          <div className="px-4 sm:px-6 py-10 sm:py-12 text-center text-gray-500 dark:text-gray-400" role="status">
            <p className="text-base sm:text-lg mb-2" aria-hidden="true">📭</p>
            <p>{t('noTasks')}</p>
            <p className="text-xs sm:text-sm mt-1">
              {filter === 'open' ? t('allCompleted') : t('noGitHubIssues')}
            </p>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <TaskCard key={issue.number} issue={issue} t={t} />
          ))
        )}
      </div>

      {/* 底部统计 */}
      {filteredIssues.length > 0 && (
        <footer className="px-4 sm:px-6 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400 transition-colors">
          {t('showing')} {filteredIssues.length} / {issues.length} {t('tasks')}
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

/**
 * 任务卡片组件 - 性能优化版本 + i18n
 */
export const TaskCard = memo(function TaskCard({ issue, t }: TaskCardProps) {
  // 状态配置
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

  // 使用 useCallback 缓存事件处理
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=unknown';
  }, []);

  return (
    <article 
      className="px-3 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group focus-within:bg-gray-50 dark:focus-within:bg-gray-700/50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 active:bg-gray-100 dark:active:bg-gray-700"
      role="listitem"
      aria-labelledby={`issue-${issue.number}-title`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* 状态图标 */}
        <TaskCardStatusIcon
          state={issue.state}
          colors={stateColors}
          labels={stateLabels}
          icons={stateIcons}
        />

        {/* 内容区 */}
        <TaskCardContent issue={issue} t={t} />

        {/* 外部链接 */}
        <TaskCardLink url={issue.html_url} number={issue.number} t={t} />
      </div>
    </article>
  );
}, (prevProps: TaskCardProps, nextProps: TaskCardProps) => {
  // 自定义比较：只在 issue 相关属性变化时重新渲染
  return (
    prevProps.issue.number === nextProps.issue.number &&
    prevProps.issue.title === nextProps.issue.title &&
    prevProps.issue.state === nextProps.issue.state &&
    prevProps.issue.updated_at === nextProps.issue.updated_at &&
    JSON.stringify(prevProps.issue.labels) === JSON.stringify(nextProps.issue.labels)
  );
});

// ============================================================================
// TaskCard 子组件
// ============================================================================

interface TaskCardStatusIconProps {
  state: 'open' | 'closed';
  colors: Record<string, string>;
  labels: Record<string, string>;
  icons: Record<string, string>;
}

const TaskCardStatusIcon = memo(function TaskCardStatusIcon({
  state,
  colors,
  labels,
  icons,
}: TaskCardStatusIconProps) {
  return (
    <div className="mt-1 flex-shrink-0">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[state]}`}
        aria-label={`${labels[state]}`}
      >
        <span aria-hidden="true">{icons[state]}</span>
        {labels[state]}
      </span>
    </div>
  );
});

interface TaskCardContentProps {
  issue: GitHubIssue;
  t: ReturnType<typeof useTranslations<'task'>>;
}

const TaskCardContent = memo(function TaskCardContent({ issue, t }: TaskCardContentProps) {
  // 使用 useCallback 缓存图片错误处理
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=unknown';
  }, []);

  return (
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
        <a
          href={issue.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded"
          aria-label={`issue #${issue.number}`}
        >
          #{issue.number}
        </a>
        <h3 
          id={`issue-${issue.number}-title`}
          className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
        >
          {issue.title}
        </h3>
      </div>

      {/* 标签 */}
      {issue.labels.length > 0 && (
        <TaskCardLabels labels={issue.labels} t={t} />
      )}

      {/* 元信息 */}
      <TaskCardMeta issue={issue} onImageError={handleImageError} t={t} />
    </div>
  );
});

interface TaskCardLabelsProps {
  labels: Array<{ name: string; color: string }>;
  t: ReturnType<typeof useTranslations<'task'>>;
}

const TaskCardLabels = memo(function TaskCardLabels({ labels, t }: TaskCardLabelsProps) {
  const displayLabels = labels.slice(0, 5);
  const remainingCount = labels.length - 5;

  return (
    <div className="flex items-center gap-1 mb-2 flex-wrap" role="group" aria-label={t('labels')}>
      {displayLabels.map((label, idx) => (
        <span
          key={idx}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: `#${label.color}20`,
            color: `#${label.color}`
          }}
          aria-label={`${t('labels')}：${label.name}`}
        >
          {label.name}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400" aria-label={`${t('more')} ${remainingCount} ${t('labels')}`}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
});

interface TaskCardMetaProps {
  issue: GitHubIssue;
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  t: ReturnType<typeof useTranslations<'task'>>;
}

const TaskCardMeta = memo(function TaskCardMeta({ issue, onImageError, t }: TaskCardMetaProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400" role="group" aria-label={t('title')}>
      {issue.assignee && (
        <div className="flex items-center gap-1" aria-label={`${t('assignee')}：${issue.assignee.login}`}>
          <img
            src={issue.assignee.avatar_url}
            alt=""
            className="w-4 h-4 rounded-full"
            onError={onImageError}
          />
          <span>{issue.assignee.login}</span>
        </div>
      )}
      <span aria-hidden="true">·</span>
      <time 
        dateTime={issue.updated_at}
        title={new Date(issue.updated_at).toLocaleString()}
      >
        {t('updatedAt')} {formatTimeAgo(issue.updated_at)}
      </time>
    </div>
  );
});

interface TaskCardLinkProps {
  url: string;
  number: number;
  t: ReturnType<typeof useTranslations<'task'>>;
}

const TaskCardLink = memo(function TaskCardLink({ url, number, t }: TaskCardLinkProps) {
  return (
    <div className="flex-shrink-0">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded"
        aria-label={`${t('view')} #${number}`}
      >
        {t('view')} →
      </a>
    </div>
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