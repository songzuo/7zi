/**
 * v1.12.0 Fine-Grained RBAC Repository
 * 细粒度权限系统数据库操作
 */

import { getDatabaseAsync } from '../db'
import {
  EnhancedRoleDefinition,
  FineGrainedPermission,
  PermissionPolicy,
  PermissionCheckContext,
  PermissionChangeType,
  ResourceType,
  ActionType,
} from './types'
import { createAuditLogManager } from './audit'
import { createInheritanceManager } from './inheritance'

const auditManager = createAuditLogManager()
const inheritanceManager = createInheritanceManager()

/**
 * 初始化细粒度权限表
 */
export async function initializeFineGrainedTables(): Promise<void> {
  const db = await getDatabaseAsync()

  const statements = [
    // 细粒度权限表
    `CREATE TABLE IF NOT EXISTS fg_permissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      resource_type TEXT NOT NULL,
      action TEXT NOT NULL,
      conditions TEXT,
      scope TEXT,
      priority INTEGER DEFAULT 0,
      is_deny INTEGER DEFAULT 0,
      effective_from TEXT,
      effective_until TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 权限策略表
    `CREATE TABLE IF NOT EXISTS fg_policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 增强角色表 (支持继承)
    `CREATE TABLE IF NOT EXISTS fg_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      policies TEXT NOT NULL DEFAULT '[]',
      inherits_from TEXT NOT NULL DEFAULT '[]',
      inheritance_depth INTEGER DEFAULT 0,
      is_system INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 角色-权限映射表
    `CREATE TABLE IF NOT EXISTS fg_role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES fg_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES fg_permissions(id) ON DELETE CASCADE,
      UNIQUE(role_id, permission_id)
    );`,

    // 用户-角色映射表 (扩展)
    `CREATE TABLE IF NOT EXISTS fg_user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      tenant_id TEXT,
      assigned_at TEXT NOT NULL,
      assigned_by TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES fg_roles(id) ON DELETE CASCADE,
      UNIQUE(user_id, role_id, tenant_id)
    );`,

    // 用户-权限映射表 (直接权限)
    `CREATE TABLE IF NOT EXISTS fg_user_permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      granted_at TEXT NOT NULL,
      granted_by TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (permission_id) REFERENCES fg_permissions(id) ON DELETE CASCADE,
      UNIQUE(user_id, permission_id)
    );`,

    // 索引
    `CREATE INDEX IF NOT EXISTS idx_fg_permissions_resource ON fg_permissions(resource_type, action);`,
    `CREATE INDEX IF NOT EXISTS idx_fg_roles_level ON fg_roles(level DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_fg_user_roles_user ON fg_user_roles(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_fg_user_roles_role ON fg_user_roles(role_id);`,
    `CREATE INDEX IF NOT EXISTS idx_fg_user_permissions_user ON fg_user_permissions(user_id);`,
  ]

  for (const statement of statements) {
    try {
      db.exec(statement)
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error
      }
    }
  }
}

/**
 * 获取所有细粒度权限
 */
export async function getPermissions(): Promise<FineGrainedPermission[]> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const stmt = db.prepare(`
    SELECT * FROM fg_permissions
    WHERE (effective_from IS NULL OR effective_from <= ?)
    AND (effective_until IS NULL OR effective_until >= ?)
    ORDER BY priority DESC, resource_type, action
  `)

  const now = new Date().toISOString()
  const rows = stmt.all(now, now) as Array<Record<string, unknown>>

  return rows.map(row => mapRowToPermission(row))
}

/**
 * 根据资源类型和操作获取权限
 */
export async function getPermissionsByResourceAction(
  resourceType: string,
  action: string
): Promise<FineGrainedPermission[]> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const stmt = db.prepare(`
    SELECT * FROM fg_permissions
    WHERE resource_type = ? AND action = ?
    AND (effective_from IS NULL OR effective_from <= ?)
    AND (effective_until IS NULL OR effective_until >= ?)
    ORDER BY priority DESC
  `)

  const now = new Date().toISOString()
  const rows = stmt.all(resourceType, action, now, now) as Array<Record<string, unknown>>

  return rows.map(row => mapRowToPermission(row))
}

/**
 * 创建细粒度权限
 */
export async function createPermission(
  permission: Omit<FineGrainedPermission, 'id' | 'createdAt' | 'updatedAt'>,
  operatorId: string,
  operatorRole: string
): Promise<FineGrainedPermission> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const now = new Date().toISOString()
  const id = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const stmt = db.prepare(`
    INSERT INTO fg_permissions (
      id, name, description, resource_type, action,
      conditions, scope, priority, is_deny,
      effective_from, effective_until, metadata,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    permission.name,
    permission.description || null,
    permission.resourceType,
    permission.action,
    permission.conditions ? JSON.stringify(permission.conditions) : null,
    permission.scope ? JSON.stringify(permission.scope) : null,
    permission.priority || 0,
    permission.isDeny ? 1 : 0,
    permission.effectiveFrom?.toISOString() || null,
    permission.effectiveUntil?.toISOString() || null,
    permission.metadata ? JSON.stringify(permission.metadata) : null,
    now,
    now
  )

  // 记录审计日志
  await auditManager.logChange({
    changeType: PermissionChangeType.PERMISSION_GRANTED,
    operatorId,
    operatorRole,
    targetType: 'policy',
    targetId: id,
    afterValue: permission,
    reason: `Created permission: ${permission.name}`,
  })

  return {
    ...permission,
    id,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  }
}

/**
 * 更新权限
 */
export async function updatePermission(
  permissionId: string,
  updates: Partial<FineGrainedPermission>,
  operatorId: string,
  operatorRole: string
): Promise<FineGrainedPermission | null> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const existing = await getPermissionById(permissionId)
  if (!existing) {
    return null
  }

  const now = new Date().toISOString()
  const updatesObj: Record<string, unknown> = { updated_at: now }

  if (updates.name !== undefined) updatesObj.name = updates.name
  if (updates.description !== undefined) updatesObj.description = updates.description
  if (updates.resourceType !== undefined) updatesObj.resource_type = updates.resourceType
  if (updates.action !== undefined) updatesObj.action = updates.action
  if (updates.conditions !== undefined) updatesObj.conditions = JSON.stringify(updates.conditions)
  if (updates.scope !== undefined) updatesObj.scope = JSON.stringify(updates.scope)
  if (updates.priority !== undefined) updatesObj.priority = updates.priority
  if (updates.isDeny !== undefined) updatesObj.is_deny = updates.isDeny ? 1 : 0
  if (updates.effectiveFrom !== undefined) updatesObj.effective_from = updates.effectiveFrom?.toISOString()
  if (updates.effectiveUntil !== undefined) updatesObj.effective_until = updates.effectiveUntil?.toISOString()
  if (updates.metadata !== undefined) updatesObj.metadata = JSON.stringify(updates.metadata)

  const setClause = Object.keys(updatesObj).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(updatesObj), permissionId]

  const stmt = db.prepare(`UPDATE fg_permissions SET ${setClause} WHERE id = ?`)
  stmt.run(...values)

  // 记录审计日志
  await auditManager.logChange({
    changeType: PermissionChangeType.PERMISSION_GRANTED,
    operatorId,
    operatorRole,
    targetType: 'policy',
    targetId: permissionId,
    beforeValue: existing,
    afterValue: { ...existing, ...updates },
    reason: `Updated permission: ${permissionId}`,
  })

  return getPermissionById(permissionId)
}

