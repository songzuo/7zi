/**
 * Enhanced Permission System
 * Provides resource-level permission control with inheritance and composition
 */

import { getDatabaseAsync } from '../db'
import { logger } from '../logger'

/**
 * Permission action types
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXECUTE = 'execute',
  ADMIN = 'admin',
}

/**
 * Permission resource types
 */
export enum PermissionResource {
  USER = 'user',
  AGENT = 'agent',
  TASK = 'task',
  PROJECT = 'project',
  TEAM = 'team',
  WORKFLOW = 'workflow',
  REPORT = 'report',
  WALLET = 'wallet',
  SYSTEM = 'system',
  AUDIT_LOG = 'audit_log',
  PERMISSION = 'permission',
  ROLE = 'role',
}

/**
 * Resource-level permission
 */
export interface ResourcePermission {
  id: string
  userId?: string
  agentId?: string
  roleId?: string
  resource: PermissionResource | string
  resourceId?: string // Specific resource ID (optional, for fine-grained control)
  action: PermissionAction | string
  conditions?: PermissionCondition[]
  grantedBy: string
  grantedAt: Date
  expiresAt?: Date
}

/**
 * Permission condition for dynamic access control
 */
export interface PermissionCondition {
  type: 'time' | 'ip' | 'attribute' | 'context'
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than'
  value: string | number | string[] | number[]
  attribute?: string // For attribute-based conditions
}

/**
 * Permission inheritance rule
 */
export interface PermissionInheritanceRule {
  id: string
  parentRole: string
  childRole: string
  inheritPermissions: boolean
  additionalPermissions?: string[]
  excludePermissions?: string[]
  priority: number
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason: string
  matchedPermissions: string[]
  conditions?: PermissionCondition[]
  inheritedFrom?: string
}

/**
 * Initialize permission tables
 */
export async function initializePermissionTables(): Promise<void> {
  const db = await getDatabaseAsync()

  // Resource permissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      agent_id TEXT,
      role_id TEXT,
      resource TEXT NOT NULL,
      resource_id TEXT,
      action TEXT NOT NULL,
      conditions TEXT,
      granted_by TEXT NOT NULL,
      granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      INDEX idx_user_resource (user_id, resource),
      INDEX idx_agent_resource (agent_id, resource),
      INDEX idx_role_resource (role_id, resource),
      INDEX idx_resource_id (resource_id)
    )
  `)

  // Permission inheritance rules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS permission_inheritance (
      id TEXT PRIMARY KEY,
      parent_role TEXT NOT NULL,
      child_role TEXT NOT NULL,
      inherit_permissions INTEGER NOT NULL DEFAULT 1,
      additional_permissions TEXT,
      exclude_permissions TEXT,
      priority INTEGER NOT NULL DEFAULT 0,
      INDEX idx_parent_role (parent_role),
      INDEX idx_child_role (child_role)
    )
  `)

  // Default inheritance rules
  const defaultRules = [
    { parent: 'admin', child: 'director', priority: 1 },
    { parent: 'director', child: 'architect', priority: 2 },
    { parent: 'director', child: 'executor', priority: 2 },
    { parent: 'architect', child: 'designer', priority: 3 },
    { parent: 'executor', child: 'tester', priority: 3 },
  ]

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO permission_inheritance 
    (id, parent_role, child_role, priority) 
    VALUES (?, ?, ?, ?)
  `)

  defaultRules.forEach(rule => {
    stmt.run(
      `inh_${rule.parent}_${rule.child}`,
      rule.parent,
      rule.child,
      rule.priority
    )
  })
}

/**
 * Grant resource-level permission
 */
export async function grantPermission(params: {
  userId?: string
  agentId?: string
  roleId?: string
  resource: PermissionResource | string
  resourceId?: string
  action: PermissionAction | string
  conditions?: PermissionCondition[]
  grantedBy: string
  expiresAt?: Date
}): Promise<ResourcePermission> {
  await initializePermissionTables()

  const db = await getDatabaseAsync()
  const id = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const stmt = db.prepare(`
    INSERT INTO resource_permissions (
      id, user_id, agent_id, role_id, resource, resource_id,
      action, conditions, granted_by, granted_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    params.userId || null,
    params.agentId || null,
    params.roleId || null,
    params.resource,
    params.resourceId || null,
    params.action,
    params.conditions ? JSON.stringify(params.conditions) : null,
    params.grantedBy,
    new Date().toISOString(),
    params.expiresAt?.toISOString() || null
  )

  logger.info('Permission granted', {
    userId: params.userId,
    agentId: params.agentId,
    resource: params.resource,
    action: params.action,
    category: 'permissions',
  })

  return {
    id,
    userId: params.userId,
    agentId: params.agentId,
    roleId: params.roleId,
    resource: params.resource,
    resourceId: params.resourceId,
    action: params.action,
    conditions: params.conditions,
    grantedBy: params.grantedBy,
    grantedAt: new Date(),
    expiresAt: params.expiresAt,
  }
}

