/**
 * Permission Inheritance - Role Permission Inheritance System
 *
 * 提供权限继承和覆盖机制：
 * - 计算角色的继承权限
 * - 检查权限覆盖规则
 * - 支持角色层级
 * - 权限合并和优先级
 */

import { Permission, Role, RoleDefinition } from '@/lib/permissions/types';
import { logger } from '@/lib/logger';
import { DEFAULT_ROLE_DEFINITIONS, getRoleDefinition } from '@/lib/permissions/rbac';

/**
 * 权限继承策略
 */
export enum InheritanceStrategy {
  UNION = 'union', // 并集：合并所有权限
  INTERSECTION = 'intersection', // 交集：只保留共同权限
  OVERRIDE = 'override', // 覆盖：高优先级覆盖低优先级
}

/**
 * 权限覆盖规则
 */
export interface PermissionOverride {
  permission: Permission;
  override: boolean; // true = 允许，false = 拒绝
  priority: number; // 优先级，数值越大越高
  reason?: string;
}

/**
 * 权限继承结果
 */
export interface InheritanceResult {
  permissions: Permission[];
  overridden: Map<Permission, PermissionOverride>;
  sources: Map<Permission, string[]>; // 权限来源（角色ID）
  conflicts: Permission[]; // 冲突的权限
}

/**
 * 角色层级配置
 * 数字越大，权限级别越高
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.ADMIN]: 100,
  [Role.MANAGER]: 80,
  [Role.MEMBER]: 50,
  [Role.VIEWER]: 30,
  [Role.GUEST]: 10,
};

/**
 * 权限继承类
 */
export class PermissionInheritance {
  /**
   * 获取角色层级
   */
  getRoleLevel(role: Role): number {
    return ROLE_HIERARCHY[role] ?? 0;
  }

  /**
   * 比较角色优先级
   */
  compareRoles(roleA: Role, roleB: Role): number {
    return this.getRoleLevel(roleA) - this.getRoleLevel(roleB);
  }

  /**
   * 检查 roleA 是否比 roleB 级别高
   */
  isHigherRole(roleA: Role, roleB: Role): boolean {
    return this.compareRoles(roleA, roleB) > 0;
  }

  /**
   * 检查 roleA 是否比 roleB 级别低
   */
  isLowerRole(roleA: Role, roleB: Role): boolean {
    return this.compareRoles(roleA, roleB) < 0;
  }

  /**
   * 检查权限覆盖
   *
   * 规则：
   * 1. 高优先级的权限覆盖低优先级
   * 2. 明确的拒绝（false）覆盖允许（true）
   * 3. 相同优先级下，allow 优先于 deny
   *
   * @param base 基础权限覆盖
   * @param override 覆盖的权限
   * @returns 是否应该被覆盖
   */
  checkOverride(base: PermissionOverride, override: PermissionOverride): boolean {
    // 1. 优先级比较
    if (override.priority > base.priority) {
      // 高优先级总是覆盖低优先级
      return true;
    }

    if (override.priority < base.priority) {
      // 低优先级不覆盖高优先级
      return false;
    }

    // 2. 相同优先级，检查覆盖值
    // 明确的拒绝（false）覆盖允许（true）
    if (!override.override && base.override) {
      return true;
    }

    // 3. 其他情况不覆盖
    return false;
  }