/**
 * 删除权限
 */
export async function deletePermission(
  permissionId: string,
  operatorId: string,
  operatorRole: string
): Promise<boolean> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const existing = await getPermissionById(permissionId)
  if (!existing) {
    return false
  }

  // 记录审计日志
  await auditManager.logChange({
    changeType: PermissionChangeType.PERMISSION_REVOKED,
    operatorId,
    operatorRole,
    targetType: 'policy',
    targetId: permissionId,
    beforeValue: existing,
    reason: `Deleted permission: ${permissionId}`,
  })

  const stmt = db.prepare('DELETE FROM fg_permissions WHERE id = ?')
  stmt.run(permissionId)

  return true
}

/**
 * 根据ID获取权限
 */
export async function getPermissionById(permissionId: string): Promise<FineGrainedPermission | null> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const stmt = db.prepare('SELECT * FROM fg_permissions WHERE id = ?')
  const row = stmt.get(permissionId) as Record<string, unknown> | undefined

  return row ? mapRowToPermission(row) : null
}

/**
 * 获取所有增强角色
 */
export async function getEnhancedRoles(): Promise<EnhancedRoleDefinition[]> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const stmt = db.prepare('SELECT * FROM fg_roles ORDER BY level DESC, name ASC')
  const rows = stmt.all() as Array<Record<string, unknown>>

  return rows.map(row => mapRowToEnhancedRole(row))
}

