/**
 * @fileoverview 统一成员类型定义
 * @description 统一管理所有成员/团队成员相关的类型定义
 */

/**
 * 成员状态
 */
export type MemberStatus = 'online' | 'working' | 'busy' | 'idle' | 'offline'

/**
 * 成员分类
 */
export type MemberCategory = 'strategy' | 'tech' | 'creative' | 'business'

/**
 * 统一团队成员接口
 * 整合了 TeamMember、AIMember 等所有成员类型
 */
export interface UnifiedTeamMember {
  /** 成员唯一标识 */
  id: string | number
  /** 成员名称 */
  name: string
  /** 成员角色 */
  role: string
  /** 成员表情符号 */
  emoji: string
  /** 头像 URL（可选） */
  avatar?: string
  /** 在线状态 */
  status: MemberStatus
  /** 成员分类（可选） */
  category?: MemberCategory
  /** 服务提供商（可选） */
  provider?: string
  /** 当前任务（可选） */
  currentTask?: string
  /** 已完成任务数（可选） */
  completedTasks?: number
  /** 专业领域（可选） */
  specialty?: string
  /** 颜色标识（可选） */
  color?: string
  /** 唯一键值（用于翻译等场景，可选） */
  key?: string
}

/**
 * 兼容别名 - 为了向后兼容
 */
export type TeamMember = UnifiedTeamMember
export type AIMember = UnifiedTeamMember

// ============================================================================
// 状态颜色映射
// ============================================================================

export const MEMBER_STATUS_CONFIG: Record<
  MemberStatus,
  { color: string; bgColor: string; label: string }
> = {
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
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取成员状态对应的颜色类名
 */
export function getStatusColor(status: MemberStatus): string {
  return MEMBER_STATUS_CONFIG[status]?.color || 'bg-gray-300'
}

/**
 * 获取成员状态对应的背景和文本颜色类名
 */
export function getStatusBgColor(status: MemberStatus): string {
  return MEMBER_STATUS_CONFIG[status]?.bgColor || 'bg-gray-100 text-gray-400'
}
