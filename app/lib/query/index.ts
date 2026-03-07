/**
 * React Query 配置和 Hooks 导出
 * 
 * 统一导出所有 Query 相关内容
 */

// Provider
export { QueryProvider, getQueryClient } from './provider';

// Query Keys
export { taskKeys, tagKeys, dashboardKeys, getTaskFilterKey } from './keys';
export type { TaskFilterKey } from './keys';

// Task Query Hooks
export {
  useTasksQuery,
  useTaskQuery,
  useTaskStatsQuery,
  useTagsQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useBatchUpdateStatusMutation,
  useCreateTagMutation,
  useDeleteTagMutation,
} from './useTaskQueries';

// Dashboard Query Hooks
export {
  useDashboardQuery,
  useDashboardRefresh,
  usePrefetchDashboard,
} from './useDashboardQuery';
