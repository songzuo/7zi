/**
 * Auth Feature
 * 认证功能模块
 */

// Lib - Select specific exports to avoid conflicts
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getDefaultPermissions,
  UserRole,
} from './lib/auth';

// Types - need to export type for interfaces when isolatedModules is enabled
export type {
  User,
  Credentials,
  Session,
  AuthResult
} from './lib/auth';

// Re-export Permission from auth as AuthPermission to avoid conflict
export { Permission as AuthPermission } from './lib/auth';

// Export permissions module (has its own Permission type)
export * from './lib/permissions';
export * from './lib/jwt';
