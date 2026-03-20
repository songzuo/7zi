/**
 * RBAC Core Functions
 * Core role-based access control logic
 */

import {
  Role,
  Permission,
  RoleDefinition,
  PermissionContext,
  PermissionCheckResult,
  PermissionAction,
  ParsedPermission,
} from './types';

// Re-export types for convenience
export type {
  RoleDefinition,
  PermissionContext,
  PermissionCheckResult,
  PermissionAction,
  ParsedPermission,
};

export { Role, Permission };

/**
 * Default role definitions with their permissions
 */
const DEFAULT_ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  [Role.GUEST]: {
    id: Role.GUEST,
    name: 'Guest',
    description: 'Limited guest access',
    permissions: [],
    isSystem: true,
  },
  [Role.ADMIN]: {
    id: Role.ADMIN,
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: [
      // User permissions
      Permission.USER_READ,
      Permission.USER_CREATE,
      Permission.USER_UPDATE,
      Permission.USER_DELETE,
      Permission.USER_MANAGE_ROLE,
      // Team permissions
      Permission.TEAM_READ,
      Permission.TEAM_CREATE,
      Permission.TEAM_UPDATE,
      Permission.TEAM_DELETE,
      Permission.TEAM_ADD_MEMBER,
      Permission.TEAM_REMOVE_MEMBER,
      Permission.TEAM_MANAGE,
      // Task permissions
      Permission.TASK_READ,
      Permission.TASK_CREATE,
      Permission.TASK_UPDATE,
      Permission.TASK_DELETE,
      Permission.TASK_BATCH,
      Permission.TASK_ASSIGN,
      // Settings permissions
      Permission.SETTINGS_READ,
      Permission.SETTINGS_UPDATE,
      Permission.SETTINGS_MANAGE,
      // Approval permissions
      Permission.APPROVAL_READ,
      Permission.APPROVAL_CREATE,
      Permission.APPROVAL_UPDATE,
      Permission.APPROVAL_DELETE,
      Permission.APPROVAL_APPROVE,
      Permission.APPROVAL_REJECT,
      Permission.APPROVAL_MANAGE,
      // Reports permissions
      Permission.REPORTS_EXPORT,
      Permission.REPORTS_VIEW,
      Permission.REPORTS_MANAGE,
      // System permissions
      Permission.SYSTEM_READ,
      Permission.SYSTEM_MANAGE,
      Permission.SYSTEM_CONFIG,
      // Logs permissions
      Permission.LOGS_READ,
      Permission.LOGS_EXPORT,
      // AI Agent permissions
      Permission.AGENT_READ,
      Permission.AGENT_CREATE,
      Permission.AGENT_UPDATE,
      Permission.AGENT_DELETE,
      Permission.AGENT_MANAGE,
      Permission.AGENT_EXECUTE,
      // Wallet permissions
      Permission.WALLET_READ,
      Permission.WALLET_MANAGE,
      Permission.WALLET_TRANSFER,
    ],
    isSystem: true,
  },
  [Role.MANAGER]: {
    id: Role.MANAGER,
    name: 'Manager',
    description: 'Managerial access to team, tasks, and reports',
    permissions: [
      // User permissions (limited)
      Permission.USER_READ,
      Permission.USER_UPDATE,
      // Team permissions
      Permission.TEAM_READ,
      Permission.TEAM_CREATE,
      Permission.TEAM_UPDATE,
      Permission.TEAM_ADD_MEMBER,
      Permission.TEAM_REMOVE_MEMBER,
      Permission.TEAM_MANAGE,
      // Task permissions
      Permission.TASK_READ,
      Permission.TASK_CREATE,
      Permission.TASK_UPDATE,
      Permission.TASK_DELETE,
      Permission.TASK_BATCH,
      Permission.TASK_ASSIGN,
      // Settings permissions (limited)
      Permission.SETTINGS_READ,
      Permission.SETTINGS_UPDATE,
      // Approval permissions
      Permission.APPROVAL_READ,
      Permission.APPROVAL_CREATE,
      Permission.APPROVAL_UPDATE,
      Permission.APPROVAL_APPROVE,
      Permission.APPROVAL_REJECT,
      // Reports permissions
      Permission.REPORTS_EXPORT,
      Permission.REPORTS_VIEW,
      // System permissions (read-only)
      Permission.SYSTEM_READ,
      // AI Agent permissions
      Permission.AGENT_READ,
      Permission.AGENT_CREATE,
      Permission.AGENT_UPDATE,
      Permission.AGENT_DELETE,
      Permission.AGENT_EXECUTE,
      // Wallet permissions (limited)
      Permission.WALLET_READ,
    ],
    isSystem: true,
  },
  [Role.MEMBER]: {
    id: Role.MEMBER,
    name: 'Member',
    description: 'Standard team member with task and basic access',
    permissions: [
      // User permissions (self-only)
      Permission.USER_READ,
      // Team permissions (read-only)
      Permission.TEAM_READ,
      // Task permissions
      Permission.TASK_READ,
      Permission.TASK_CREATE,
      Permission.TASK_UPDATE,
      Permission.TASK_ASSIGN,
      // Settings permissions (none)
      // Approval permissions
      Permission.APPROVAL_READ,
      Permission.APPROVAL_CREATE,
      Permission.APPROVAL_UPDATE,
      // Reports permissions (view only)
      Permission.REPORTS_VIEW,
      // AI Agent permissions (limited)
      Permission.AGENT_READ,
      Permission.AGENT_EXECUTE,
    ],
    isSystem: true,
  },
  [Role.VIEWER]: {
    id: Role.VIEWER,
    name: 'Viewer',
    description: 'Read-only access to most resources',
    permissions: [
      // User permissions (read self)
      Permission.USER_READ,
      // Team permissions
      Permission.TEAM_READ,
      // Task permissions
      Permission.TASK_READ,
      // Approval permissions
      Permission.APPROVAL_READ,
      // Reports permissions
      Permission.REPORTS_VIEW,
      // AI Agent permissions
      Permission.AGENT_READ,
    ],
    isSystem: true,
  },
};

