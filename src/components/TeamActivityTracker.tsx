'use client';

/**
 * 团队活动追踪组件
 * 
 * 功能:
 * - 实时活动流
 * - 成员活动统计
 * - 活动过滤器
 * - 时间线视图
 * - 活动导出
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// ============================================================================
// 类型定义
// ============================================================================

export type ActivityType = 
  | 'commit'
  | 'issue_created'
  | 'issue_closed'
  | 'pr_created'
  | 'pr_merged'
  | 'comment'
  | 'review'
  | 'deploy'
  | 'task_assigned'
  | 'status_change';

export interface TeamActivity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  actor: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  timestamp: string;
  metadata?: {
    branch?: string;
    filesChanged?: number;
    additions?: number;
    deletions?: number;
    taskId?: string;
    projectName?: string;
    url?: string;
  };
}

export interface ActivityFilter {
  types: ActivityType[];
  members: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
}

export interface MemberActivityStats {
  memberId: string;
  memberName: string;
  avatar?: string;
  totalActivities: number;
  commits: number;
  issuesCreated: number;
  issuesClosed: number;
  reviews: number;
  lastActive: string;
}

interface TeamActivityTrackerProps {
  locale?: string;
  maxItems?: number;
  showFilters?: boolean;
  showStats?: boolean;
  className?: string;
}

// ============================================================================
// 活动图标和颜色映射
// ============================================================================

const activityConfig: Record<ActivityType, { icon: string; label: string; color: string }> = {
  commit: { icon: '💻', label: '提交', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  issue_created: { icon: '🟢', label: '创建 Issue', color: 'bg-green-50 text-green-700 border-green-200' },
  issue_closed: { icon: '✅', label: '关闭 Issue', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pr_created: { icon: '🔀', label: '创建 PR', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  pr_merged: { icon: '🎉', label: '合并 PR', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  comment: { icon: '💬', label: '评论', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  review: { icon: '👀', label: '代码审查', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  deploy: { icon: '🚀', label: '部署', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  task_assigned: { icon: '📌', label: '任务分配', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  status_change: { icon: '🔄', label: '状态变更', color: 'bg-zinc-50 text-zinc-700 border-zinc-200' }
};

// ============================================================================
// 模拟数据生成器
// ============================================================================

const generateMockActivities = (count: number): TeamActivity[] => {
  const actors = [
    { id: 'executor', name: 'Executor', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=executor', role: '执行' },
    { id: 'tester', name: '测试员', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tester', role: '测试' },
    { id: 'architect', name: '架构师', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect', role: '架构' },
    { id: 'designer', name: '设计师', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=designer', role: '设计' },
    { id: 'consultant', name: '咨询师', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=consultant', role: '咨询' }
  ];

  const titles: Record<ActivityType, string[]> = {
    commit: ['修复登录问题', '优化性能', '添加新功能', '重构代码', '更新依赖'],
    issue_created: ['报告 Bug', '功能请求', '文档改进', '性能问题'],
    issue_closed: ['问题已解决', '功能已实现', '修复已部署'],
    pr_created: ['新功能实现', '代码优化', 'Bug 修复'],
    pr_merged: ['功能合并到主分支', '修复已合并'],
    comment: ['代码评审意见', '问题讨论', '建议反馈'],
    review: ['通过代码审查', '请求修改', '批准合并'],
    deploy: ['部署到生产环境', '部署到测试环境'],
    task_assigned: ['分配新任务', '重新分配任务'],
    status_change: ['状态更新为进行中', '状态更新为已完成']
  };

  const activities: TeamActivity[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const type = (Object.keys(activityConfig) as ActivityType[])[Math.floor(Math.random() * 10)];
    const actor = actors[Math.floor(Math.random() * actors.length)];
    const titleList = titles[type];
    const title = titleList[Math.floor(Math.random() * titleList.length)];

    activities.push({
      id: `activity-${i}-${Date.now()}`,
      type,
      title,
      description: type === 'commit' ? `修改了 ${Math.floor(Math.random() * 10) + 1} 个文件` : undefined,
      actor,
      timestamp: new Date(now - Math.random() * 86400000 * 7).toISOString(),
      metadata: {
        filesChanged: type === 'commit' ? Math.floor(Math.random() * 10) + 1 : undefined,
        additions: type === 'commit' ? Math.floor(Math.random() * 200) : undefined,
        deletions: type === 'commit' ? Math.floor(Math.random() * 100) : undefined,
        url: '#'
      }
    });
  }

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// ============================================================================
// 主组件
// ============================================================================

export const TeamActivityTracker: React.FC<TeamActivityTrackerProps> = memo(({
  locale = 'zh',
  maxItems = 50,
  showFilters = true,
  showStats = true,
  className = ''
}) => {
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>({
    types: [],
    members: [],
    dateRange: {}
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // 多语言
  const t = {
    title: locale === 'zh' ? '团队活动追踪' : 'Team Activity Tracker',
    filter: locale === 'zh' ? '过滤' : 'Filter',
    clearFilter: locale === 'zh' ? '清除过滤' : 'Clear Filter',
    allTypes: locale === 'zh' ? '所有类型' : 'All Types',
    allMembers: locale === 'zh' ? '所有成员' : 'All Members',
    stats: locale === 'zh' ? '统计' : 'Statistics',
    recentActivities: locale === 'zh' ? '最近活动' : 'Recent Activities',
    noActivities: locale === 'zh' ? '暂无活动' : 'No activities',
    loadMore: locale === 'zh' ? '加载更多' : 'Load More',
    export: locale === 'zh' ? '导出' : 'Export',
    viewAll: locale === 'zh' ? '查看全部' : 'View All'
  };

  // 加载数据
  useEffect(() => {
    // 使用微任务延迟 setState，避免同步调用导致的级联渲染
    Promise.resolve().then(() => {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setActivities(generateMockActivities(maxItems));
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    });
  }, [maxItems]);

  // 过滤活动
  const filteredActivities = useMemo(() => {
    let result = activities;

    if (filter.types.length > 0) {
      result = result.filter(a => filter.types.includes(a.type));
    }

    if (filter.members.length > 0) {
      result = result.filter(a => filter.members.includes(a.actor.id));
    }

    if (filter.dateRange.start) {
      const startDate = new Date(filter.dateRange.start);
      result = result.filter(a => new Date(a.timestamp) >= startDate);
    }

    if (filter.dateRange.end) {
      const endDate = new Date(filter.dateRange.end);
      result = result.filter(a => new Date(a.timestamp) <= endDate);
    }

    return result;
  }, [activities, filter]);

  // 计算统计数据
  const stats = useMemo((): MemberActivityStats[] => {
    const memberStats = new Map<string, MemberActivityStats>();

    activities.forEach(activity => {
      const existing = memberStats.get(activity.actor.id);
      if (existing) {
        existing.totalActivities++;
        if (activity.type === 'commit') existing.commits++;
        if (activity.type === 'issue_created') existing.issuesCreated++;
        if (activity.type === 'issue_closed') existing.issuesClosed++;
        if (activity.type === 'review') existing.reviews++;
        if (new Date(activity.timestamp) > new Date(existing.lastActive)) {
          existing.lastActive = activity.timestamp;
        }
      } else {
        memberStats.set(activity.actor.id, {
          memberId: activity.actor.id,
          memberName: activity.actor.name,
          avatar: activity.actor.avatar,
          totalActivities: 1,
          commits: activity.type === 'commit' ? 1 : 0,
          issuesCreated: activity.type === 'issue_created' ? 1 : 0,
          issuesClosed: activity.type === 'issue_closed' ? 1 : 0,
          reviews: activity.type === 'review' ? 1 : 0,
          lastActive: activity.timestamp
        });
      }
    });

    return Array.from(memberStats.values()).sort((a, b) => b.totalActivities - a.totalActivities);
  }, [activities]);

  // 清除过滤器
  const clearFilter = useCallback(() => {
    setFilter({ types: [], members: [], dateRange: {} });
  }, []);

  // 切换类型过滤
  const toggleTypeFilter = useCallback((type: ActivityType) => {
    setFilter(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  }, []);

  // 切换成员过滤
  const toggleMemberFilter = useCallback((memberId: string) => {
    setFilter(prev => ({
      ...prev,
      members: prev.members.includes(memberId)
        ? prev.members.filter(m => m !== memberId)
        : [...prev.members, memberId]
    }));
  }, []);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          📊 {t.title}
        </h2>
        <div className="flex items-center gap-2">
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showFilterPanel || filter.types.length > 0 || filter.members.length > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              🔍 {t.filter}
              {(filter.types.length > 0 || filter.members.length > 0) && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {filter.types.length + filter.members.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => {/* 导出功能 */}}
            className="px-3 py-1.5 text-sm rounded-lg border bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300"
          >
            📤 {t.export}
          </button>
        </div>
      </div>

      {/* 过滤面板 */}
      {showFilterPanel && showFilters && (
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-4">
          {/* 类型过滤 */}
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t.allTypes}</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(activityConfig) as ActivityType[]).map(type => (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-2 py-1 text-xs rounded border transition-all ${
                    filter.types.includes(type)
                      ? 'ring-2 ring-blue-500 ring-offset-1'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  } ${activityConfig[type].color}`}
                >
                  {activityConfig[type].icon} {activityConfig[type].label}
                </button>
              ))}
            </div>
          </div>

          {/* 成员过滤 */}
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t.allMembers}</p>
            <div className="flex flex-wrap gap-2">
              {stats.map(member => (
                <button
                  key={member.memberId}
                  onClick={() => toggleMemberFilter(member.memberId)}
                  className={`px-2 py-1 text-xs rounded border transition-all ${
                    filter.members.includes(member.memberId)
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-700 dark:border-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {member.memberName} ({member.totalActivities})
                </button>
              ))}
            </div>
          </div>

          {/* 清除过滤 */}
          {(filter.types.length > 0 || filter.members.length > 0) && (
            <button
              onClick={clearFilter}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ✕ {t.clearFilter}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 统计面板 */}
        {showStats && (
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                📈 {t.stats}
              </h3>
              <div className="space-y-3">
                {stats.slice(0, 5).map((member, index) => (
                  <div key={member.memberId} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-zinc-400 w-5">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                          {member.memberName}
                        </span>
                        <span className="text-xs text-zinc-500">({member.totalActivities})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        {member.commits > 0 && <span>💻{member.commits}</span>}
                        {member.issuesClosed > 0 && <span>✅{member.issuesClosed}</span>}
                        {member.reviews > 0 && <span>👀{member.reviews}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 活动列表 */}
        <div className={showStats ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                ⚡ {t.recentActivities}
                <span className="text-xs text-zinc-500">({filteredActivities.length})</span>
              </h3>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-zinc-700 max-h-[600px] overflow-y-auto">
              {filteredActivities.length === 0 ? (
                <div className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  <p className="text-lg mb-2">📭</p>
                  <p>{t.noActivities}</p>
                </div>
              ) : (
                filteredActivities.map(activity => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    config={activityConfig[activity.type]}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TeamActivityTracker.displayName = 'TeamActivityTracker';

// ============================================================================
// 活动项组件
// ============================================================================

interface ActivityItemProps {
  activity: TeamActivity;
  config: { icon: string; label: string; color: string };
}

const ActivityItem = memo<ActivityItemProps>(({ activity, config }) => {
  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
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
  };

  return (
    <div className="px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group">
      <div className="flex items-start gap-3">
        {/* 头像 */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-sm overflow-hidden">
          {activity.actor.avatar ? (
            <img 
              src={activity.actor.avatar} 
              alt={activity.actor.name}
              className="w-full h-full object-cover"
            />
          ) : (
            activity.actor.name[0]
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}>
              {config.icon} {config.label}
            </span>
            <span className="text-xs text-zinc-400">{formatTimeAgo(activity.timestamp)}</span>
          </div>

          <p className="text-sm text-zinc-900 dark:text-white">
            <span className="font-medium">{activity.actor.name}</span>
            {' · '}
            {activity.title}
          </p>

          {activity.description && (
            <p className="text-xs text-zinc-500 mt-1">{activity.description}</p>
          )}

          {activity.metadata && (
            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
              {activity.metadata.filesChanged && (
                <span>📁 {activity.metadata.filesChanged} 文件</span>
              )}
              {activity.metadata.additions !== undefined && (
                <span className="text-green-600">+{activity.metadata.additions}</span>
              )}
              {activity.metadata.deletions !== undefined && (
                <span className="text-red-600">-{activity.metadata.deletions}</span>
              )}
            </div>
          )}
        </div>

        {/* 操作 */}
        {activity.metadata?.url && (
          <a
            href={activity.metadata.url}
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800"
          >
            🔗
          </a>
        )}
      </div>
    </div>
  );
});

ActivityItem.displayName = 'ActivityItem';

export default TeamActivityTracker;
