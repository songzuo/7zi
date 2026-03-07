/**
 * 团队活动追踪系统 - 类型定义
 */

// ========== 基础类型 ==========

/** 活动类型 */
export type TeamActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'task_assigned'
  | 'comment_added'
  | 'meeting_started'
  | 'meeting_ended'
  | 'status_changed'
  | 'project_created'
  | 'project_updated'
  | 'code_committed'
  | 'code_reviewed'
  | 'bug_reported'
  | 'bug_fixed'
  | 'document_created'
  | 'report_generated';

/** 活动优先级 */
export type ActivityPriority = 'low' | 'normal' | 'high' | 'urgent';

/** 成员角色 */
export type MemberRole =
  | '智能体世界专家'
  | '咨询师'
  | '架构师'
  | 'Executor'
  | '系统管理员'
  | '测试员'
  | '设计师'
  | '推广专员'
  | '销售客服'
  | '财务'
  | '媒体';

/** 成员状态 */
export type MemberStatus = 'online' | 'offline' | 'busy' | 'away' | 'meeting';

// ========== 数据模型 ==========

/** 团队成员 */
export interface TeamMember {
  id: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  avatar?: string;
  provider: string; // AI 提供商
  lastActiveAt: string;
  tasksCompleted: number;
  tasksInProgress: number;
  efficiency: number; // 0-100
}

/** 活动项 */
export interface TeamActivity {
  id: string;
  type: TeamActivityType;
  memberId: string;
  memberName: string;
  memberRole: MemberRole;
  memberAvatar?: string;
  title: string;
  description: string;
  timestamp: string;
  priority: ActivityPriority;
  metadata?: {
    taskId?: string;
    taskTitle?: string;
    projectId?: string;
    projectName?: string;
    meetingId?: string;
    commitSha?: string;
    branch?: string;
    duration?: number; // 会议时长（分钟）
    [key: string]: unknown;
  };
  tags?: string[];
}

/** 活动统计 */
export interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  weekActivities: number;
  byType: Record<TeamActivityType, number>;
  byMember: Record<string, number>;
  avgCompletionTime: number; // 平均完成时间（小时）
  productivityScore: number; // 生产力评分 0-100
}

/** 团队概览 */
export interface TeamOverview {
  members: TeamMember[];
  activeMembers: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  teamEfficiency: number;
  activeProjects: number;
  recentActivities: TeamActivity[];
  stats: ActivityStats;
  lastUpdated: string;
}

// ========== API 请求/响应类型 ==========

/** 获取团队活动请求 */
export interface GetTeamActivitiesRequest {
  limit?: number;
  offset?: number;
  memberId?: string;
  type?: TeamActivityType;
  startDate?: string;
  endDate?: string;
  priority?: ActivityPriority;
}

/** 获取团队活动响应 */
export interface GetTeamActivitiesResponse {
  activities: TeamActivity[];
  total: number;
  hasMore: boolean;
  stats: ActivityStats;
}

/** 实时活动更新消息 */
export interface TeamActivityUpdateMessage {
  type: 'team_activity_update';
  activity: TeamActivity;
  stats: ActivityStats;
}

// ========== 状态管理类型 ==========

/** 团队活动状态 */
export interface TeamActivityState {
  activities: TeamActivity[];
  members: TeamMember[];
  stats: ActivityStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  filters: {
    memberId?: string;
    type?: TeamActivityType;
    priority?: ActivityPriority;
    startDate?: string;
    endDate?: string;
  };
  
  // Actions
  setActivities: (activities: TeamActivity[]) => void;
  addActivity: (activity: TeamActivity) => void;
  setMembers: (members: TeamMember[]) => void;
  updateMemberStatus: (memberId: string, status: MemberStatus) => void;
  setStats: (stats: ActivityStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<TeamActivityState['filters']>) => void;
  clearFilters: () => void;
}

// ========== 工具类型 ==========

/** 活动类型配置 */
export interface ActivityTypeConfig {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/** 活动类型配置映射 */
export const ACTIVITY_TYPE_CONFIG: Record<TeamActivityType, ActivityTypeConfig> = {
  task_created: {
    icon: '📝',
    label: '创建任务',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  task_completed: {
    icon: '✅',
    label: '完成任务',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  task_updated: {
    icon: '🔄',
    label: '更新任务',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  task_assigned: {
    icon: '📌',
    label: '分配任务',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  comment_added: {
    icon: '💬',
    label: '添加评论',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  meeting_started: {
    icon: '🚀',
    label: '开始会议',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  meeting_ended: {
    icon: '🏁',
    label: '结束会议',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  status_changed: {
    icon: '🔄',
    label: '状态变更',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  project_created: {
    icon: '📁',
    label: '创建项目',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
  },
  project_updated: {
    icon: '📝',
    label: '更新项目',
    color: 'text-lime-700',
    bgColor: 'bg-lime-50',
    borderColor: 'border-lime-200',
  },
  code_committed: {
    icon: '💻',
    label: '代码提交',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  code_reviewed: {
    icon: '👀',
    label: '代码审查',
    color: 'text-pink-700',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
  bug_reported: {
    icon: '🐛',
    label: '报告 Bug',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  bug_fixed: {
    icon: '🔧',
    label: '修复 Bug',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  document_created: {
    icon: '📄',
    label: '创建文档',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  report_generated: {
    icon: '📊',
    label: '生成报告',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
};

/** 成员角色配置 */
export const MEMBER_ROLE_CONFIG: Record<MemberRole, { icon: string; provider: string }> = {
  '智能体世界专家': { icon: '🌟', provider: 'MiniMax' },
  '咨询师': { icon: '📚', provider: 'MiniMax' },
  '架构师': { icon: '🏗️', provider: 'Self-Claude' },
  'Executor': { icon: '⚡', provider: 'Volcengine' },
  '系统管理员': { icon: '🛡️', provider: 'Bailian' },
  '测试员': { icon: '🧪', provider: 'MiniMax' },
  '设计师': { icon: '🎨', provider: 'Self-Claude' },
  '推广专员': { icon: '📣', provider: 'Volcengine' },
  '销售客服': { icon: '💼', provider: 'Bailian' },
  '财务': { icon: '💰', provider: 'MiniMax' },
  '媒体': { icon: '📺', provider: 'Self-Claude' },
};

/** 成员状态配置 */
export const MEMBER_STATUS_CONFIG: Record<MemberStatus, { icon: string; label: string; color: string }> = {
  online: { icon: '🟢', label: '在线', color: 'text-green-500' },
  offline: { icon: '⚫', label: '离线', color: 'text-gray-400' },
  busy: { icon: '🔴', label: '忙碌', color: 'text-red-500' },
  away: { icon: '🟡', label: '离开', color: 'text-yellow-500' },
  meeting: { icon: '🔵', label: '会议中', color: 'text-blue-500' },
};
