/**
 * Permission Format Migration Helper
 * Bridges the gap between legacy string permissions and new enum-based permissions
 */

import { Permission } from '@/lib/permissions/types'

/**
 * Legacy permission format mapping to new Permission enum
 * Maps old string permissions to new enum values
 */
export const LEGACY_TO_NEW_PERMISSIONS: Record<string, Permission> = {
  // User permissions
  'read:profile': Permission.USER_READ,
  'write:users': Permission.USER_CREATE,
  'delete:users': Permission.USER_DELETE,

  // Team permissions
  'manage:team': Permission.TEAM_MANAGE,
  'team:manage': Permission.TEAM_MANAGE,

  // Task permissions
  'read:tasks': Permission.TASK_READ,
  'write:tasks': Permission.TASK_CREATE,
  'update:tasks': Permission.TASK_UPDATE,
  'delete:tasks': Permission.TASK_DELETE,
  'task:batch': Permission.TASK_BATCH,
  'task:assign': Permission.TASK_ASSIGN,

  // Settings permissions
  'settings:read': Permission.SETTINGS_READ,
  'settings:update': Permission.SETTINGS_UPDATE,
  'settings:manage': Permission.SETTINGS_MANAGE,

  // Approval permissions
  'approval:read': Permission.APPROVAL_READ,
  'approval:create': Permission.APPROVAL_CREATE,
  'approval:update': Permission.APPROVAL_UPDATE,
  'approval:delete': Permission.APPROVAL_DELETE,
  'approval:approve': Permission.APPROVAL_APPROVE,
  'approval:reject': Permission.APPROVAL_REJECT,
  'approval:manage': Permission.APPROVAL_MANAGE,

  // Reports permissions
  'access:reports': Permission.REPORTS_VIEW,
  'reports:view': Permission.REPORTS_VIEW,
  'reports:export': Permission.REPORTS_EXPORT,
  'reports:manage': Permission.REPORTS_MANAGE,

  // System permissions
  'manage:system': Permission.SYSTEM_MANAGE,
  'system:manage': Permission.SYSTEM_MANAGE,
  'system:config': Permission.SYSTEM_CONFIG,

  // Logs permissions
  'access:logs': Permission.LOGS_READ,
  'logs:read': Permission.LOGS_READ,
  'logs:export': Permission.LOGS_EXPORT,

  // Agent permissions
  'agent:read': Permission.AGENT_READ,
  'agent:create': Permission.AGENT_CREATE,
  'agent:update': Permission.AGENT_UPDATE,
  'agent:delete': Permission.AGENT_DELETE,
  'agent:manage': Permission.AGENT_MANAGE,
  'agent:execute': Permission.AGENT_EXECUTE,

  // Wallet permissions
  'wallet:read': Permission.WALLET_READ,
  'wallet:manage': Permission.WALLET_MANAGE,
  'wallet:transfer': Permission.WALLET_TRANSFER,
}

/**
 * New Permission enum mapping to legacy string format
 * Reverse mapping for backward compatibility
 */
export const NEW_TO_LEGACY_PERMISSIONS: Record<Permission, string> = Object.fromEntries(
  Object.entries(LEGACY_TO_NEW_PERMISSIONS).map(([legacy, newPerm]) => [newPerm, legacy])
) as Record<Permission, string>

/**
 * Convert legacy string permissions to new Permission enum array
 * Filters out unmapped legacy permissions
 */
export function convertLegacyPermissions(legacyPermissions: string[]): Permission[] {
  return legacyPermissions
    .map(perm => LEGACY_TO_NEW_PERMISSIONS[perm])
    .filter((perm): perm is Permission => perm !== undefined)
}

/**
 * Convert new Permission enum array to legacy string format
 * Useful for backward compatibility with existing code
 */
export function convertPermissionsToLegacy(newPermissions: Permission[]): string[] {
  return newPermissions
    .map(perm => NEW_TO_LEGACY_PERMISSIONS[perm])
    .filter((perm): perm is string => perm !== undefined)
}

/**
 * Normalize permissions to Permission enum format
 * Accepts both legacy strings and Permission enums, returns Permission enum array
 */
export function normalizePermissions(permissions: (string | Permission)[]): Permission[] {
  const result: Permission[] = []

  for (const perm of permissions) {
    if (typeof perm === 'string') {
      // Try to map legacy string to new enum
      const mapped = LEGACY_TO_NEW_PERMISSIONS[perm]
      if (mapped) {
        result.push(mapped)
      } else {
        // Check if it's already a valid Permission enum value as string
        if (Object.values(Permission).includes(perm as Permission)) {
          result.push(perm as Permission)
        }
      }
    } else {
      // Already a Permission enum
      result.push(perm)
    }
  }

  return result
}

/**
 * Check if a permission string is in legacy format
 */
export function isLegacyPermissionFormat(permission: string): boolean {
  return permission.includes(':')
}

/**
 * Check if two permissions are equivalent (one legacy, one new)
 */
export function permissionsAreEquivalent(
  perm1: string | Permission,
  perm2: string | Permission
): boolean {
  const normalized1 = normalizePermissions([perm1])[0]
  const normalized2 = normalizePermissions([perm2])[0]
  return normalized1 === normalized2
}

/**
 * Merge legacy and new permissions, deduplicating equivalent ones
 */
export function mergePermissions(
  legacyPermissions: string[] = [],
  newPermissions: Permission[] = []
): Permission[] {
  const normalizedLegacy = convertLegacyPermissions(legacyPermissions)
  const combined = [...normalizedLegacy, ...newPermissions]
  return Array.from(new Set(combined))
}
