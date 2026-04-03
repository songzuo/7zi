/**
 * v1.12.0 Permission Inheritance & Composition
 * 权限继承和组合机制
 */

import {
  EnhancedRoleDefinition,
  FineGrainedPermission,
  PermissionPolicy,
  RoleInheritance,
} from './types'

/**
 * 继承配置
 */
interface InheritanceConfig {
  /** 最大继承深度 */
  maxDepth: number
  /** 是否允许循环继承检测 */
  detectCycles: boolean
  /** 继承模式默认值 */
  defaultMode: 'extend' | 'restrict' | 'override'
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: InheritanceConfig = {
  maxDepth: 10,
  detectCycles: true,
  defaultMode: 'extend',
}

/**
 * 继承管理器
 */
export class InheritanceManager {
  private config: InheritanceConfig
  private roleCache: Map<string, EnhancedRoleDefinition>
  private permissionCache: Map<string, Set<string>>
  private inheritanceGraph: Map<string, Set<string>>

  constructor(config: Partial<InheritanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.roleCache = new Map()
    this.permissionCache = new Map()
    this.inheritanceGraph = new Map()
  }

  /**
   * 添加继承关系
   */
  addInheritance(
    childRoleId: string,
    parentRoleId: string,
    mode: 'extend' | 'restrict' | 'override' = 'extend'
  ): void {
    if (!this.inheritanceGraph.has(childRoleId)) {
      this.inheritanceGraph.set(childRoleId, new Set())
    }

    const parents = this.inheritanceGraph.get(childRoleId)!
    parents.add(parentRoleId)

    // 检测循环继承
    if (this.config.detectCycles && this.detectCycle(childRoleId, parentRoleId)) {
      throw new Error(`Circular inheritance detected: ${childRoleId} -> ${parentRoleId}`)
    }

    // 清除缓存
    this.clearCache()
  }

  /**
   * 移除继承关系
   */
  removeInheritance(childRoleId: string, parentRoleId: string): void {
    const parents = this.inheritanceGraph.get(childRoleId)
    if (parents) {
      parents.delete(parentRoleId)
    }

    // 清除缓存
    this.clearCache()
  }

  /**
   * 获取所有父角色 (递归)
   */
  getAllParentRoles(roleId: string, depth: number = 0): string[] {
    if (depth > this.config.maxDepth) {
      throw new Error(`Maximum inheritance depth exceeded for role: ${roleId}`)
    }

    const parents = this.inheritanceGraph.get(roleId)
    if (!parents || parents.size === 0) {
      return []
    }

    const result: string[] = []
    for (const parent of parents) {
      result.push(parent)
      result.push(...this.getAllParentRoles(parent, depth + 1))
    }

    return result
  }

  /**
   * 获取所有子角色 (递归)
   */
  getAllChildRoles(roleId: string, depth: number = 0): string[] {
    if (depth > this.config.maxDepth) {
      throw new Error(`Maximum inheritance depth exceeded for role: ${roleId}`)
    }

    const result: string[] = []
    for (const [child, parents] of this.inheritanceGraph.entries()) {
      if (parents.has(roleId)) {
        result.push(child)
        result.push(...this.getAllChildRoles(child, depth + 1))
      }
    }

    return result
  }

  /**
   * 检测循环继承
   */
  private detectCycle(childRoleId: string, parentRoleId: string): boolean {
    const visited = new Set<string>()

    const hasCycle = (current: string): boolean => {
      if (current === parentRoleId && visited.has(current)) {
        return true
      }

      visited.add(current)
      const parents = this.inheritanceGraph.get(current)
      if (parents) {
        for (const parent of parents) {
          if (hasCycle(parent)) {
            return true
          }
        }
      }

      visited.delete(current)
      return false
    }

    return hasCycle(parentRoleId)
  }

  /**
   * 计算角色的所有权限 (包括继承)
   */
  async computeRolePermissions(
    roleId: string,
    allRoles: Map<string, EnhancedRoleDefinition>,
    allPermissions: Map<string, FineGrainedPermission>,
    depth: number = 0
  ): Promise<Set<string>> {
    // 检查缓存
    if (this.permissionCache.has(roleId)) {
      return this.permissionCache.get(roleId)!
    }

    // 检查继承深度
    if (depth > this.config.maxDepth) {
      throw new Error(`Maximum inheritance depth exceeded for role: ${roleId}`)
    }

    const role = allRoles.get(roleId)
    if (!role) {
      return new Set()
    }

    const permissions = new Set<string>(role.permissions)

    // 获取继承关系
    const parentRoleIds = role.inheritsFrom || []
    const parentRoles = parentRoleIds
      .map(id => allRoles.get(id))
      .filter((r): r is EnhancedRoleDefinition => r !== undefined)

    // 处理每个父角色
    for (const parentRole of parentRoles) {
      const inheritanceMode = parentRole.mode || this.config.defaultMode

      // 递归获取父角色的权限
      const parentPermissions = await this.computeRolePermissions(
        parentRole.id,
        allRoles,
        allPermissions,
        depth + 1
      )

      // 根据继承模式处理权限
      switch (inheritanceMode) {
        case 'extend':
          // 扩展模式：合并权限
          parentPermissions.forEach(p => permissions.add(p))
          break

        case 'restrict':
          // 限制模式：只保留共同权限
          const commonPermissions = new Set(
            [...permissions].filter(p => parentPermissions.has(p))
          )
          permissions.clear()
          commonPermissions.forEach(p => permissions.add(p))
          break

        case 'override':
          // 覆盖模式：使用父角色权限
          permissions.clear()
          parentPermissions.forEach(p => permissions.add(p))
          break
      }
    }

    // 处理策略附加的权限
    if (role.policies && role.policies.length > 0) {
      for (const policyId of role.policies) {
        const policy = await this.getPolicyPermissions(policyId, allPermissions)
        policy.forEach(p => permissions.add(p))
      }
    }

    // 缓存结果
    this.permissionCache.set(roleId, permissions)

    return permissions
  }

