/**
 * RBAC Repository - Database operations for roles and permissions
 */

import { getDatabaseAsync } from '../db';
import {
  Role,
  Permission,
  RoleDefinition,
  RoleDefinitionWithCount,
  PermissionContext,
  RolePermissionMapping,
  UserRoleMapping,
} from './types';
import { getRoleDefinition, getPermissionsForRoles } from './rbac';

/**
 * Initialize RBAC tables
 */
export async function initializeRbacTables(): Promise<void> {
  const db = await getDatabaseAsync();

  const statements = [
    // Roles table
    `CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // User-roles mapping table (many-to-many)
    `CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      assigned_at TEXT NOT NULL,
      assigned_by TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, role)
    );`,

    // Role-permissions mapping table (many-to-many)
    `CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      permission TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT,
      FOREIGN KEY (role) REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE(role, permission)
    );`,

    // Indexes for better query performance
    `CREATE INDEX IF NOT EXISTS idx_roles_id ON roles(id);`,
    `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);`,
    `CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);`,
    `CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission);`,
  ];

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
    }
  }
}

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<RoleDefinition[]> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare('SELECT * FROM roles ORDER BY name ASC');
  const rows = stmt.all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    permissions: JSON.parse(row.permissions as string || '[]'),
    isSystem: Boolean(row.is_system),
  }));
}

/**
 * Get all roles with user count
 */
export async function getAllRolesWithCount(): Promise<RoleDefinitionWithCount[]> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare(`
    SELECT
      r.*,
      COUNT(DISTINCT ur.user_id) as user_count
    FROM roles r
    LEFT JOIN user_roles ur ON r.id = ur.role
    GROUP BY r.id
    ORDER BY r.name ASC
  `);

  const rows = stmt.all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    permissions: JSON.parse(row.permissions as string || '[]'),
    isSystem: Boolean(row.is_system),
    userCount: Number(row.user_count || 0),
  }));
}

/**
 * Get role by ID
 */
export async function getRoleById(id: string): Promise<RoleDefinition | null> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare('SELECT * FROM roles WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    permissions: JSON.parse(row.permissions as string || '[]'),
    isSystem: Boolean(row.is_system),
  };
}

/**
 * Get all permissions
 */
export async function getAllPermissions(): Promise<Permission[]> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare('SELECT DISTINCT permission FROM role_permissions ORDER BY permission ASC');
  const rows = stmt.all() as Array<{ permission: Permission }>;

  return rows.map((row) => row.permission);
}

/**
 * Get permissions for a specific role
 */
export async function getPermissionsByRole(role: Role): Promise<Permission[]> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare(`
    SELECT permission
    FROM role_permissions
    WHERE role = ?
    ORDER BY permission ASC
  `);

  const rows = stmt.all(role) as Array<{ permission: Permission }>;

  if (rows.length === 0) {
    // Fallback to default role definition
    const roleDef = getRoleDefinition(role);
    return roleDef ? roleDef.permissions : [];
  }

  return rows.map((row) => row.permission);
}

/**
 * Assign permissions to a role
 */
export async function assignPermissionsToRole(
  role: Role,
  permissions: Permission[],
  assignedBy?: string
): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const now = new Date().toISOString();

  for (const permission of permissions) {
    const id = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const stmt = db.prepare(`
        INSERT INTO role_permissions (id, role, permission, created_at, created_by)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, role, permission, now, assignedBy);
    } catch (error) {
      // Ignore duplicate entries
      if (!(error instanceof Error && error.message.includes('UNIQUE constraint'))) {
        throw error;
      }
    }
  }

  // Update role's permissions field
  const updatedPermissions = await getPermissionsByRole(role);
  const updateStmt = db.prepare(`
    UPDATE roles
    SET permissions = ?, updated_at = ?
    WHERE id = ?
  `);
  updateStmt.run(JSON.stringify(updatedPermissions), now, role);
}

/**
 * Remove permissions from a role
 */
export async function removePermissionsFromRole(
  role: Role,
  permissions: Permission[]
): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare(`
    DELETE FROM role_permissions
    WHERE role = ? AND permission = ?
  `);

  for (const permission of permissions) {
    stmt.run(role, permission);
  }

  // Update role's permissions field
  const updatedPermissions = await getPermissionsByRole(role);
  const updateStmt = db.prepare(`
    UPDATE roles
    SET permissions = ?, updated_at = ?
    WHERE id = ?
  `);
  updateStmt.run(JSON.stringify(updatedPermissions), new Date().toISOString(), role);
}

