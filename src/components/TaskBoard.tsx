'use client';

import React, { useState } from 'react';

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string; avatar_url: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface TaskBoardProps {
  issues: GitHubIssue[];
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ issues }) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');

  const filteredIssues = issues.filter(issue => {
    if (filter === 'all') return true;
    return issue.state === filter;
  });

  const openIssues = issues.filter(i => i.state === 'open');
  const closedIssues = issues.filter(i => i.state === 'closed');

  // 计算进度
  const progress = issues.length > 0 
    ? Math.round((closedIssues.length / issues.length) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* 看板头部 */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>📋</span> GitHub 任务
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            >
              <option value="open">进行中</option>
              <option value="closed">已完成</option>
              <option value="all">全部</option>
            </select>
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">任务进度</span>
            <span className="font-medium text-gray-900">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>🟢 {openIssues.length} 进行中</span>
            <span>✅ {closedIssues.length} 已完成</span>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="divide-y max-h-[600px] overflow-y-auto">
        {filteredIssues.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="text-lg mb-2">📭</p>
            <p>暂无任务</p>
            <p className="text-sm mt-1">
              {filter === 'open' ? '所有任务都已完成！' : '还没有 GitHub Issues'}
            </p>
          </div>
        ) : (
          filteredIssues.map(issue => (
            <TaskCard key={issue.number} issue={issue} />
          ))
        )}
      </div>

      {/* 底部统计 */}
      {filteredIssues.length > 0 && (
        <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-500">
          显示 {filteredIssues.length} / {issues.length} 个任务
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 任务卡片组件
// ============================================================================

interface TaskCardProps {
  issue: GitHubIssue;
}

export const TaskCard: React.FC<TaskCardProps> = ({ issue }) => {
  const stateColors = {
    open: 'text-green-600 bg-green-50 border-green-200',
    closed: 'text-gray-500 bg-gray-50 border-gray-200'
  };

  const stateLabels = {
    open: '🟢 进行中',
    closed: '✅ 已完成'
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors group">
      <div className="flex items-start gap-3">
        {/* 状态图标 */}
        <div className="mt-1 flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${stateColors[issue.state]}`}>
            {stateLabels[issue.state]}
          </span>
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              #{issue.number}
            </a>
            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
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
                <span className="text-xs text-gray-400">+{issue.labels.length - 5}</span>
              )}
            </div>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {issue.assignee && (
              <div className="flex items-center gap-1">
                <img
                  src={issue.assignee.avatar_url}
                  alt={issue.assignee.login}
                  className="w-4 h-4 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=unknown';
                  }}
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
            className="text-sm text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            查看 →
          </a>
        </div>
      </div>
    </div>
  );
};

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