  /**
   * 获取策略的所有权限
   */
  private async getPolicyPermissions(
    policyId: string,
    allPermissions: Map<string, FineGrainedPermission>
  ): Promise<Set<string>> {
    // 这里应该从数据库获取策略
    // 简化实现：直接从权限映射获取
    const policyPermissions = new Set<string>()
    for (const [id, permission] of allPermissions.entries()) {
      if (permission.metadata?.policyId === policyId) {
        policyPermissions.add(id)
      }
    }
    return policyPermissions
  }

  /**
   * 检查角色继承链中是否存在指定角色
   */
  isInheritedFrom(roleId: string, ancestorRoleId: string): boolean {
    const ancestors = this.getAllParentRoles(roleId)
    return ancestors.includes(ancestorRoleId)
  }

  /**
   * 获取继承路径
   */
  getInheritancePath(roleId: string): string[][] {
    const paths: string[][] = []
    const currentPath: string[] = [roleId]

    const traverse = (current: string) => {
      const parents = this.inheritanceGraph.get(current) || new Set()

      if (parents.size === 0) {
        paths.push([...currentPath])
        return
      }

      for (const parent of parents) {
        currentPath.push(parent)
        traverse(parent)
        currentPath.pop()
      }
    }

    traverse(roleId)
    return paths
  }

  /**
   * 获取继承深度
   */
  getInheritanceDepth(roleId: string): number {
    const ancestors = this.getAllParentRoles(roleId)

    let maxDepth = 0
    const visited = new Set<string>()

    const calculateDepth = (current: string, depth: number): void => {
      if (visited.has(current)) {
        return
      }

      visited.add(current)
      maxDepth = Math.max(maxDepth, depth)

      const parents = this.inheritanceGraph.get(current) || new Set()
      for (const parent of parents) {
        calculateDepth(parent, depth + 1)
      }
    }

    for (const ancestor of ancestors) {
      calculateDepth(ancestor, 1)
    }

    return maxDepth
  }

  /**
   * 验证继承关系
   */
  validateInheritance(
    allRoles: Map<string, EnhancedRoleDefinition>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 1. 检查所有继承关系是否有效
    for (const [childId, parents] of this.inheritanceGraph.entries()) {
      for (const parentId of parents) {
        if (!allRoles.has(parentId)) {
          errors.push(`Parent role ${parentId} does not exist for child ${childId}`)
        }
      }
    }

    // 2. 检查循环继承
    for (const roleId of allRoles.keys()) {
      if (this.detectCycle(roleId, roleId)) {
        errors.push(`Circular inheritance detected for role: ${roleId}`)
      }
    }

    // 3. 检查继承深度
    for (const roleId of allRoles.keys()) {
      try {
        const depth = this.getInheritanceDepth(roleId)
        if (depth > this.config.maxDepth) {
          errors.push(`Inheritance depth ${depth} exceeds maximum ${this.config.maxDepth} for role: ${roleId}`)
        }
      } catch (error) {
        errors.push(`Error calculating inheritance depth for role ${roleId}: ${error}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 获取继承统计
   */
  getInheritanceStats(): {
    totalRoles: number
    totalInheritanceRelations: number
    maxDepth: number
    avgDepth: number
    rolesWithInheritance: number
  } {
    let totalDepth = 0
    let rolesWithInheritance = 0
    let maxDepth = 0

    for (const roleId of this.inheritanceGraph.keys()) {
      const depth = this.getInheritanceDepth(roleId)
      totalDepth += depth
      maxDepth = Math.max(maxDepth, depth)
      if (depth > 0) {
        rolesWithInheritance++
      }
    }

    const totalRelations = Array.from(this.inheritanceGraph.values()).reduce(
      (sum, set) => sum + set.size,
      0
    )

    return {
      totalRoles: this.inheritanceGraph.size,
      totalInheritanceRelations: totalRelations,
      maxDepth,
      avgDepth: rolesWithInheritance > 0 ? totalDepth / rolesWithInheritance : 0,
      rolesWithInheritance,
    }
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.permissionCache.clear()
  }

  /**
   * 重置继承管理器
   */
  reset(): void {
    this.roleCache.clear()
    this.permissionCache.clear()
    this.inheritanceGraph.clear()
  }
}

/**
 * 创建默认继承管理器实例
 */
export function createInheritanceManager(
  config?: Partial<InheritanceConfig>
): InheritanceManager {
  return new InheritanceManager(config)
}

/**
 * 全局默认继承管理器实例
 */
export const defaultInheritanceManager = createInheritanceManager()
