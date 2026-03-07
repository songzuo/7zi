/**
 * AI 团队实时展示系统 - 前端组件
 * 
 * 技术栈: React 18 + TypeScript + Zustand + Tailwind CSS
 */

import React, { useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useDashboardStore } from '../store/dashboardStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { TaskBoard } from './TaskBoard';
import { MemberList } from './MemberList';
import { MemberCard } from './MemberCard';
import { ContributionChart } from './ContributionChart';
import { StatusBadge } from './StatusBadge';
import { LoadingSpinner } from './LoadingSpinner';

// ============================================================================
// 主仪表板组件
// ============================================================================

export const Dashboard: React.FC = () => {
  const { 
    isLoading, 
    error, 
    refreshData,
    lastUpdated 
  } = useDashboardStore(useShallow(state => ({
    isLoading: state.isLoading,
    error: state.error,
    refreshData: state.refreshData,
    lastUpdated: state.lastUpdated
  })));

  // 初始化 WebSocket 连接
  useWebSocket();

  // 初始加载
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => refreshData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🤖 AI 团队实时展示
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                最后更新：{lastUpdated?.toLocaleTimeString() || '-'}
              </p>
            </div>
            <button
              onClick={() => refreshData()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 刷新
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：任务看板 (占 2 列) */}
          <div className="lg:col-span-2">
            <TaskBoard />
          </div>

          {/* 右侧：成员状态 (占 1 列) */}
          <div className="lg:col-span-1">
            <MemberList />
          </div>
        </div>

        {/* 底部：贡献统计 */}
        <div className="mt-6">
          <ContributionChart />
        </div>
      </main>
    </div>
  );
};

// ============================================================================
// 任务看板组件
// ============================================================================

