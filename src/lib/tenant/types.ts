/**
 * Multi-Tenant Types
 * 租户相关类型定义
 */

/**
 * 租户状态
 */
export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  DELETED = 'deleted',
}

/**
 * 租户隔离模式
 */
export enum TenantIsolationMode {
  SHARED = 'shared',      // 共享数据库（行级隔离）
  SEPARATE = 'separate',  // 独立数据库
  HYBRID = 'hybrid',      // 混合模式
}

/**
 * 租户计划
 */
export enum TenantPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

/**
 * 租户成员角色
 */
export enum TenantMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

/**
 * 租户成员状态
 */
export enum TenantMemberStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  INACTIVE = 'inactive',
  REMOVED = 'removed',
}

/**
 * 租户实体
 */
export interface Tenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  status: TenantStatus
  isolationMode: TenantIsolationMode
  databaseUrl?: string
  schemaName?: string
  settings?: TenantSettings
  createdAt: Date
  updatedAt: Date
}

/**
 * 租户设置
 */
export interface TenantSettings {
  logo?: string
  theme?: {
    primaryColor?: string
    secondaryColor?: string
  }
  features?: {
    ssoEnabled?: boolean
    customDomain?: boolean
    apiAccess?: boolean
  }
  limits?: {
    maxUsers?: number
    maxAgents?: number
    maxWorkflows?: number
    maxStorageGB?: number
  }
}

/**
 * 租户成员
 */
export interface TenantMember {
  id: string
  tenantId: string
  userId: string
  role: TenantMemberRole
  status: TenantMemberStatus
  joinedAt: Date
  user?: {
    id: string
    email: string
    name: string
    avatar?: string
  }
}

/**
 * 创建租户请求
 */
export interface CreateTenantRequest {
  name: string
  slug?: string
  plan?: TenantPlan
  isolationMode?: TenantIsolationMode
  settings?: TenantSettings
}

/**
 * 更新租户请求
 */
export interface UpdateTenantRequest {
  name?: string
  plan?: TenantPlan
  status?: TenantStatus
  isolationMode?: TenantIsolationMode
  settings?: TenantSettings
}

/**
 * 邀请成员请求
 */
export interface InviteMemberRequest {
  email: string
  role: TenantMemberRole
}

/**
 * 更新成员角色请求
 */
export interface UpdateMemberRoleRequest {
  role: TenantMemberRole
}

/**
 * 租户上下文
 */
export interface TenantContext {
  tenantId: string
  tenantSlug: string
  tenantPlan: TenantPlan
  tenantStatus: TenantStatus
  userId: string
  userRole: TenantMemberRole
  permissions: string[]
}

/**
 * 租户统计信息
 */
export interface TenantStats {
  totalUsers: number
  totalAgents: number
  totalWorkflows: number
  totalConversations: number
  storageUsed: number
  monthlyUsage: {
    aiCalls: number
    workflowRuns: number
    storageGB: number
  }
}

/**
 * 租户使用情况
 */
export interface TenantUsage {
  tenantId: string
  period: {
    start: Date
    end: Date
  }
  resources: {
    aiCalls: number
    workflowRuns: number
    storageGB: number
  }
  costs: {
    subscription: number
    usage: number
    total: number
  }
}

/**
 * 租户配额
 */
export interface TenantQuota {
  maxUsers: number
  maxAgents: number
  maxWorkflows: number
  maxStorageGB: number
  current: {
    users: number
    agents: number
    workflows: number
    storageGB: number
  }
  remaining: {
    users: number
    agents: number
    workflows: number
    storageGB: number
  }
}