/**
 * Dashboard 组件导出
 * 
 * 提供统一的导出接口，便于外部使用
 */

// 组件导出
export { DashboardStats, createDefaultStats } from './DashboardStats';
export { RecentActivity, createMockActivities } from './RecentActivity';
export { QuickActions, defaultActions, minimalActions, analyticsActions } from './QuickActions';

// 类型导出
export type { StatItem } from './DashboardStats';
export type { ActivityItem, ActivityType } from './RecentActivity';
export type { QuickAction } from './QuickActions';