/**
 * 获取增强角色 (带计算后的权限)
 */
export async function getEnhancedRoleWithComputedPermissions(
  roleId: string
): Promise<EnhancedRoleDefinition | null> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const stmt = db.prepare('SELECT * FROM fg_roles WHERE id = ?')
  const row = stmt.get(roleId) as Record<string, unknown> | undefined

  if (!row) {
    return null
  }

  const role = mapRowToEnhancedRole(row)

  // 计算继承的权限
  const allRoles = new Map<string, EnhancedRoleDefinition>()
  const allPermissions = new Map<string, FineGrainedPermission>()

  const roles = await getEnhancedRoles()
  roles.forEach(r => allRoles.set(r.id, r))

  const permissions = await getPermissions()
  permissions.forEach(p => allPermissions.set(p.id, p))

  // 初始化继承管理器
  for (const r of roles) {
    if (r.inheritsFrom && r.inheritsFrom.length > 0) {
      for (const parentId of r.inheritsFrom) {
        inheritanceManager.addInheritance(r.id, parentId)
      }
    }
  }

  const computedPermissions = await inheritanceManager.computeRolePermissions(
    roleId,
    allRoles,
    allPermissions
  )

  return {
    ...role,
    computedPermissions: Array.from(computedPermissions),
  }
}

/**
 * 创建增强角色
 */
export async function createEnhancedRole(
  role: Omit<EnhancedRoleDefinition, 'createdAt' | 'updatedAt' | 'computedPermissions'>,
  operatorId: string,
  operatorRole: string
): Promise<EnhancedRoleDefinition> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const now = new Date().toISOString()
  const id = role.id || `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const stmt = db.prepare(`
    INSERT INTO fg_roles (
      id, name, description, permissions, policies,
      inherits_from, inheritance_depth, is_system, level,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    role.name,
    role.description || null,
    JSON.stringify(role.permissions || []),
    JSON.stringify(role.policies || []),
    JSON.stringify(role.inheritsFrom || []),
    role.inheritanceDepth || 0,
    role.isSystem ? 1 : 0,
    role.level || 0,
    now,
    now
  )

  // 记录审计日志
  await auditManager.logChange({
    changeType: PermissionChangeType.ROLE_CREATED,
    operatorId,
    operatorRole,
    targetType: 'role',
    targetId: id,
    afterValue: role,
    roleIds: [id],
    reason: `Created role: ${role.name}`,
  })

  return {
    ...role,
    id,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  }
}

/**
 * 更新增强角色
 */