/**
 * Get user roles
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare('SELECT role FROM user_roles WHERE user_id = ? ORDER BY assigned_at ASC');
  const rows = stmt.all(userId) as Array<{ role: Role }>;

  return rows.map((row) => row.role);
}

/**
 * Add roles to user
 */
export async function addRolesToUser(
  userId: string,
  roles: Role[],
  assignedBy?: string
): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const now = new Date().toISOString();

  for (const role of roles) {
    const id = `ur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const stmt = db.prepare(`
        INSERT INTO user_roles (id, user_id, role, assigned_at, assigned_by)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, userId, role, now, assignedBy);
    } catch (error) {
      // Ignore duplicate entries
      if (!(error instanceof Error && error.message.includes('UNIQUE constraint'))) {
        throw error;
      }
    }
  }
}

/**
 * Remove roles from user
 */
export async function removeRolesFromUser(userId: string, roles: Role[]): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare('DELETE FROM user_roles WHERE user_id = ? AND role = ?');

  for (const role of roles) {
    stmt.run(userId, role);
  }
}

/**
 * Get user permission context
 */
export async function getUserPermissionContext(userId: string): Promise<PermissionContext | null> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  // Get user roles
  const userRoles = await getUserRoles(userId);

  if (userRoles.length === 0) {
    return null;
  }

  // Get permissions from roles
  const permissions = getPermissionsForRoles(userRoles);

  // Get custom permissions from user record
  const userStmt = db.prepare('SELECT permissions FROM users WHERE id = ?');
  const userRow = userStmt.get(userId) as { permissions: string } | undefined;
  const customPermissions = userRow
    ? (JSON.parse(userRow.permissions) as Permission[])
    : undefined;

  return {
    userId,
    roles: userRoles,
    permissions,
    customPermissions,
  };
}

/**
 * Get all user-role mappings
 */
export async function getAllUserRoleMappings(): Promise<UserRoleMapping[]> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare(`
    SELECT user_id, role, assigned_at, assigned_by
    FROM user_roles
    ORDER BY user_id, assigned_at ASC
  `);

  const rows = stmt.all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    userId: row.user_id as string,
    roleId: row.role as string,
    role: row.role as Role,
    assignedAt: new Date(row.assigned_at as string),
    assignedBy: row.assigned_by as string || '',
  }));
}

/**
 * Get all role-permission mappings
 */
export async function getAllRolePermissionMappings(): Promise<RolePermissionMapping[]> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const stmt = db.prepare(`
    SELECT role, permission, created_at
    FROM role_permissions
    ORDER BY role, permission ASC
  `);

  const rows = stmt.all() as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    roleId: row.role as string,
    permission: row.permission as Permission,
    grantedAt: new Date(row.created_at as string),
    grantedBy: 'system',
  }));
}

/**
 * Check if role is system role
 */
export async function isSystemRole(role: Role): Promise<boolean> {
  const roleDef = await getRoleById(role);
  return roleDef ? (roleDef.isSystem ?? false) : false;
}

/**
 * Create custom role
 */
export async function createRole(data: {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem?: boolean;
}): Promise<RoleDefinition> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    data.id,
    data.name,
    data.description || null,
    JSON.stringify(data.permissions || []),
    data.isSystem ? 1 : 0,
    now,
    now
  );

  // Assign permissions to role
  if (data.permissions.length > 0) {
    await assignPermissionsToRole(data.id as Role, data.permissions);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    permissions: data.permissions,
    isSystem: data.isSystem || false,
  };
}

/**
 * Update role
 */
export async function updateRole(
  role: string,
  data: {
    name?: string;
    description?: string;
    permissions?: Permission[];
  }
): Promise<RoleDefinition> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const now = new Date().toISOString();

  // Update role fields
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }

  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    params.push(now);
    params.push(role);

    const stmt = db.prepare(`
      UPDATE roles
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...params);
  }

  // Update permissions if provided
  if (data.permissions !== undefined) {
    await assignPermissionsToRole(role as Role, data.permissions);
  }

  // Return updated role
  const updatedRole = await getRoleById(role);
  if (!updatedRole) {
    throw new Error('Role not found after update');
  }

  return updatedRole;
}

/**
 * Delete custom role (only non-system roles)
 */
export async function deleteRole(role: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  await initializeRbacTables();

  const roleDef = await getRoleById(role);
  if (!roleDef || roleDef.isSystem) {
    return false;
  }

  try {
    // Delete role-permission mappings
    db.prepare('DELETE FROM role_permissions WHERE role = ?').run(role);

    // Delete user-role mappings
    db.prepare('DELETE FROM user_roles WHERE role = ?').run(role);

    // Delete role
    db.prepare('DELETE FROM roles WHERE id = ?').run(role);

    return true;
  } catch {
    return false;
  }
}