export const TaskBoard: React.FC = () => {
  const { issues, filter, setFilter } = useDashboardStore(useShallow(state => ({
    issues: state.issues,
    filter: state.filter,
    setFilter: state.setFilter
  })));

  const filteredIssues = issues.filter(issue => {
    if (filter.state !== 'all' && issue.state !== filter.state) return false;
    if (filter.assignee && issue.assignee?.id !== filter.assignee) return false;
    if (filter.labels?.length && !issue.labels.some(l => filter.labels?.includes(l.name))) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* 看板头部 */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            📋 团队任务
          </h2>
          <div className="flex items-center gap-2">
            {/* 状态筛选 */}
            <select
              value={filter.state}
              onChange={(e) => setFilter({ state: e.target.value as any })}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="open">进行中</option>
              <option value="closed">已完成</option>
              <option value="all">全部</option>
            </select>

            {/* 成员筛选 */}
            <select
              value={filter.assignee || ''}
              onChange={(e) => setFilter({ assignee: e.target.value || undefined })}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">所有成员</option>
              {/* 动态填充成员列表 */}
            </select>
          </div>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="divide-y">
        {filteredIssues.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            暂无任务
          </div>
        ) : (
          filteredIssues.map(issue => (
            <TaskCard key={issue.id} issue={issue} />
          ))
        )}
      </div>

      {/* 加载更多 */}
      {filteredIssues.length >= 20 && (
        <div className="px-6 py-4 border-t bg-gray-50 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700">
            加载更多...
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 任务卡片组件
// ============================================================================

interface TaskCardProps {
  issue: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    labels: Array<{ name: string; color: string }>;
    assignee?: { id: string; name: string; avatar: string } | null;
    updated_at: string;
  };
}

export const TaskCard: React.FC<TaskCardProps> = ({ issue }) => {
  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
      <div className="flex items-start gap-3">
        {/* 状态图标 */}
        <div className="mt-1">
          {issue.state === 'open' ? (
            <div className="w-2 h-2 rounded-full bg-green-500" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-400" />
          )}
        </div>

        {/* 内容区 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
              #{issue.number}
            </span>
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {issue.title}
            </h3>
          </div>

          {/* 标签 */}
          {issue.labels.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              {issue.labels.slice(0, 5).map(label => (
                <span
                  key={label.name}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {issue.assignee && (
              <div className="flex items-center gap-1">
                <img
                  src={issue.assignee.avatar}
                  alt={issue.assignee.name}
                  className="w-4 h-4 rounded-full"
                />
                <span>{issue.assignee.name}</span>
              </div>
            )}
            <span>
              更新于 {new Date(issue.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* 操作按钮 (悬停显示) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={`https://github.com/owner/repo/issues/${issue.number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            查看 →
          </a>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 成员列表组件
// ============================================================================

export const MemberList: React.FC = () => {
  const { members } = useDashboardStore(useShallow(state => ({
    members: state.members
  })));

  const workingMembers = members.filter(m => m.status === 'working');
  const idleMembers = members.filter(m => m.status === 'idle');
  const offlineMembers = members.filter(m => m.status === 'offline');

  return (
    <div className="space-y-6">
      {/* 工作中 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-green-50">
          <h3 className="text-sm font-semibold text-green-800">
            🔥 工作中 ({workingMembers.length})
          </h3>
        </div>
        <div className="divide-y">
          {workingMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
        </div>
      </div>

      {/* 空闲中 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            😊 空闲中 ({idleMembers.length})
          </h3>
        </div>
        <div className="divide-y">
          {idleMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
        </div>
      </div>

      {/* 离线 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-500">
            ⚫ 离线 ({offlineMembers.length})
          </h3>
        </div>
        <div className="divide-y">
          {offlineMembers.map(member => (
            <MemberCard key={member.id} member={member} compact />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 成员卡片组件
// ============================================================================

interface MemberCardProps {
  member: {
    id: string;
    name: string;
    role: string;
    avatar: string;
    status: 'idle' | 'working' | 'busy' | 'offline';
    statusMessage?: string;
    currentTask?: { number: number; title: string } | null;
    skills: string[];
  };
  compact?: boolean;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, compact = false }) => {
  const statusColors = {
    working: 'bg-green-500',
    busy: 'bg-yellow-500',
    idle: 'bg-gray-400',
    offline: 'bg-gray-300'
  };

  if (compact) {
    return (
      <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-10 h-10 rounded-full"
            />
            <div
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColors[member.status]}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {member.name}
              </span>
              <StatusBadge status={member.status} />
            </div>
            {member.statusMessage && (
              <p className="text-xs text-gray-500 truncate">
                {member.statusMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="relative">
          <img
            src={member.avatar}
            alt={member.name}
            className="w-12 h-12 rounded-full"
          />
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColors[member.status]}`}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold text-gray-900">
              {member.name}
            </h4>
            <StatusBadge status={member.status} />
          </div>
          <p className="text-sm text-gray-500 mb-2">{member.role}</p>
          {member.currentTask && (
            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded mb-2">
              📌 #{member.currentTask.number}: {member.currentTask.title}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {member.skills.slice(0, 3).map(skill => (
              <span
                key={skill}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 状态徽章组件
// ============================================================================

interface StatusBadgeProps {
  status: 'idle' | 'working' | 'busy' | 'offline';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    working: { color: 'bg-green-100 text-green-700', label: '工作中' },
    busy: { color: 'bg-yellow-100 text-yellow-700', label: '忙碌' },
    idle: { color: 'bg-gray-100 text-gray-600', label: '空闲' },
    offline: { color: 'bg-gray-100 text-gray-400', label: '离线' }
  };

  const { color, label } = config[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};

// ============================================================================
// 贡献图表组件
// ============================================================================

export const ContributionChart: React.FC = () => {
  const { contributions } = useDashboardStore(useShallow(state => ({
    contributions: state.contributions
  })));

  // 模拟数据 - 实际应从 API 获取
  const weekData = [
    { day: '周一', issues: 5, comments: 12 },
    { day: '周二', issues: 8, comments: 15 },
    { day: '周三', issues: 3, comments: 8 },
    { day: '周四', issues: 10, comments: 20 },
    { day: '周五', issues: 7, comments: 18 },
    { day: '周六', issues: 2, comments: 5 },
    { day: '周日', issues: 1, comments: 3 }
  ];

  const maxValue = Math.max(...weekData.map(d => Math.max(d.issues, d.comments)));

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          📊 本周贡献统计
        </h2>
      </div>
      <div className="p-6">
        <div className="flex items-end gap-2 h-48">
          {weekData.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 items-end justify-center h-40">
                <div
                  className="w-3 bg-blue-500 rounded-t transition-all"
                  style={{ height: `${(day.issues / maxValue) * 100}%` }}
                  title={`${day.issues} 个任务`}
                />
                <div
                  className="w-3 bg-green-500 rounded-t transition-all"
                  style={{ height: `${(day.comments / maxValue) * 100}%` }}
                  title={`${day.comments} 条评论`}
                />
              </div>
              <span className="text-xs text-gray-500">{day.day}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-xs text-gray-600">新建任务</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-xs text-gray-600">评论</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 加载动画组件
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-200 border-t-blue-600`} />
  );
};
