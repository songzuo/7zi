/**
 * 审批系统类型定义
 * Approval System Type Definitions
 */

import { Permission } from '../permissions/types'

/**
 * 审批状态枚举
 */
export enum ApprovalStatus {
  PENDING = 'pending', // 待审批
  APPROVED = 'approved', // 已批准
  REJECTED = 'rejected', // 已拒绝
  CANCELLED = 'cancelled', // 已取消
  EXPIRED = 'expired', // 已过期
}

/**
 * 审批类型枚举
 */
export enum ApprovalType {
  // 权限相关
  PERMISSION_REQUEST = 'permission_request', // 权限申请
  ROLE_CHANGE = 'role_change', // 角色变更
  CUSTOM_PERMISSION = 'custom_permission', // 自定义权限

  // 敏感操作
  DELETE_TASK = 'delete_task', // 删除任务
  DELETE_USER = 'delete_user', // 删除用户
  BATCH_OPERATION = 'batch_operation', // 批量操作
  EXPORT_DATA = 'export_data', // 数据导出
  SYSTEM_CONFIG = 'system_config', // 系统配置变更

  // 团队相关
  TEAM_INVITE = 'team_invite', // 邀请成员
  TEAM_REMOVE = 'team_remove', // 移除成员
  TEAM_TRANSFER = 'team_transfer', // 转移团队

  // 其他
  CUSTOM = 'custom', // 自定义审批
}

/**
 * 审批优先级
 */
export enum ApprovalPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 审批请求
 */
export interface ApprovalRequest {
  id: string
  type: ApprovalType
  status: ApprovalStatus
  priority: ApprovalPriority

  // 申请人信息
  requesterId: string
  requesterName: string

  // 审批内容
  title: string
  description: string
  data: Record<string, unknown> // 审批相关数据

  // 权限相关（如果是权限申请）
  requestedPermission?: Permission
  requestedRole?: string

  // 审批流程
  approvers: ApprovalApprover[]
  currentStep: number
  totalSteps: number

  // 时间信息
  createdAt: string
  updatedAt: string
  expiresAt?: string

  // 审批结果
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string

  // 元数据
  metadata?: Record<string, unknown>
}

/**
 * 审批人信息
 */
export interface ApprovalApprover {
  userId: string
  userName: string
  status: ApprovalStatus
  order: number // 审批顺序

  // 审批结果
  approvedAt?: string
  rejectedAt?: string
  comment?: string
}

/**
 * 创建审批请求
 */
export interface CreateApprovalRequest {
  type: ApprovalType
  priority?: ApprovalPriority
  title: string
  description: string
  data: Record<string, unknown>
  requestedPermission?: Permission
  requestedRole?: string
  expiresAt?: string

  // 审批人列表（可选，不填则自动选择）
  approverIds?: string[]
}

/**
 * 审批操作请求
 */
export interface ApprovalActionRequest {
  approvalId: string
  action: 'approve' | 'reject' | 'cancel'
  comment?: string
}

/**
 * 审批工作流配置
 */
export interface ApprovalWorkflowConfig {
  type: ApprovalType
  name: string
  description: string

  // 审批人选择策略
  approverStrategy: 'auto' | 'manual' | 'role-based'

  // 自动选择配置
  autoApproverRoles?: string[] // 可以审批此类型的角色
  minApprovers?: number // 最少需要的审批人数
  requireAllApprovers?: boolean // 是否需要所有审批人同意

  // 超时配置
  defaultExpiryHours?: number // 默认过期时间（小时）
  autoApproveOnExpiry?: boolean // 过期时自动批准

  // 通知配置
  notifyRequester?: boolean
  notifyApprovers?: boolean
}

/**
 * 审批统计
 */
export interface ApprovalStats {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
  expired: number

  // 平均处理时间（小时）
  avgProcessingTime?: number

  // 按类型分组
  byType: Record<ApprovalType, number>

  // 按优先级分组
  byPriority: Record<ApprovalPriority, number>
}

/**
 * 审批列表查询参数
 */
export interface ApprovalListQuery {
  status?: ApprovalStatus | ApprovalStatus[]
  type?: ApprovalType | ApprovalType[]
  requesterId?: string
  approverId?: string
  priority?: ApprovalPriority

  // 分页
  page?: number
  pageSize?: number

