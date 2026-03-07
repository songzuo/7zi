/**
 * 用户活动日志系统 - 类型定义
 */

// ========== 基础类型 ==========

/** 用户活动类型 */
export type UserActivityType =
  | 'login'
  | 'logout'
  | 'page_view'
  | 'task_create'
  | 'task_update'
  | 'task_delete'
  | 'task_complete'
  | 'comment_create'
  | 'file_upload'
  | 'file_download'
  | 'settings_change'
  | 'profile_update'
  | 'search'
  | 'export'
  | 'import'
  | 'error'
  | 'api_call';

/** 活动来源 */
export type ActivitySource = 'web' | 'mobile' | 'api' | 'system';

/** 活动严重程度 */
export type ActivitySeverity = 'info' | 'warning' | 'error' | 'success';

// ========== 数据模型 ==========

/** 用户活动记录 */
export interface UserActivity {
  id: string;
  userId: string;
  type: UserActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  source: ActivitySource;
  severity: ActivitySeverity;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  duration?: number; // 操作耗时（毫秒）
  timestamp: Date;
  createdAt: Date;
}

/** 用户活动统计 */
export interface UserActivityStats {
  totalActivities: number;
  todayActivities: number;
  weekActivities: number;
  monthActivities: number;
  byType: Record<UserActivityType, number>;
  bySource: Record<ActivitySource, number>;
  bySeverity: Record<ActivitySeverity, number>;
  avgDailyActivities: number;
  mostActiveHour: number;
  lastActivityAt: Date | null;
}

/** 活动趋势数据 */
export interface ActivityTrend {
  date: string;
  count: number;
  byType: Partial<Record<UserActivityType, number>>;
}

/** 用户活动查询参数 */
export interface UserActivityQuery {
  userId?: string;
  type?: UserActivityType | UserActivityType[];
  source?: ActivitySource;
  severity?: ActivitySeverity;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'type' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

/** 创建活动参数 */
export interface CreateUserActivityParams {
  userId: string;
  type: UserActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  source?: ActivitySource;
  severity?: ActivitySeverity;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  duration?: number;
}

/** 活动时间线项 */
export interface ActivityTimelineItem {
  id: string;
  type: UserActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  severity: ActivitySeverity;
  metadata?: Record<string, unknown>;
  relativeTime: string;
  isToday: boolean;
  isYesterday: boolean;
  dateGroup: string;
}

// ========== 配置常量 ==========

/** 活动类型配置 */
export const USER_ACTIVITY_TYPE_CONFIG: Record<
  UserActivityType,
  { icon: string; label: string; color: string; bgColor: string }
> = {
  login: {
    icon: '🔐',
    label: '登录',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  logout: {
    icon: '🚪',
    label: '登出',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  page_view: {
    icon: '👁️',
    label: '页面浏览',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  task_create: {
    icon: '📝',
    label: '创建任务',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  task_update: {
    icon: '✏️',
    label: '更新任务',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  task_delete: {
    icon: '🗑️',
    label: '删除任务',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  task_complete: {
    icon: '✅',
    label: '完成任务',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  comment_create: {
    icon: '💬',
    label: '添加评论',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  file_upload: {
    icon: '📤',
    label: '上传文件',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  file_download: {
    icon: '📥',
    label: '下载文件',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  settings_change: {
    icon: '⚙️',
    label: '修改设置',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  profile_update: {
    icon: '👤',
    label: '更新资料',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  search: {
    icon: '🔍',
    label: '搜索',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
  },
  export: {
    icon: '📊',
    label: '导出数据',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  import: {
    icon: '📋',
    label: '导入数据',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  error: {
    icon: '❌',
    label: '错误',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  api_call: {
    icon: '🔌',
    label: 'API 调用',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
};

/** 严重程度配置 */
export const ACTIVITY_SEVERITY_CONFIG: Record<
  ActivitySeverity,
  { icon: string; label: string; color: string }
> = {
  info: { icon: 'ℹ️', label: '信息', color: 'text-blue-500' },
  warning: { icon: '⚠️', label: '警告', color: 'text-yellow-500' },
  error: { icon: '🔴', label: '错误', color: 'text-red-500' },
  success: { icon: '✅', label: '成功', color: 'text-green-500' },
};

/** 来源配置 */
export const ACTIVITY_SOURCE_CONFIG: Record<
  ActivitySource,
  { icon: string; label: string }
> = {
  web: { icon: '🌐', label: '网页' },
  mobile: { icon: '📱', label: '移动端' },
  api: { icon: '🔌', label: 'API' },
  system: { icon: '🖥️', label: '系统' },
};
