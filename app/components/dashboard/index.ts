/**
 * Dashboard 组件导出
 */

export { default as UserStatsCards } from './UserStatsCards';
export { default as TaskTrendChart } from './TaskTrendChart';
export { default as ActivityTimeline } from './ActivityTimeline';
export { default as ContributionRanking } from './ContributionRanking';
export { default as QuickActionsPanel } from './QuickActionsPanel';
export { default as AchievementBadges } from './AchievementBadges';
export { default as RecentTasks } from './RecentTasks';
export { default as RealtimeChart } from './RealtimeChart';
export { default as PieChart } from './PieChart';
export { default as CircularProgress } from './CircularProgress';
export { default as TeamAnalytics } from './TeamAnalytics';

// 类型导出
export type { UserStats, TaskTrend, UserActivity, Achievement, RecentTask, UserDashboardData } from '@/app/users/[userId]/dashboard/page';
export type { TeamMetrics, EfficiencyDataPoint, TaskDistribution, MemberContribution, TeamAnalyticsData } from './TeamAnalytics';