/**
 * Revoke permission
 */
export async function revokePermission(permissionId: string): Promise<boolean> {
  await initializePermissionTables()

  const db = await getDatabaseAsync()

  const stmt = db.prepare('DELETE FROM resource_permissions WHERE id = ?')
  const result = stmt.run(permissionId)

  logger.info('Permission revoked', {
    permissionId,
    category: 'permissions',
  })

  return result.changes > 0
}

/**
 * Get all permissions for a user or agent
 */
export async function getEntityPermissions(params: {
  userId?: string
  agentId?: string
  roleId?: string
}): Promise<ResourcePermission[]> {
  await initializePermissionTables()

  const db = await getDatabaseAsync()

  const conditions: string[] = []
  const values: string[] = []

  if (params.userId) {
    conditions.push('user_id = ?')
    values.push(params.userId)
  }

  if (params.agentId) {
    conditions.push('agent_id = ?')
    values.push(params.agentId)
  }

  if (params.roleId) {
    conditions.push('role_id = ?')
    values.push(params.roleId)
  }

  if (conditions.length === 0) {
    return []
  }

  const stmt = db.prepare(`
    SELECT * FROM resource_permissions 
    WHERE ${conditions.join(' OR ')} AND (expires_at IS NULL OR expires_at > ?)
  `)

  const rows = stmt.all(...values, new Date().toISOString()) as Record<string, unknown>[]

  return rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string | undefined,
    agentId: row.agent_id as string | undefined,
    roleId: row.role_id as string | undefined,
    resource: row.resource as string,
    resourceId: row.resource_id as string | undefined,
    action: row.action as string,
    conditions: row.conditions ? JSON.parse(row.conditions as string) : undefined,
    grantedBy: row.granted_by as string,
    grantedAt: new Date(row.granted_at as string),
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
  }))
}

/**
 * Check if entity has permission for a specific resource and action
 */
export async function checkPermission(params: {
  userId?: string
  agentId?: string
  roles?: string[]
  resource: PermissionResource | string
  resourceId?: string
  action: PermissionAction | string
  context?: Record<string, unknown>
}): Promise<PermissionCheckResult> {
  await initializePermissionTables()

  const db = await getDatabaseAsync()
  const matchedPermissions: string[] = []
  let inheritedFrom: string | undefined

  // Direct permission check
  const directPerms = await getEntityPermissions({
    userId: params.userId,
    agentId: params.agentId,
  })

  for (const perm of directPerms) {
    if (perm.resource === params.resource || perm.resource === '*') {
      if (
        perm.action === params.action ||
        perm.action === PermissionAction.MANAGE ||
        perm.action === '*'
      ) {
        if (!perm.resourceId || perm.resourceId === params.resourceId) {
          // Check conditions
          if (perm.conditions && perm.conditions.length > 0) {
            const conditionsMet = await evaluateConditions(perm.conditions, params.context)
            if (!conditionsMet) continue
          }

          matchedPermissions.push(perm.id)
        }
      }
    }
  }

  // Role-based permission check
  if (params.roles && params.roles.length > 0) {
    const rolePerms = await getRolePermissionsWithInheritance(params.roles)

    for (const perm of rolePerms) {
      if (perm.resource === params.resource || perm.resource === '*') {
        if (
          perm.action === params.action ||
          perm.action === PermissionAction.MANAGE ||
          perm.action === '*'
        ) {
          if (!perm.resourceId || perm.resourceId === params.resourceId) {
            matchedPermissions.push(perm.id)
            inheritedFrom = perm.roleId
          }
        }
      }
    }
  }

  // Check for wildcard permissions
  const wildcardCheck = await checkWildcardPermission(params)
  if (wildcardCheck) {
    matchedPermissions.push('wildcard')
  }

  return {
    allowed: matchedPermissions.length > 0,
    reason:
      matchedPermissions.length > 0
        ? 'Permission granted'
        : 'No matching permission found',
    matchedPermissions,
    inheritedFrom,
  }
}