  // 排序
  sortBy?: 'createdAt' | 'updatedAt' | 'priority'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 审批列表结果
 */
export interface ApprovalListResult {
  items: ApprovalRequest[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 需要审批的操作配置
 */
export interface ApprovalRequiredConfig {
  // 敏感权限列表（需要审批才能使用）
  sensitivePermissions: Permission[]

  // 敏感操作类型列表
  sensitiveOperations: ApprovalType[]

  // 是否启用审批系统
  enabled: boolean

  // 默认审批过期时间（小时）
  defaultExpiryHours: number
}

/**
 * 默认需要审批的权限
 */
export const SENSITIVE_PERMISSIONS: Permission[] = [
  Permission.USER_DELETE,
  Permission.USER_MANAGE_ROLE,
  Permission.TEAM_REMOVE_MEMBER,
  Permission.SETTINGS_UPDATE,
  Permission.TASK_BATCH,
  Permission.REPORTS_EXPORT,
]

/**
 * 默认审批工作流配置
 */
export const DEFAULT_WORKFLOW_CONFIGS: ApprovalWorkflowConfig[] = [
  {
    type: ApprovalType.PERMISSION_REQUEST,
    name: '权限申请',
    description: '申请额外的系统权限',
    approverStrategy: 'role-based',
    autoApproverRoles: ['admin', 'manager'],
    minApprovers: 1,
    requireAllApprovers: false,
    defaultExpiryHours: 72,
    notifyRequester: true,
    notifyApprovers: true,
  },
  {
    type: ApprovalType.ROLE_CHANGE,
    name: '角色变更',
    description: '变更用户角色',
    approverStrategy: 'role-based',
    autoApproverRoles: ['admin'],
    minApprovers: 1,
    requireAllApprovers: true,
    defaultExpiryHours: 48,
    notifyRequester: true,
    notifyApprovers: true,
  },
  {
    type: ApprovalType.DELETE_USER,
    name: '删除用户',
    description: '删除系统用户',
    approverStrategy: 'role-based',
    autoApproverRoles: ['admin'],
    minApprovers: 2,
    requireAllApprovers: true,
    defaultExpiryHours: 24,
    notifyRequester: true,
    notifyApprovers: true,
  },
  {
    type: ApprovalType.BATCH_OPERATION,
    name: '批量操作',
    description: '执行批量操作',
    approverStrategy: 'role-based',
    autoApproverRoles: ['admin', 'manager'],
    minApprovers: 1,
    requireAllApprovers: false,
    defaultExpiryHours: 24,
    notifyRequester: true,
    notifyApprovers: true,
  },
  {
    type: ApprovalType.EXPORT_DATA,
    name: '数据导出',
    description: '导出系统数据',
    approverStrategy: 'role-based',
    autoApproverRoles: ['admin', 'manager'],
    minApprovers: 1,
    requireAllApprovers: false,
    defaultExpiryHours: 12,
    notifyRequester: true,
    notifyApprovers: true,
  },
  {
    type: ApprovalType.TEAM_REMOVE,
    name: '移除成员',
    description: '从团队中移除成员',
    approverStrategy: 'role-based',
    autoApproverRoles: ['admin', 'manager'],
    minApprovers: 1,
    requireAllApprovers: false,
    defaultExpiryHours: 48,
    notifyRequester: true,
    notifyApprovers: true,
  },
]

/**
 * 审批状态显示文本
 */
export const ApprovalStatusLabels: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: '待审批',
  [ApprovalStatus.APPROVED]: '已批准',
  [ApprovalStatus.REJECTED]: '已拒绝',
  [ApprovalStatus.CANCELLED]: '已取消',
  [ApprovalStatus.EXPIRED]: '已过期',
}

/**
 * 审批类型显示文本
 */
export const ApprovalTypeLabels: Record<ApprovalType, string> = {
  [ApprovalType.PERMISSION_REQUEST]: '权限申请',
  [ApprovalType.ROLE_CHANGE]: '角色变更',
  [ApprovalType.CUSTOM_PERMISSION]: '自定义权限',
  [ApprovalType.DELETE_TASK]: '删除任务',
  [ApprovalType.DELETE_USER]: '删除用户',
  [ApprovalType.BATCH_OPERATION]: '批量操作',
  [ApprovalType.EXPORT_DATA]: '数据导出',
  [ApprovalType.SYSTEM_CONFIG]: '系统配置变更',
  [ApprovalType.TEAM_INVITE]: '邀请成员',
  [ApprovalType.TEAM_REMOVE]: '移除成员',
  [ApprovalType.TEAM_TRANSFER]: '转移团队',
  [ApprovalType.CUSTOM]: '自定义审批',
}

/**
 * 审批优先级显示文本
 */
export const ApprovalPriorityLabels: Record<ApprovalPriority, string> = {
  [ApprovalPriority.LOW]: '低',
  [ApprovalPriority.MEDIUM]: '中',
  [ApprovalPriority.HIGH]: '高',
  [ApprovalPriority.URGENT]: '紧急',
}

/**
 * 审批优先级颜色
 */
export const ApprovalPriorityColors: Record<ApprovalPriority, string> = {
  [ApprovalPriority.LOW]: 'gray',
  [ApprovalPriority.MEDIUM]: 'blue',
  [ApprovalPriority.HIGH]: 'orange',
  [ApprovalPriority.URGENT]: 'red',
}