  /**
   * 计算继承权限
   *
   * @param role 角色
   * @param strategy 继承策略（默认 UNION）
   * @returns 继承的权限
   */
  calculateInheritedPermissions(
    role: Role,
    strategy: InheritanceStrategy = InheritanceStrategy.UNION
  ): InheritanceResult {
    const roleDef = getRoleDefinition(role);

    if (!roleDef) {
      logger.warn(`[PermissionInheritance] Role definition not found: ${role}`);
      return {
        permissions: [],
        overridden: new Map(),
        sources: new Map(),
        conflicts: [],
      };
    }

    const result: InheritanceResult = {
      permissions: [],
      overridden: new Map(),
      sources: new Map(),
      conflicts: [],
    };

    // 获取角色的所有权限
    let permissions: Permission[] = [...roleDef.permissions];

    // 根据策略处理权限
    switch (strategy) {
      case InheritanceStrategy.UNION:
        // 并集策略：合并所有权限（已默认实现）
        // 填充权限来源
        for (const perm of permissions) {
          result.sources.set(perm, [role]);
        }
        break;

      case InheritanceStrategy.INTERSECTION:
        // 交集策略：需要比较多个角色
        // 这里简化为返回当前角色权限
        break;

      case InheritanceStrategy.OVERRIDE:
        // 覆盖策略：高优先级角色覆盖低优先级
        const allRoles = Object.values(Role)
          .sort((a, b) => this.getRoleLevel(b) - this.getRoleLevel(a)); // 从高到低

        const permissionOverrides: Map<Permission, PermissionOverride> = new Map();

        for (const r of allRoles) {
          const rDef = getRoleDefinition(r);
          if (!rDef) continue;

          const priority = this.getRoleLevel(r);

          for (const perm of rDef.permissions) {
            const override: PermissionOverride = {
              permission: perm,
              override: true,
              priority,
            };

            const existing = permissionOverrides.get(perm);
            if (existing) {
              // 检查是否应该覆盖
              if (this.checkOverride(existing, override)) {
                permissionOverrides.set(perm, override);
                result.overridden.set(perm, override);
              }
            } else {
              permissionOverrides.set(perm, override);
            }

            // 记录来源
            const sources = result.sources.get(perm) ?? [];
            sources.push(r);
            result.sources.set(perm, sources);
          }
        }

        // 只保留最终有效的权限
        permissions = Array.from(permissionOverrides.keys());
        break;

      default:
        logger.warn(`[PermissionInheritance] Unknown strategy: ${strategy}`);
    }

    // 检测权限冲突（如果需要）
    this.detectConflicts(permissions, result);

    result.permissions = permissions;

    return result;
  }

  /**
   * 计算多个角色的继承权限
   *
   * @param roles 角色数组
   * @param strategy 继承策略
   * @returns 继承的权限
   */
  calculatePermissionsForRoles(
    roles: Role[],
    strategy: InheritanceStrategy = InheritanceStrategy.UNION
  ): InheritanceResult {
    const result: InheritanceResult = {
      permissions: [],
      overridden: new Map(),
      sources: new Map(),
      conflicts: [],
    };

    if (roles.length === 0) {
      return result;
    }

    // 获取所有权限
    const allPermissions: Map<Permission, Set<string>> = new Map();

    for (const role of roles) {
      const roleDef = getRoleDefinition(role);
      if (!roleDef) continue;

      for (const perm of roleDef.permissions) {
        const sources = allPermissions.get(perm) ?? new Set();
        sources.add(role);
        allPermissions.set(perm, sources);
      }
    }

    // 根据策略合并
    switch (strategy) {
      case InheritanceStrategy.UNION:
        // 并集：所有权限
        result.permissions = Array.from(allPermissions.keys());
        break;

      case InheritanceStrategy.INTERSECTION:
        // 交集：所有角色都有的权限
        result.permissions = Array.from(allPermissions.entries())
          .filter(([_, sources]) => sources.size === roles.length)
          .map(([perm]) => perm);
        break;

      case InheritanceStrategy.OVERRIDE:
        // 覆盖：高优先级角色优先
        const sortedRoles = [...roles].sort((a, b) => this.getRoleLevel(b) - this.getRoleLevel(a));

        const permissionOverrides: Map<Permission, PermissionOverride> = new Map();

        for (const role of sortedRoles) {
          const roleDef = getRoleDefinition(role);
          if (!roleDef) continue;

          const priority = this.getRoleLevel(role);

          for (const perm of roleDef.permissions) {
            const override: PermissionOverride = {
              permission: perm,
              override: true,
              priority,
            };

            const existing = permissionOverrides.get(perm);
            if (existing) {
              if (this.checkOverride(existing, override)) {
                permissionOverrides.set(perm, override);
                result.overridden.set(perm, override);
              }
            } else {
              permissionOverrides.set(perm, override);
            }

            // 记录来源
            const sources = result.sources.get(perm) ?? [];
            sources.push(role);
            result.sources.set(perm, sources);
          }
        }

        result.permissions = Array.from(permissionOverrides.keys());
        break;
    }

    // 记录所有权限来源
    for (const [perm, sources] of allPermissions.entries()) {
      if (!result.sources.has(perm)) {
        result.sources.set(perm, Array.from(sources));
      }
    }

    // 检测冲突
    this.detectConflicts(result.permissions, result);

    return result;
  }

  /**
   * 检测权限冲突
   */
  private detectConflicts(permissions: Permission[], result: InheritanceResult): void {
    // 检查是否有相互冲突的权限
    // 例如：user:read 和 user:delete 可能需要在某些场景下被视为冲突

    // 这里实现一个简单的冲突检测逻辑
    // 如果同一个资源有不同的操作权限，且这些操作在实际中可能冲突

    const resourceMap: Map<string, Permission[]> = new Map();

    for (const perm of permissions) {
      const [resource] = perm.split(':');
      const resourcePerms = resourceMap.get(resource) ?? [];
      resourcePerms.push(perm);
      resourceMap.set(resource, resourcePerms);
    }

    // 检查资源级别的冲突
    for (const [resource, perms] of resourceMap.entries()) {
      if (perms.length > 1) {
        // 如果一个资源有多个权限，标记为潜在冲突
        // 实际应用中可能需要更复杂的规则
        result.conflicts.push(...perms);
      }
    }
  }

