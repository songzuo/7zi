/**
 * Permissions Module
 * Role and permission management
 */

// ============================================================================
// Types
// ============================================================================

export type Role = 'admin' | 'user' | 'guest' | 'moderator';

export type Permission =
  | 'read'
  | 'write'
  | 'delete'
  | 'admin'
  | 'moderate'
  | 'export'
  | 'import'
  | 'backup'
  | 'restore';

interface RolePermissions {
  [key: string]: Permission[];
}

// ============================================================================
// Permission Definitions
// ============================================================================

const ROLE_PERMISSIONS: RolePermissions = {
  admin: ['read', 'write', 'delete', 'admin', 'moderate', 'export', 'import', 'backup', 'restore'],
  moderator: ['read', 'write', 'moderate', 'export', 'import'],
  user: ['read', 'write', 'export'],
  guest: ['read'],
};

// ============================================================================
// Permission Functions
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can perform a specific action
 */
export function canPerformAction(role: Role, action: string): boolean {
  const permission = action as Permission;
  return hasPermission(role, permission);
}

/**
 * Get all available roles
 */
export function getAllRoles(): Role[] {
  return Object.keys(ROLE_PERMISSIONS) as Role[];
}

/**
 * Get all available permissions
 */
export function getAllPermissions(): Permission[] {
  const allPermissions = new Set<Permission>();
  Object.values(ROLE_PERMISSIONS).forEach((permissions) => {
    permissions.forEach((permission) => allPermissions.add(permission));
  });
  return Array.from(allPermissions);
}

/**
 * Resource types for permissions
 */
export type ResourceType =
  | 'project'
  | 'task'
  | 'document'
  | 'user'
  | 'settings'
  | 'backup'
  | 'api';

/**
 * Action types for permissions
 */
export type ActionType =
  | 'read'
  | 'write'
  | 'delete'
  | 'share'
  | 'export'
  | 'import';
