/**
 * @fileoverview 共享类型定义
 * @description 统一管理项目中的通用类型
 */

// ============================================================================
// GitHub 相关类型
// ============================================================================

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string; avatar_url: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
  author?: { avatar_url?: string; login?: string } | null;
}

export interface GitHubStats {
  stars: number;
  forks: number;
  openIssues: number;
}

// ============================================================================
// 活动类型
// ============================================================================

export type ActivityType = 'commit' | 'issue' | 'comment' | 'deploy' | 'meeting';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
  emoji?: string;
}

// ============================================================================
// 成员状态类型
// ============================================================================

export type MemberStatus = 'online' | 'working' | 'busy' | 'idle' | 'offline';

export interface StatusConfig {
  color: string;
  bgColor: string;
  label: string;
}

export const STATUS_CONFIG: Record<MemberStatus, StatusConfig> = {
  online: {
    color: 'bg-green-500',
    bgColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    label: '在线',
  },
  working: {
    color: 'bg-green-500',
    bgColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    label: '工作中',
  },
  busy: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    label: '忙碌',
  },
  idle: {
    color: 'bg-gray-400',
    bgColor: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
    label: '空闲',
  },
  offline: {
    color: 'bg-gray-300',
    bgColor: 'bg-gray-100 text-gray-400 dark:bg-gray-900/30 dark:text-gray-500',
    label: '离线',
  },
};

// ============================================================================
// 项目状态类型
// ============================================================================

export type ProjectStatus = 'active' | 'completed' | 'paused';

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { color: string; label: string }> = {
  active: {
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    label: '🟢 进行中',
  },
  completed: {
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    label: '🔵 已完成',
  },
  paused: {
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    label: '🟡 已暂停',
  },
};

// ============================================================================
// 活动类型配置
// ============================================================================

export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { icon: string; color: string; label: string }> = {
  commit: {
    icon: '💻',
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    label: '提交',
  },
  issue: {
    icon: '📋',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    label: '任务',
  },
  comment: {
    icon: '💬',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    label: '评论',
  },
  deploy: {
    icon: '🚀',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    label: '部署',
  },
  meeting: {
    icon: '📋',
    color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    label: '会议',
  },
};

// ============================================================================
// 通用 Props 类型
// ============================================================================

export interface BaseComponentProps {
  className?: string;
}

export interface LoadingProps {
  loading?: boolean;
}

export interface ErrorProps {
  error?: string | null;
}