  /**
   * 应用权限覆盖规则
   *
   * @param permissions 原始权限列表
   * @param overrides 覆盖规则
   * @returns 应用覆盖后的权限
   */
  applyPermissionOverrides(
    permissions: Permission[],
    overrides: PermissionOverride[]
  ): Permission[] {
    const overrideMap = new Map<Permission, PermissionOverride>();

    // 构建覆盖规则映射
    for (const override of overrides) {
      const existing = overrideMap.get(override.permission);
      if (existing) {
        // 检查是否应该覆盖
        if (this.checkOverride(existing, override)) {
          overrideMap.set(override.permission, override);
        }
      } else {
        overrideMap.set(override.permission, override);
      }
    }

    // 应用覆盖规则
    const result: Permission[] = [];
    const handledPermissions = new Set<Permission>();

    // 首先处理原始权限
    for (const perm of permissions) {
      const override = overrideMap.get(perm);

      if (override) {
        // 有覆盖规则
        if (override.override) {
          // 允许
          result.push(perm);
        }
        // 否则（拒绝），不添加到结果中
      } else {
        // 无覆盖规则，保留原权限
        result.push(perm);
      }
      handledPermissions.add(perm);
    }

    // 添加覆盖规则中新增的权限（如果允许）
    for (const [perm, override] of overrideMap.entries()) {
      if (!handledPermissions.has(perm) && override.override) {
        // 这是一个新的权限，且被允许
        result.push(perm);
      }
    }

    return result;
  }

  /**
   * 检查权限是否被允许
   *
   * @param permission 权限
   * @param overrides 覆盖规则
   * @returns 是否允许
   */
  isPermissionAllowed(permission: Permission, overrides: PermissionOverride[]): boolean {
    // 找到相关的覆盖规则
    const relevantOverrides = overrides.filter(o => o.permission === permission);

    if (relevantOverrides.length === 0) {
      // 没有覆盖规则，默认允许
      return true;
    }

    // 找到最高优先级的覆盖规则
    const sortedOverrides = [...relevantOverrides].sort((a, b) => b.priority - a.priority);
    const topOverride = sortedOverrides[0];

    return topOverride.override;
  }

  /**
   * 获取角色的所有子角色（更低层级的角色）
   */
  getSubRoles(role: Role): Role[] {
    const level = this.getRoleLevel(role);
    return Object.values(Role).filter(r => this.getRoleLevel(r) < level);
  }

  /**
   * 获取角色的所有父角色（更高层级的角色）
   */
  getParentRoles(role: Role): Role[] {
    const level = this.getRoleLevel(role);
    return Object.values(Role).filter(r => this.getRoleLevel(r) > level);
  }
}

/**
 * 创建默认的权限继承实例
 */
export const permissionInheritance = new PermissionInheritance();

/**
 * 便捷函数：计算继承权限
 */
export function calculateInheritedPermissions(
  role: Role,
  strategy: InheritanceStrategy = InheritanceStrategy.UNION
): InheritanceResult {
  return permissionInheritance.calculateInheritedPermissions(role, strategy);
}

/**
 * 便捷函数：计算多个角色的权限
 */
export function calculatePermissionsForRoles(
  roles: Role[],
  strategy: InheritanceStrategy = InheritanceStrategy.UNION
): InheritanceResult {
  return permissionInheritance.calculatePermissionsForRoles(roles, strategy);
}

/**
 * 便捷函数：检查权限覆盖
 */
export function checkOverride(base: PermissionOverride, override: PermissionOverride): boolean {
  return permissionInheritance.checkOverride(base, override);
}

/**
 * 便捷函数：应用权限覆盖
 */
export function applyPermissionOverrides(
  permissions: Permission[],
  overrides: PermissionOverride[]
): Permission[] {
  return permissionInheritance.applyPermissionOverrides(permissions, overrides);
}

/**
 * 便捷函数：获取子角色
 */
export function getSubRoles(role: Role): Role[] {
  return permissionInheritance.getSubRoles(role);
}

/**
 * 便捷函数：获取父角色
 */
export function getParentRoles(role: Role): Role[] {
  return permissionInheritance.getParentRoles(role);
}