/**
 * Get role permissions with inheritance
 */
export async function getRolePermissionsWithInheritance(roles: string[]): Promise<ResourcePermission[]> {
  await initializePermissionTables()

  const db = await getDatabaseAsync()
  const allPermissions: ResourcePermission[] = []
  const processedRoles = new Set<string>()

  async function processRole(role: string): Promise<void> {
    if (processedRoles.has(role)) return
    processedRoles.add(role)

    // Get direct permissions for this role
    const perms = await getEntityPermissions({ roleId: role })
    allPermissions.push(...perms)

    // Get inheritance rules
    const stmt = db.prepare(`
      SELECT * FROM permission_inheritance 
      WHERE child_role = ? AND inherit_permissions = 1
    `)

    const inheritance = stmt.all(role) as Record<string, unknown>[]

    for (const rule of inheritance) {
      await processRole(rule.parent_role as string)
    }
  }

  // Process all roles
  for (const role of roles) {
    await processRole(role)
  }

  return allPermissions
}

/**
 * Evaluate permission conditions
 */
async function evaluateConditions(
  conditions: PermissionCondition[],
  context?: Record<string, unknown>
): Promise<boolean> {
  if (!context) return true

  for (const condition of conditions) {
    let conditionMet = false

    switch (condition.type) {
      case 'time': {
        const now = new Date()
        const hour = now.getHours()
        if (condition.operator === 'in' && Array.isArray(condition.value)) {
          conditionMet = (condition.value as number[]).includes(hour)
        }
        break
      }

      case 'ip': {
        const ip = context.ipAddress as string
        if (condition.operator === 'in' && Array.isArray(condition.value)) {
          conditionMet = (condition.value as string[]).includes(ip)
        }
        break
      }

      case 'attribute': {
        if (condition.attribute) {
          const attrValue = context[condition.attribute]
          if (condition.operator === 'equals') {
            conditionMet = attrValue === condition.value
          } else if (condition.operator === 'in' && Array.isArray(condition.value)) {
            conditionMet = (condition.value as unknown[]).includes(attrValue)
          }
        }
        break
      }

      case 'context': {
        if (condition.attribute) {
          const contextValue = context[condition.attribute]
          switch (condition.operator) {
            case 'equals':
              conditionMet = contextValue === condition.value
              break
            case 'not_equals':
              conditionMet = contextValue !== condition.value
              break
            case 'in':
              if (Array.isArray(condition.value)) {
                conditionMet = (condition.value as unknown[]).includes(contextValue)
              }
              break
          }
        }
        break
      }
    }

    if (!conditionMet) return false
  }

  return true
}

/**
 * Check for wildcard permissions
 */
async function checkWildcardPermission(params: {
  userId?: string
  agentId?: string
  resource: PermissionResource | string
  action: PermissionAction | string
}): Promise<boolean> {
  const perms = await getEntityPermissions({
    userId: params.userId,
    agentId: params.agentId,
  })

  return perms.some(
    p =>
      (p.resource === '*' && (p.action === '*' || p.action === PermissionAction.ADMIN)) ||
      (p.resource === params.resource && p.action === '*') ||
      (p.resource === '*' && p.action === params.action)
  )
}

/**
 * Get permission summary for an entity
 */
export async function getPermissionSummary(params: {
  userId?: string
  agentId?: string
  roles?: string[]
}): Promise<{
  totalPermissions: number
  byResource: Record<string, number>
  byAction: Record<string, number>
  hasWildcard: boolean
  hasAdmin: boolean
}> {
  const directPerms = await getEntityPermissions(params)

  let allPerms = [...directPerms]

  if (params.roles && params.roles.length > 0) {
    const rolePerms = await getRolePermissionsWithInheritance(params.roles)
    allPerms = [...allPerms, ...rolePerms]
  }

  const byResource: Record<string, number> = {}
  const byAction: Record<string, number> = {}

  allPerms.forEach(perm => {
    byResource[perm.resource] = (byResource[perm.resource] || 0) + 1
    byAction[perm.action] = (byAction[perm.action] || 0) + 1
  })

  const hasWildcard = allPerms.some(p => p.resource === '*' || p.action === '*')
  const hasAdmin = allPerms.some(p => p.action === PermissionAction.ADMIN)

  return {
    totalPermissions: allPerms.length,
    byResource,
    byAction,
    hasWildcard,
    hasAdmin,
  }
}
