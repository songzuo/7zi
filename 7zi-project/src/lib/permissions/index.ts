/**
 * RBAC System - Role-Based Access Control
 * Fine-grained permission system with multi-role support
 */

export { Permission } from './types';
export { Role } from './types';
export type { PermissionContext, RoleDefinition } from './types';

// Core RBAC functions
export { getRoleDefinition } from './rbac';
export { getPermissionsForRoles } from './rbac';
export { hasRolePermission } from './rbac';
export { hasPermission } from './rbac';
export { hasAnyPermission } from './rbac';
export { hasAllPermissions } from './rbac';
export { hasRole } from './rbac';
export { hasAnyRole } from './rbac';
export { hasAllRoles } from './rbac';

// Middleware
export { withRole } from './middleware';
export { withAnyRole } from './middleware';
export { withAllRoles } from './middleware';
export { withPermissions } from './middleware';
export { withAnyPermission } from './middleware';

// Database
export { initializeRbacTables } from './repository';
export { getAllRoles } from './repository';
export { getAllPermissions } from './repository';
export { getPermissionsByRole } from './repository';
export { assignPermissionsToRole } from './repository';
export { removePermissionsFromRole } from './repository';
export { addRolesToUser } from './repository';
export { removeRolesFromUser } from './repository';
export { getUserRoles } from './repository';

// Seeding
export { seedDefaultRolesAndPermissions } from './seed';
