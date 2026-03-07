/**
 * React Query Keys 定义
 * 
 * 使用工厂模式创建查询键，便于：
 * 1. 类型安全
 * 2. 查询失效和更新
 * 3. 缓存管理
 */

/**
 * 任务相关查询键
 */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filter?: TaskFilterKey) => [...taskKeys.lists(), filter] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  stats: () => [...taskKeys.all, 'stats'] as const,
} as const;

/**
 * 标签相关查询键
 */
export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (customOnly?: boolean) => [...tagKeys.lists(), { customOnly }] as const,
} as const;

/**
 * 仪表盘相关查询键
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
} as const;

/**
 * 任务过滤器键类型
 */
export interface TaskFilterKey {
  priority?: string;
  status?: string;
  assignee?: string;
  search?: string;
  tags?: string[];
}

/**
 * 辅助函数：将过滤器对象转换为缓存键
 */
export function getTaskFilterKey(filter?: {
  priority?: string;
  status?: string;
  assignee?: string;
  search?: string;
  tags?: string[];
}): TaskFilterKey | undefined {
  if (!filter || Object.keys(filter).length === 0) {
    return undefined;
  }
  
  // 只包含有值的字段
  const key: TaskFilterKey = {};
  if (filter.priority) key.priority = filter.priority;
  if (filter.status) key.status = filter.status;
  if (filter.assignee) key.assignee = filter.assignee;
  if (filter.search) key.search = filter.search;
  if (filter.tags && filter.tags.length > 0) key.tags = [...filter.tags].sort();
  
  return Object.keys(key).length > 0 ? key : undefined;
}