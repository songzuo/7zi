/**
 * 仪表盘 Query Hooks
 * 
 * 仪表盘数据查询策略：
 * - 较长的缓存时间（数据聚合，变化不频繁）
 * - 支持后台刷新
 * - 手动刷新触发器
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from './keys';

// 导入统一的类型定义
import type { AIMember, GitHubIssue, ActivityItem } from '@/app/dashboard/page';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  activeMembers: number;
  avgResponseTime: string;
}

export interface DashboardData {
  members: AIMember[];
  issues: GitHubIssue[];
  activities: ActivityItem[];
  stats: DashboardStats;
}

/**
 * 获取仪表盘数据
 */
async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/dashboard');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
}

/**
 * 仪表盘数据查询 Hook
 * 
 * 缓存策略：
 * - staleTime: 1 分钟（仪表盘数据刷新较快）
 * - refetchInterval: 可配置的后台刷新间隔
 */
export function useDashboardQuery(options?: {
  refetchInterval?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: fetchDashboardData,
    staleTime: 60 * 1000, // 1 分钟
    gcTime: 10 * 60 * 1000, // 10 分钟
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled !== false,
    // 网络错误时保留之前的数据
    placeholderData: (previousData) => previousData,
  });
}

/**
 * 仪表盘刷新 Hook
 * 
 * 提供手动刷新能力
 */
export function useDashboardRefresh() {
  const queryClient = useQueryClient();
  
  const refresh = async () => {
    // 失效仪表盘数据，触发重新获取
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.data() });
  };
  
  const reset = () => {
    // 清除仪表盘缓存数据
    queryClient.removeQueries({ queryKey: dashboardKeys.data() });
  };
  
  return { refresh, reset };
}

/**
 * 预获取仪表盘数据
 * 
 * 用于页面预加载
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.data(),
      queryFn: fetchDashboardData,
    });
  };
}