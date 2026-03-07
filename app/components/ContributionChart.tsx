'use client';

import { memo, useMemo, useCallback } from 'react';
import type { TeamMember } from './Dashboard';

interface ContributionChartProps {
  members: TeamMember[];
}

// 颜色配置 - 移到组件外部
const GRADIENT_COLORS = [
  'from-yellow-400 to-orange-500',
  'from-gray-300 to-gray-400',
  'from-orange-400 to-red-500',
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
] as const;

/**
 * 贡献统计图表组件 - 性能优化版本
 * 
 * 优化措施:
 * 1. 使用 React.memo 防止不必要的重渲染
 * 2. 使用 useMemo 缓存计算结果
 * 3. 配置移到组件外部
 */
const ContributionChart = memo(function ContributionChart({ members }: ContributionChartProps) {
  const chartData = useMemo(() => {
    const maxScore = Math.max(...members.map((m) => m.contributionScore));
    return members.map((member) => ({
      ...member,
      percentage: maxScore > 0 ? (member.contributionScore / maxScore) * 100 : 0,
    }));
  }, [members]);

  const sortedData = useMemo(
    () => [...chartData].sort((a, b) => b.contributionScore - a.contributionScore),
    [chartData]
  );

  const totalContributions = useMemo(
    () => members.reduce((sum, m) => sum + m.contributionScore, 0),
    [members]
  );

  const stats = useMemo(() => ({
    totalContributions,
    activeMembers: members.filter((m) => m.status === 'active').length,
    avgContribution: members.length > 0 ? Math.round(totalContributions / members.length) : 0,
    totalTasks: members.reduce((sum, m) => sum + m.completedTasks, 0),
  }), [members, totalContributions]);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <OverviewStats stats={stats} />

      {/* Bar Chart */}
      <BarChartSection sortedData={sortedData} />

      {/* Pie Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <StatusPieChart members={members} />
        <TaskCompletionChart members={members} />
      </div>
    </div>
  );
});

// ============================================================================
// 子组件
// ============================================================================

interface OverviewStatsProps {
  stats: {
    totalContributions: number;
    activeMembers: number;
    avgContribution: number;
    totalTasks: number;
  };
}

const OverviewStats = memo(function OverviewStats({ stats }: OverviewStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        value={stats.totalContributions}
        label="总贡献点"
        colorClass="text-blue-600 dark:text-blue-400"
      />
      <StatCard
        value={stats.activeMembers}
        label="活跃成员"
        colorClass="text-green-600 dark:text-green-400"
      />
      <StatCard
        value={stats.avgContribution}
        label="平均贡献"
        colorClass="text-purple-600 dark:text-purple-400"
      />
      <StatCard
        value={stats.totalTasks}
        label="完成任务"
        colorClass="text-orange-600 dark:text-orange-400"
      />
    </div>
  );
});

interface StatCardProps {
  value: number;
  label: string;
  colorClass: string;
}

const StatCard = memo(function StatCard({ value, label, colorClass }: StatCardProps) {
  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${colorClass}`}>
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
});

interface BarChartSectionProps {
  sortedData: Array<TeamMember & { percentage: number }>;
}

const BarChartSection = memo(function BarChartSection({ sortedData }: BarChartSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        贡献度排行
      </h3>
      <div className="space-y-3">
        {sortedData.map((member, index) => (
          <MemberBar
            key={member.id}
            member={member}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
});

interface MemberBarProps {
  member: TeamMember & { percentage: number };
  rank: number;
}

const MemberBar = memo(function MemberBar({ member, rank }: MemberBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-500 dark:text-gray-400">
            #{rank}
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {member.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({member.role})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 dark:text-gray-400">
            {member.completedTasks} 任务
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {member.contributionScore} 分
          </span>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${member.percentage}%` }}
          role="progressbar"
          aria-valuenow={member.contributionScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${member.name} 贡献度`}
        />
      </div>
    </div>
  );
});

// ============================================================================
// 饼图组件
// ============================================================================

const StatusPieChart = memo(function StatusPieChart({ members }: { members: TeamMember[] }) {
  const statusCounts = useMemo(() => {
    const counts = { active: 0, idle: 0, offline: 0 };
    members.forEach((m) => counts[m.status]++);
    return counts;
  }, [members]);

  const total = members.length;
  const activePercent = total > 0 ? (statusCounts.active / total) * 100 : 0;
  const idlePercent = total > 0 ? (statusCounts.idle / total) * 100 : 0;
  const offlinePercent = 100 - activePercent - idlePercent;

  const gradient = `conic-gradient(
    #10b981 0% ${activePercent}%,
    #f59e0b ${activePercent}% ${activePercent + idlePercent}%,
    #6b7280 ${activePercent + idlePercent}% 100%
  )`;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        状态分布
      </h3>
      <div className="flex items-center gap-6">
        <div
          className="w-32 h-32 rounded-full shadow-lg"
          style={{ background: gradient }}
          role="img"
          aria-label="成员状态分布图"
        />
        <div className="space-y-2">
          <StatusLegendItem color="bg-green-500" label="活跃" count={statusCounts.active} percent={activePercent} />
          <StatusLegendItem color="bg-yellow-500" label="空闲" count={statusCounts.idle} percent={idlePercent} />
          <StatusLegendItem color="bg-gray-500" label="离线" count={statusCounts.offline} percent={offlinePercent} />
        </div>
      </div>
    </div>
  );
});

interface StatusLegendItemProps {
  color: string;
  label: string;
  count: number;
  percent: number;
}

const StatusLegendItem = memo(function StatusLegendItem({ color, label, count, percent }: StatusLegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded ${color}`} />
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {label}: {count} ({percent.toFixed(1)}%)
      </span>
    </div>
  );
});

const TaskCompletionChart = memo(function TaskCompletionChart({ members }: { members: TeamMember[] }) {
  const topPerformers = useMemo(() => {
    return [...members]
      .sort((a, b) => b.completedTasks - a.completedTasks)
      .slice(0, 5);
  }, [members]);

  const maxTasks = topPerformers[0]?.completedTasks || 1;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        任务完成率
      </h3>
      <div className="space-y-3">
        {topPerformers.map((member, index) => (
          <PerformerBar
            key={member.id}
            member={member}
            maxTasks={maxTasks}
            colorClass={GRADIENT_COLORS[index]}
          />
        ))}
      </div>
    </div>
  );
});

interface PerformerBarProps {
  member: TeamMember;
  maxTasks: number;
  colorClass: string;
}

const PerformerBar = memo(function PerformerBar({ member, maxTasks, colorClass }: PerformerBarProps) {
  const percentage = maxTasks > 0 ? (member.completedTasks / maxTasks) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900 dark:text-white truncate">
          {member.name}
        </span>
        <span className="font-bold text-gray-700 dark:text-gray-300">
          {member.completedTasks}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

export default ContributionChart;