export async function updateEnhancedRole(
  roleId: string,
  updates: Partial<EnhancedRoleDefinition>,
  operatorId: string,
  operatorRole: string
): Promise<EnhancedRoleDefinition | null> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const existing = await getEnhancedRoleById(roleId)
  if (!existing) {
    return null
  }

  const now = new Date().toISOString()
  const updatesObj: Record<string, unknown> = { updated_at: now }

  if (updates.name !== undefined) updatesObj.name = updates.name
  if (updates.description !== undefined) updatesObj.description = updates.description
  if (updates.permissions !== undefined) updatesObj.permissions = JSON.stringify(updates.permissions)
  if (updates.policies !== undefined) updatesObj.policies = JSON.stringify(updates.policies)
  if (updates.inheritsFrom !== undefined) updatesObj.inherits_from = JSON.stringify(updates.inheritsFrom)
  if (updates.level !== undefined) updatesObj.level = updates.level
  if (updates.isSystem !== undefined) updatesObj.is_system = updates.isSystem ? 1 : 0

  const setClause = Object.keys(updatesObj).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(updatesObj), roleId]

  const stmt = db.prepare(`UPDATE fg_roles SET ${setClause} WHERE id = ?`)
  stmt.run(...values)

  // 记录审计日志
  await auditManager.logChange({
    changeType: PermissionChangeType.ROLE_UPDATED,
    operatorId,
    operatorRole,
    targetType: 'role',
    targetId: roleId,
    beforeValue: existing,
    afterValue: { ...existing, ...updates },
    roleIds: [roleId],
    reason: `Updated role: ${roleId}`,
  })

  return getEnhancedRoleById(roleId)
}

/**
 * 删除增强角色
 */
export async function deleteEnhancedRole(
  roleId: string,
  operatorId: string,
  operatorRole: string
): Promise<boolean> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const existing = await getEnhancedRoleById(roleId)
  if (!existing || existing.isSystem) {
    return false
  }

  // 记录审计日志
  await auditManager.logChange({
    changeType: PermissionChangeType.ROLE_DELETED,
    operatorId,
    operatorRole,
    targetType: 'role',
    targetId: roleId,
    beforeValue: existing,
    reason: `Deleted role: ${roleId}`,
  })

  const stmt = db.prepare('DELETE FROM fg_roles WHERE id = ?')
  stmt.run(roleId)

  return true
}

/**
 * 获取增强角色 (通过ID)
 */
export async function getEnhancedRoleById(roleId: string): Promise<EnhancedRoleDefinition | null> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const stmt = db.prepare('SELECT * FROM fg_roles WHERE id = ?')
  const row = stmt.get(roleId) as Record<string, unknown> | undefined

  return row ? mapRowToEnhancedRole(row) : null
}

/**
 * 获取用户权限上下文 V2
 */
export async function getUserPermissionContextV2(
  userId: string
): Promise<{
  userId: string
  roles: string[]
  permissions: string[]
  customPermissions?: string[]
  teamIds?: string[]
  tenantId?: string
} | null> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  // 获取用户角色
  const roleStmt = db.prepare(`
    SELECT r.id, r.level FROM fg_roles r
    INNER JOIN fg_user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
    ORDER BY r.level DESC
  `)
  const roleRows = roleStmt.all(userId) as Array<{ id: string; level: number }>

  if (roleRows.length === 0) {
    return null
  }

  const roles = roleRows.map(r => r.id)
  const tenantIds = new Set<string>()

  // 获取租户信息
  const tenantStmt = db.prepare(`
    SELECT DISTINCT tenant_id FROM fg_user_roles
    WHERE user_id = ? AND tenant_id IS NOT NULL
  `)
  const tenantRows = tenantStmt.all(userId) as Array<{ tenant_id: string }>
  tenantRows.forEach(r => r.tenant_id && tenantIds.add(r.tenant_id))

  // 获取团队信息
  const teamIds: string[] = []
  const teamStmt = db.prepare(`
    SELECT DISTINCT team_id FROM team_members
    WHERE user_id = ?
  `)
  const teamRows = teamStmt.all(userId) as Array<{ team_id: string }>
  teamRows.forEach(r => r.team_id && teamIds.push(r.team_id))

  // 获取直接权限
  const permStmt = db.prepare(`
    SELECT permission_id FROM fg_user_permissions
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)
  `)
  const permRows = permStmt.all(userId, new Date().toISOString()) as Array<{ permission_id: string }>
  const customPermissions = permRows.map(r => r.permission_id)

  // 计算所有权限 (包括继承)
  const allRoles = new Map<string, EnhancedRoleDefinition>()
  const allPermissions = new Map<string, FineGrainedPermission>()

  const dbRoles = await getEnhancedRoles()
  dbRoles.forEach(r => allRoles.set(r.id, r))

  const dbPermissions = await getPermissions()
  dbPermissions.forEach(p => allPermissions.set(p.id, p))

  // 初始化继承管理器
  for (const r of dbRoles) {
    if (r.inheritsFrom && r.inheritsFrom.length > 0) {
      for (const parentId of r.inheritsFrom) {
        inheritanceManager.addInheritance(r.id, parentId)
      }
    }
  }

  // 计算所有角色的权限
  const allPermissionsSet = new Set<string>()
  for (const roleId of roles) {
    const computed = await inheritanceManager.computeRolePermissions(
      roleId,
      allRoles,
      allPermissions
    )
    computed.forEach(p => allPermissionsSet.add(p))
  }

  return {
    userId,
    roles,
    permissions: Array.from(allPermissionsSet),
    customPermissions: customPermissions.length > 0 ? customPermissions : undefined,
    teamIds: teamIds.length > 0 ? teamIds : undefined,
    tenantId: tenantIds.size > 0 ? Array.from(tenantIds)[0] : undefined,
  }
}

