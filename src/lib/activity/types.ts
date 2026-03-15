/**
 * Activity Log Types
 * 活动日志类型定义
 */

// ============================================
// 类型定义
// ============================================

// 活动类型枚举
export type ActivityType =
  // 任务相关
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_completed'
  // 项目相关
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  // 通知相关
  | 'notification_read'
  | 'notification_dismissed'
  | 'notification_created'
  // 知识图谱相关
  | 'knowledge_node_created'
  | 'knowledge_node_updated'
  | 'knowledge_node_deleted'
  | 'knowledge_edge_created'
  | 'knowledge_edge_deleted'
  // 用户相关
  | 'user_login'
  | 'user_logout'
  | 'user_registered'
  | 'user_updated'
  // 系统相关
  | 'system_config_changed'
  | 'api_key_created'
  | 'api_key_revoked'
  // 自定义
  | string;

// 目标类型
export type TargetType = 
  | 'task'
  | 'project'
  | 'notification'
  | 'knowledge_node'
  | 'knowledge_edge'
  | 'user'
  | 'system'
  | 'api_key'
  | string;

// ============================================
// 接口定义
// ============================================

/**
 * 活动日志条目
 */
export interface Activity {
  id: string;
  type: ActivityType;
  userId?: string;
  userName?: string;
  targetId?: string;
  targetType?: TargetType;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  // 可选字段
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * 活动查询参数
 */
export interface ActivityQuery {
  // 类型过滤
  type?: ActivityType;
  types?: ActivityType[];
  // 用户过滤
  userId?: string;
  userIds?: string[];
  // 目标过滤
  targetId?: string;
  targetType?: TargetType;
  // 时间范围
  startDate?: string;
  endDate?: string;
  // 搜索
  search?: string;
  // 分页
  page?: number;
  limit?: number;
  offset?: number;
  // 排序
  orderBy?: 'timestamp' | 'type';
  order?: 'asc' | 'desc';
}

/**
 * 活动查询结果
 */
export interface ActivityQueryResult {
  activities: Activity[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 活动存储接口
 */
export interface ActivityStore {
  create: (activity: Omit<Activity, 'id' | 'timestamp'>) => Activity;
  query: (query: ActivityQuery) => ActivityQueryResult;
  getById: (id: string) => Activity | null;
  delete: (id: string) => boolean;
  cleanup: (days: number) => number;
  count: (query: ActivityQuery) => number;
}

/**
 * 创建活动请求
 */
export interface CreateActivityRequest {
  type: ActivityType;
  userId?: string;
  userName?: string;
  targetId?: string;
  targetType?: TargetType;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * 活动统计
 */
export interface ActivityStats {
  total: number;
  byType: Record<string, number>;
  byUser: Record<string, number>;
  recentCount: number; // 最近24小时
}

// ============================================
// 工具类型
// ============================================

/**
 * 活动创建数据 (不含自动生成的字段)
 */
export type ActivityCreateData = Omit<Activity, 'id' | 'timestamp'>;

/**
 * 活动摘要 (用于列表显示)
 */
export type ActivitySummary = Pick<Activity, 'id' | 'type' | 'description' | 'timestamp' | 'userName'>;

/**
 * 活动类型分组
 */
export type ActivityTypeGroup = 'task' | 'project' | 'notification' | 'knowledge' | 'user' | 'system' | 'custom';

/**
 * 获取活动类型所属分组
 */
export function getActivityTypeGroup(type: ActivityType): ActivityTypeGroup {
  if (type.startsWith('task_')) return 'task';
  if (type.startsWith('project_')) return 'project';
  if (type.startsWith('notification_')) return 'notification';
  if (type.startsWith('knowledge_')) return 'knowledge';
  if (type.startsWith('user_')) return 'user';
  if (type.startsWith('system_') || type.startsWith('api_key_')) return 'system';
  return 'custom';
}

/**
 * 预定义活动类型常量
 */
export const ACTIVITY_TYPES = {
  // 任务
  TASK_CREATED: 'task_created' as const,
  TASK_UPDATED: 'task_updated' as const,
  TASK_DELETED: 'task_deleted' as const,
  TASK_ASSIGNED: 'task_assigned' as const,
  TASK_COMPLETED: 'task_completed' as const,
  // 项目
  PROJECT_CREATED: 'project_created' as const,
  PROJECT_UPDATED: 'project_updated' as const,
  PROJECT_DELETED: 'project_deleted' as const,
  // 通知
  NOTIFICATION_READ: 'notification_read' as const,
  NOTIFICATION_DISMISSED: 'notification_dismissed' as const,
  NOTIFICATION_CREATED: 'notification_created' as const,
  // 知识图谱
  KNOWLEDGE_NODE_CREATED: 'knowledge_node_created' as const,
  KNOWLEDGE_NODE_UPDATED: 'knowledge_node_updated' as const,
  KNOWLEDGE_NODE_DELETED: 'knowledge_node_deleted' as const,
  KNOWLEDGE_EDGE_CREATED: 'knowledge_edge_created' as const,
  KNOWLEDGE_EDGE_DELETED: 'knowledge_edge_deleted' as const,
  // 用户
  USER_LOGIN: 'user_login' as const,
  USER_LOGOUT: 'user_logout' as const,
  USER_REGISTERED: 'user_registered' as const,
  USER_UPDATED: 'user_updated' as const,
  // 系统
  SYSTEM_CONFIG_CHANGED: 'system_config_changed' as const,
  API_KEY_CREATED: 'api_key_created' as const,
  API_KEY_REVOKED: 'api_key_revoked' as const,
} as const;
