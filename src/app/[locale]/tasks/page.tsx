'use client';

/**
 * 任务看板页面
 * 显示 GitHub Issues 作为任务看板，支持列表和看板两种视图模式
 */

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { TaskBoardSearch } from '@/components/TaskBoardSearch';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card } from '@/components/shared';
import type { GitHubIssue } from '@/types';

type ViewMode = 'list' | 'kanban';

export default function TasksPage() {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    async function fetchIssues() {
      try {
        const res = await fetch('/api/github/issues');
        if (res.ok) {
          const data = await res.json();
          setIssues(data.issues || []);
        }
      } catch (e) {
        console.error('Failed to fetch issues:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchIssues();
  }, []);

  // 统计信息
  const stats = {
    total: issues.length,
    open: issues.filter(i => i.state === 'open').length,
    closed: issues.filter(i => i.state === 'closed').length,
    progress: issues.length > 0
      ? Math.round((issues.filter(i => i.state === 'closed').length / issues.length) * 100)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 页面头部 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            📋 任务看板
          </h1>
          <div className="flex items-center gap-2">
            {/* 视图切换按钮 */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="列表视图"
              >
                📄 列表
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="看板视图"
              >
                📊 看板
              </button>
            </div>
          </div>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">
          管理和追踪 GitHub Issues，支持搜索、过滤和排序
        </p>
      </div>

      {/* 统计卡片 */}
      {issues.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card hover className="!p-4">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">全部任务</div>
          </Card>
          <Card hover className="!p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.open}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">进行中</div>
          </Card>
          <Card hover className="!p-4">
            <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
              {stats.closed}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">已完成</div>
          </Card>
          <Card hover className="!p-4">
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.progress}%
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">完成率</div>
          </Card>
        </div>
      )}

      {/* 任务看板 */}
      {viewMode === 'list' ? (
        <TaskBoardSearch
          issues={issues}
          defaultStatus="all"
          showStats={false}
        />
      ) : (
        <KanbanView issues={issues} />
      )}
    </div>
  );
}

// ============================================================================
// 看板视图组件
// ============================================================================

interface KanbanViewProps {
  issues: GitHubIssue[];
}

function KanbanView({ issues }: KanbanViewProps) {
  const columns = [
    { id: 'open', title: '🟢 进行中', color: 'border-green-500' },
    { id: 'closed', title: '✅ 已完成', color: 'border-zinc-500' },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {columns.map(column => {
        const columnIssues = issues.filter(issue => issue.state === column.id);

        return (
          <div
            key={column.id}
            className={`bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border-t-4 ${column.color}`}
          >
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                {column.title}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {columnIssues.length} 个任务
              </p>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {columnIssues.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-sm">暂无任务</p>
                </div>
              ) : (
                columnIssues.map(issue => (
                  <KanbanCard key={issue.number} issue={issue} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 看板卡片组件
// ============================================================================

interface KanbanCardProps {
  issue: GitHubIssue;
}

function KanbanCard({ issue }: KanbanCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <a
        href={issue.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            #{issue.number}
          </span>
        </div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
          {issue.title}
        </h4>
        {issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {issue.labels.slice(0, 3).map((label, idx) => (
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
            {issue.labels.length > 3 && (
              <span className="text-xs text-zinc-400">
                +{issue.labels.length - 3}
              </span>
            )}
          </div>
        )}
        {issue.assignee && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="w-5 h-5 rounded-full overflow-hidden">
              <img
                src={issue.assignee.avatar_url}
                alt={issue.assignee.login}
                className="w-full h-full object-cover"
              />
            </div>
            <span>{issue.assignee.login}</span>
          </div>
        )}
      </a>
    </div>
  );
}
