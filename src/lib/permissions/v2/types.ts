// @ts-nocheck
/**
 * v1.12.0 Fine-Grained RBAC Types
 * 细粒度权限管理系统类型定义
 */

/**
 * 资源类型枚举
 */
export enum ResourceType {
  // 用户资源
  USER = 'user',
  USER_PROFILE = 'user:profile',
  USER_SETTINGS = 'user:settings',

  // 团队资源
  TEAM = 'team',
  TEAM_MEMBER = 'team:member',
  TEAM_SETTINGS = 'team:settings',

  // 任务资源
  TASK = 'task',
  TASK_COMMENT = 'task:comment',
  TASK_ATTACHMENT = 'task:attachment',

  // 工作流资源
  WORKFLOW = 'workflow',
  WORKFLOW_EXECUTION = 'workflow:execution',
  WORKFLOW_TEMPLATE = 'workflow:template',

  // AI Agent 资源
  AGENT = 'agent',
  AGENT_TASK = 'agent:task',
  AGENT_CONFIG = 'agent:config',

  // 系统资源
  SYSTEM = 'system',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',

  // 文件资源
  FILE = 'file',
  DOCUMENT = 'document',

  // 钱包资源
  WALLET = 'wallet',
  WALLET_TRANSACTION = 'wallet:transaction',

  // 通知资源
  NOTIFICATION = 'notification',

  // 报表资源
  REPORT = 'report',
  DASHBOARD = 'dashboard',

  // API 密钥资源
  API_KEY = 'api_key',

  // 插件资源
  PLUGIN = 'plugin',
}

/**
 * 操作类型枚举
 */
export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  MANAGE = 'manage',
  EXPORT = 'export',
  IMPORT = 'import',
  SHARE = 'share',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  TRANSFER = 'transfer',
  CONFIGURE = 'configure',
  DEPLOY = 'deploy',
}

/**
 * 权限条件操作符
 */
export enum ConditionOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  IN = 'in',
  NOT_IN = 'nin',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  EXISTS = 'exists',
  REGEX = 'regex',
}

/**
 * 权限条件定义
 */
export interface PermissionCondition {
  /** 字段路径 (支持嵌套，如 "owner.id", "team.memberships") */
  field: string
  /** 操作符 */
  operator: ConditionOperator
  /** 值 */
  value: unknown
  /** 是否大小写敏感 (字符串比较) */
  caseSensitive?: boolean
}

/**
 * 权限条件组 (支持 AND/OR 逻辑)
 */
export interface PermissionConditionGroup {
  /** 逻辑操作符 */
  logic: 'AND' | 'OR'
  /** 条件列表 */
  conditions: Array<PermissionCondition | PermissionConditionGroup>
}

/**
 * 资源范围限制
 */
export interface ResourceScope {
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源 ID 模式 (支持通配符和变量) */
  resourceIdPattern?: string
  /** 属性过滤器 */
  attributeFilters?: PermissionCondition[]
  /** 租户隔离 */
  tenantId?: string
}

/**
 * 细粒度权限定义
 */
export interface FineGrainedPermission {
  /** 权限 ID */
  id: string
  /** 权限名称 */
  name: string
  /** 描述 */
  description?: string
  /** 资源类型 */
  resourceType: ResourceType
  /** 操作类型 */
  action: ActionType
  /** 权限条件 */
  conditions?: PermissionConditionGroup
  /** 资源范围 */
  scope?: ResourceScope
  /** 权限优先级 (数值越大优先级越高) */
  priority?: number
  /** 是否为拒绝权限 (Deny 规则) */
  isDeny?: boolean
  /** 生效时间 */
  effectiveFrom?: Date
  /** 失效时间 */
  effectiveUntil?: Date
  /** 元数据 */
  metadata?: Record<string, unknown>
  /** 创建时间 */
  createdAt?: Date
  /** 更新时间 */
  updatedAt?: Date
}

/**
 * 权限策略定义
 */
