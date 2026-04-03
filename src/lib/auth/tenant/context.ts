/**
 * Tenant Context - 租户上下文隔离
 * 
 * 提供请求级别的租户上下文管理，确保数据隔离和安全访问。
 * 使用 AsyncLocalStorage 实现请求级别的上下文隔离。
 */

import { AsyncLocalStorage } from 'async_hooks'
import type { 
  TenantUserContext, 
  TenantJwtPayload,
  PermissionCheckConfig 
} from './types'
import type { TenantContext, TenantMemberRole, TenantPlan, TenantStatus } from '../../tenant/types'

/**
 * 租户上下文存储
 */
const tenantContextStorage = new AsyncLocalStorage<TenantUserContext>()

/**
 * 租户上下文管理器
 */
export class TenantContextManager {
  /**
   * 在租户上下文中执行函数
   */
  static run<T>(context: TenantUserContext, fn: () => T): T {
    return tenantContextStorage.run(context, fn)
  }

  /**
   * 在租户上下文中执行异步函数
   */
  static async runAsync<T>(context: TenantUserContext, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      tenantContextStorage.run(context, async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  /**
   * 获取当前租户上下文
   */
  static getContext(): TenantUserContext | undefined {
    return tenantContextStorage.getStore()
  }

  /**
   * 获取当前租户上下文（必需）
   * @throws Error 如果没有租户上下文
   */
  static getRequiredContext(): TenantUserContext {
    const context = tenantContextStorage.getStore()
    if (!context) {
      throw new Error('Tenant context is required but not found')
    }
    return context
  }

  /**
   * 获取当前租户 ID
   */
  static getTenantId(): string | undefined {
    return tenantContextStorage.getStore()?.tenantId
  }

  /**
   * 获取当前租户 ID（必需）
   */
  static getRequiredTenantId(): string {
    const tenantId = this.getTenantId()
    if (!tenantId) {
      throw new Error('Tenant ID is required but not found')
    }
    return tenantId
  }

  /**
   * 获取当前用户 ID
   */
  static getUserId(): string | undefined {
    return tenantContextStorage.getStore()?.userId
  }

  /**
   * 获取当前用户角色
   */
  static getTenantRole(): TenantMemberRole | undefined {
    return tenantContextStorage.getStore()?.tenantRole
  }

  /**
   * 检查当前用户是否是租户所有者
   */
  static isOwner(): boolean {
    return tenantContextStorage.getStore()?.isOwner ?? false
  }

  /**
   * 检查当前用户是否是租户管理员
   */
  static isAdmin(): boolean {
    return tenantContextStorage.getStore()?.isAdmin ?? false
  }

  /**
   * 检查当前用户是否有指定权限
   */
  static hasPermission(permission: string): boolean {
    const context = tenantContextStorage.getStore()
    if (!context) return false
    return context.permissions.includes(permission)
  }

  /**
   * 检查当前用户是否有任一指定权限
   */
  static hasAnyPermission(permissions: string[]): boolean {
    const context = tenantContextStorage.getStore()
    if (!context) return false
    return permissions.some(p => context.permissions.includes(p))
  }

  /**
   * 检查当前用户是否有所有指定权限
   */
  static hasAllPermissions(permissions: string[]): boolean {
    const context = tenantContextStorage.getStore()
    if (!context) return false
    return permissions.every(p => context.permissions.includes(p))
  }

  /**
   * 验证权限并抛出错误
   * @throws Error 如果没有权限
   */
  static requirePermission(permission: string): void {
    if (!this.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`)
    }
  }

  /**
   * 验证任意权限并抛出错误
   * @throws Error 如果没有任一权限
   */
  static requireAnyPermission(permissions: string[]): void {
    if (!this.hasAnyPermission(permissions)) {
      throw new Error(`Permission denied: requires one of ${permissions.join(', ')}`)
    }
  }

  /**
   * 验证管理员角色
   * @throws Error 如果不是管理员
   */
  static requireAdmin(): void {
    if (!this.isAdmin()) {
      throw new Error('Admin role required')
    }
  }

  /**
   * 验证所有者角色
   * @throws Error 如果不是所有者
   */
  static requireOwner(): void {
    if (!this.isOwner()) {
      throw new Error('Owner role required')
    }
  }

  /**
   * 创建租户用户上下文
   */
  static createTenantUserContext(
    baseContext: TenantContext,
    email: string,
    permissions: string[]
  ): TenantUserContext {
    const isOwner = baseContext.userRole === 'owner'
    const isAdmin = isOwner || baseContext.userRole === 'admin'

    return {
      userId: baseContext.userId,
      email: email,
      role: baseContext.userRole as any,
      roles: [],
      permissions,
      customPermissions: [],
      tenantId: baseContext.tenantId,
      tenantSlug: baseContext.tenantSlug,
      tenantPlan: baseContext.tenantPlan,
      tenantStatus: baseContext.tenantStatus,
      tenantRole: baseContext.userRole,
      isOwner,
      isAdmin,
    }
  }

  /**
   * 从 JWT Payload 创建租户用户上下文
   */
  static fromJwtPayload(payload: TenantJwtPayload): TenantUserContext {
    const isOwner = payload.tenantRole === 'owner'
    const isAdmin = isOwner || payload.tenantRole === 'admin'

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as any,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      customPermissions: payload.customPermissions || [],
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug,
      tenantPlan: payload.tenantPlan,
      tenantStatus: payload.tenantStatus,
      tenantRole: payload.tenantRole,
      isOwner,
      isAdmin,
    }
  }
}

/**
 * 导出便捷函数
 */
export const getTenantContext = () => TenantContextManager.getContext()
export const getRequiredTenantContext = () => TenantContextManager.getRequiredContext()
export const getTenantId = () => TenantContextManager.getTenantId()
export const getRequiredTenantId = () => TenantContextManager.getRequiredTenantId()
export const getUserId = () => TenantContextManager.getUserId()
export const isTenantOwner = () => TenantContextManager.isOwner()
export const isTenantAdmin = () => TenantContextManager.isAdmin()
export const hasTenantPermission = (permission: string) => TenantContextManager.hasPermission(permission)
export const requireTenantPermission = (permission: string) => TenantContextManager.requirePermission(permission)

export default TenantContextManager