/**
 * Get role definition by role enum
 */
export function getRoleDefinition(role: Role): RoleDefinition | null {
  return DEFAULT_ROLE_DEFINITIONS[role] || null;
}

/**
 * Get all role definitions
 */
export function getAllRoleDefinitions(): RoleDefinition[] {
  return Object.values(DEFAULT_ROLE_DEFINITIONS);
}

/**
 * Get permissions for multiple roles (union of all permissions)
 */
export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const uniquePermissions = new Set<Permission>();

  for (const role of roles) {
    const roleDef = getRoleDefinition(role);
    if (roleDef) {
      roleDef.permissions.forEach((p) => uniquePermissions.add(p));
    }
  }

  return Array.from(uniquePermissions);
}

/**
 * Check if a role has a specific permission
 */
export function hasRolePermission(role: Role, permission: Permission): boolean {
  const roleDef = getRoleDefinition(role);
  if (!roleDef) return false;
  return roleDef.permissions.includes(permission);
}

/**
 * Check if user has permission (from permission context)
 */
export function hasPermission(context: PermissionContext, requiredPermission: Permission): boolean {
  // Check if permission exists in computed permissions
  if (context.permissions.includes(requiredPermission)) {
    return true;
  }

  // Check custom permissions
  if (context.customPermissions?.includes(requiredPermission)) {
    return true;
  }

  return false;
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(context: PermissionContext, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.some((p) => hasPermission(context, p));
}

/**
 * Check if user has all required permissions
 */
export function hasAllPermissions(context: PermissionContext, requiredPermissions: Permission[]): PermissionCheckResult {
  const missingPermissions: Permission[] = [];

  for (const permission of requiredPermissions) {
    if (!hasPermission(context, permission)) {
      missingPermissions.push(permission);
    }
  }

  return {
    allowed: missingPermissions.length === 0,
    missingPermissions: missingPermissions.length > 0 ? missingPermissions : undefined,
    reason: missingPermissions.length > 0
      ? `Missing permissions: ${missingPermissions.join(', ')}`
      : undefined,
  };
}

/**
 * Check if user has a specific role
 */
export function hasRole(context: PermissionContext, requiredRole: Role): boolean {
  return context.roles.includes(requiredRole);
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(context: PermissionContext, requiredRoles: Role[]): boolean {
  return requiredRoles.some((role) => context.roles.includes(role));
}

/**
 * Check if user has all required roles
 */
export function hasAllRoles(context: PermissionContext, requiredRoles: Role[]): boolean {
  return requiredRoles.every((role) => context.roles.includes(role));
}

/**
 * Check if user has admin role (convenience function)
 */
export function isAdmin(context: PermissionContext): boolean {
  return hasRole(context, Role.ADMIN);
}

/**
 * Check if user has manager or admin role
 */
export function isManagerOrAdmin(context: PermissionContext): boolean {
  return hasAnyRole(context, [Role.ADMIN, Role.MANAGER]);
}

/**
 * Check if user has member or higher role
 */
export function isMemberOrHigher(context: PermissionContext): boolean {
  return hasAnyRole(context, [Role.ADMIN, Role.MANAGER, Role.MEMBER]);
}

/**
 * Check if user has guest role
 */
export function isGuest(context: PermissionContext): boolean {
  return hasRole(context, Role.GUEST);
}

/**
 * Parse permission string into resource and action
 */
export function parsePermission(permission: Permission): ParsedPermission {
  const [resource, action] = permission.split(':');
  return {
    resource,
    action: action as PermissionAction,
  };
}

/**
 * Check if permission matches a pattern (wildcard support)
 */
export function matchesPermissionPattern(permission: Permission, pattern: string): boolean {
  if (pattern === '*:*') return true;

  const [pResource, pAction] = pattern.split(':');
  const [resource, action] = permission.split(':');

  const resourceMatch = pResource === '*' || pResource === resource;
  const actionMatch = pAction === '*' || pAction === action;

  return resourceMatch && actionMatch;
}

/**
 * Get all permissions for a resource
 */
export function getPermissionsForResource(resource: string): Permission[] {
  return Object.values(Permission).filter((p) => p.startsWith(`${resource}:`));
}

/**
 * Get all permissions for an action
 */
export function getPermissionsForAction(action: PermissionAction): Permission[] {
  return Object.values(Permission).filter((p) => p.endsWith(`:${action}`));
}

/**
 * Create permission context from user data
 */
export function createPermissionContext(
  userId: string,
  roles: Role[],
  customPermissions?: Permission[]
): PermissionContext {
  return {
    userId,
    roles,
    permissions: getPermissionsForRoles(roles),
    customPermissions,
  };
}