export interface PermissionPolicy {
  /** 策略 ID */
  id: string
  /** 策略名称 */
  name: string
  /** 描述 */
  description?: string
  /** 权限列表 */
  permissions: FineGrainedPermission[]
  /** 策略优先级 */
  priority: number
  /** 是否启用 */
  enabled: boolean
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

/**
 * 角色继承关系
 */
export interface RoleInheritance {
  /** 角色ID */
  roleId: string
  /** 父角色ID列表 */
  parentRoles: string[]
  /** 继承深度 */
  depth: number
  /** 继承模式: extend (扩展权限) | restrict (限制权限) | override (覆盖权限) */
  mode: 'extend' | 'restrict' | 'override'
}

/**
 * 增强版角色定义
 */
export interface EnhancedRoleDefinition {
  /** 角色ID */
  id: string
  /** 角色名称 */
  name: string
  /** 描述 */
  description?: string
  /** 直接权限 */
  permissions: string[]
  /** 权限策略 ID 列表 */
  policies?: string[]
  /** 父角色 (继承) */
  inheritsFrom?: string[]
  /** 继承深度 */
  inheritanceDepth: number
  /** 计算后的所有权限 (包括继承的) */
  computedPermissions?: string[]
  /** 是否为系统角色 */
  isSystem: boolean
  /** 角色级别 (层级越高权限越大) */
  level: number
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

/**
 * 权限检查上下文
 */
export interface PermissionCheckContext {
  /** 用户ID */
  userId: string
  /** 用户角色 */
  roles: string[]
  /** 直接权限 */
  permissions: string[]
  /** 自定义权限 */
  customPermissions?: string[]
  /** 租户ID */
  tenantId?: string
  /** 团队ID列表 */
  teamIds?: string[]
  /** 部门ID列表 */
  departmentIds?: string[]
  /** 属性映射 (用于条件匹配) */
  attributes: Record<string, unknown>
  /** 会话信息 */
  session?: {
    ip?: string
    userAgent?: string
    deviceId?: string
  }
}

/**
 * 资源上下文 (用于权限检查)
 */
export interface ResourceContext {
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源ID */
  resourceId: string
  /** 资源属性 */
  attributes: Record<string, unknown>
  /** 所属租户ID */
  tenantId?: string
  /** 所有者ID */
  ownerId?: string
  /** 所属团队ID */
  teamId?: string
}

/**
 * 权限检查请求
 */
export interface PermissionCheckRequest {
  /** 用户上下文 */
  user: PermissionCheckContext
  /** 资源上下文 */
  resource: ResourceContext
  /** 操作类型 */
  action: ActionType
  /** 额外条件 */
  conditions?: Record<string, unknown>
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResultV2 {
  /** 是否允许 */
  allowed: boolean
  /** 决策来源: direct (直接权限) | inherited (继承权限) | policy (策略) | deny (显式拒绝) */
  source: 'direct' | 'inherited' | 'policy' | 'deny'
  /** 匹配的权限ID */
  matchedPermissionId?: string
  /** 匹配的策略ID */
  matchedPolicyId?: string
  /** 拒绝原因 */
  denyReason?: string
  /** 缺失的权限 */
  missingPermissions?: string[]
  /** 未满足的条件 */
  unmetConditions?: PermissionCondition[]
  /** 评估耗时 (毫秒) */
  evaluationTimeMs: number
  /** 缓存命中 */
  cacheHit?: boolean
  /** 审计ID */
  auditId?: string
}

/**
 * 权限变更类型
 */
export enum PermissionChangeType {
  ROLE_CREATED = 'role_created',
  ROLE_UPDATED = 'role_updated',
  ROLE_DELETED = 'role_deleted',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  POLICY_CREATED = 'policy_created',
  POLICY_UPDATED = 'policy_updated',
  POLICY_DELETED = 'policy_deleted',
  POLICY_ATTACHED = 'policy_attached',
  POLICY_DETACHED = 'policy_detached',
  INHERITANCE_ADDED = 'inheritance_added',
  INHERITANCE_REMOVED = 'inheritance_removed',
}

/**
 * 权限变更审计日志
 */
export interface PermissionAuditLog {
  /** 日志ID */
  id: string
  /** 变更类型 */
  changeType: PermissionChangeType
  /** 操作者ID */
  operatorId: string
  /** 操作者角色 */
  operatorRole: string
  /** 目标类型: role | user | policy */
  targetType: 'role' | 'user' | 'policy'
  /** 目标ID */
  targetId: string
  /** 变更前数据 */
  beforeValue?: unknown
  /** 变更后数据 */
  afterValue?: unknown
  /** 变更原因 */
  reason?: string
  /** 关联的权限ID列表 */
  permissionIds?: string[]
  /** 关联的角色ID列表 */
  roleIds?: string[]
  /** 租户ID */
  tenantId?: string
  /** IP地址 */
  ipAddress?: string
  /** User Agent */
  userAgent?: string
  /** 时间戳 */
  timestamp: Date
  /** 元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 权限缓存条目
 */
export interface PermissionCacheEntry {
  /** 缓存键 */
  key: string
  /** 权限列表 */
  permissions: string[]
  /** 计算后的权限 */
  computedPermissions: string[]
  /** 过期时间 */
  expiresAt: number
  /** 创建时间 */
  createdAt: number
  /** 命中次数 */
  hitCount: number
}

/**
 * 权限统计信息
 */
export interface PermissionStats {
  /** 总权限数 */
  totalPermissions: number
  /** 总角色数 */
  totalRoles: number
  /** 总策略数 */
  totalPolicies: number
  /** 平均检查耗时 (ms) */
  avgCheckTimeMs: number
  /** 缓存命中率 */
  cacheHitRate: number
  /** 最近变更数 (24小时内) */
  recentChanges: number
}

/**
 * 权限验证性能指标
 */
export interface PermissionPerformanceMetrics {
  /** 检查次数 */
  checkCount: number
  /** 总耗时 (ms) */
  totalTimeMs: number
  /** 平均耗时 (ms) */
  avgTimeMs: number
  /** 最大耗时 (ms) */
  maxTimeMs: number
  /** 最小耗时 (ms) */
  minTimeMs: number
  /** P50 耗时 (ms) */
  p50TimeMs: number
  /** P95 耗时 (ms) */
  p95TimeMs: number
  /** P99 耗时 (ms) */
  p99TimeMs: number
  /** 缓存命中次数 */
  cacheHits: number
  /** 缓存未命中次数 */
  cacheMisses: number
  /** 条件评估次数 */
  conditionEvaluations: number
}