/**
 * 为用户分配角色
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy: string,
  tenantId?: string,
  expiresAt?: Date
): Promise<void> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const now = new Date().toISOString()
  const id = `ur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const stmt = db.prepare(`
    INSERT INTO fg_user_roles (id, user_id, role_id, tenant_id, assigned_at, assigned_by, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  try {
    stmt.run(id, userId, roleId, tenantId || null, now, assignedBy, expiresAt?.toISOString() || null, now)

    // 记录审计日志
    await auditManager.logChange({
      changeType: PermissionChangeType.ROLE_ASSIGNED,
      operatorId: assignedBy,
      operatorRole: 'admin',
      targetType: 'user',
      targetId: userId,
      afterValue: { roleId, tenantId, expiresAt },
      roleIds: [roleId],
      reason: `Assigned role ${roleId} to user ${userId}`,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      // 忽略重复分配
      return
    }
    throw error
  }
}

/**
 * 移除用户角色
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string,
  removedBy: string
): Promise<void> {
  const db = await getDatabaseAsync()
  await initializeFineGrainedTables()

  const stmt = db.prepare('DELETE FROM fg_user_roles WHERE user_id = ? AND role_id = ?')
  stmt.run(userId, roleId)

  // 记录审计日志
  await auditManager.logChange({
    changeType: PermissionChangeType.ROLE_REMOVED,
    operatorId: removedBy,
    operatorRole: 'admin',
    targetType: 'user',
    targetId: userId,
    beforeValue: { roleId },
    roleIds: [roleId],
    reason: `Removed role ${roleId} from user ${userId}`,
  })
}

/**
 * 映射行到权限对象
 */
function mapRowToPermission(row: Record<string, unknown>): FineGrainedPermission {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    resourceType: row.resource_type as ResourceType,
    action: row.action as ActionType,
    conditions: row.conditions ? JSON.parse(row.conditions as string) : undefined,
    scope: row.scope ? JSON.parse(row.scope as string) : undefined,
    priority: row.priority as number,
    isDeny: Boolean(row.is_deny),
    effectiveFrom: row.effective_from ? new Date(row.effective_from as string) : undefined,
    effectiveUntil: row.effective_until ? new Date(row.effective_until as string) : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * 映射行到增强角色对象
 */
function mapRowToEnhancedRole(row: Record<string, unknown>): EnhancedRoleDefinition {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    permissions: JSON.parse((row.permissions as string) || '[]'),
    policies: JSON.parse((row.policies as string) || '[]'),
    inheritsFrom: JSON.parse((row.inherits_from as string) || '[]'),
    inheritanceDepth: row.inheritance_depth as number,
    isSystem: Boolean(row.is_system),
    level: row.level as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}
