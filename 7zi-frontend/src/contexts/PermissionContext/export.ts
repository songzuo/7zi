/**
 * Permission Context
 *
 * 基于 RBAC 的权限管理系统
 *
 * @example
 * // 在应用根组件中使用
 * import { PermissionProvider } from '@/contexts/PermissionContext';
 *
 * function App({ children }) {
 *   return (
 *     <PermissionProvider>
 *       {children}
 *     </PermissionProvider>
 *   );
 * }
 *
 * @example
 * // 在组件中使用权限检查
 * import { usePermission, Permission } from '@/contexts/PermissionContext';
 *
 * function MyComponent() {
 *   const { hasPermission, isAdmin } = usePermission();
 *
 *   if (!hasPermission(Permission.WRITE)) {
 *     return <div>无写入权限</div>;
 *   }
 *
 *   return <div>内容</div>;
 * }
 *
 * @example
 * // 使用权限守卫组件
 * import { PermissionGuard, AdminGuard, Permission } from '@/contexts/PermissionContext';
 *
 * function MyComponent() {
 *   return (
 *     <div>
 *       <PermissionGuard permissions={[Permission.WRITE]}>
 *         <button>写入</button>
 *       </PermissionGuard>
 *
 *       <AdminGuard>
 *         <button>管理员操作</button>
 *       </AdminGuard>
 *     </div>
 *   );
 * }
 */

// Context 和 Hook
export {
  PermissionProvider,
  usePermission,
  type PermissionContextType,
} from './index';

// 权限守卫组件
export {
  PermissionGuard,
  AdminGuard,
  RoleGuard,
  type PermissionGuardProps,
  type AdminGuardProps,
  type RoleGuardProps,
} from './components';

// 类型和枚举
export {
  Role,
  Permission,
  type User,
  type CheckPermissionOptions,
  type PermissionCheckResult,
} from './types';

// 工具函数
export {
  getDefaultPermissions,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  checkRole,
  checkIsAdmin,
  checkResourceAccess,
  checkPermissions,
  createUser,
  createUserFromPayload,
} from './utils';
