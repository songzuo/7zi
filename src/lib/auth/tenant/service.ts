/**
 * Tenant Auth Service - 租户认证统一服务
 * 
 * 整合租户登录、认证、上下文管理等功能
 */

import { db } from '../../db'
import { logger } from '../../logger'
import { tenantService } from '../../tenant/service'
import { TenantContextManager } from './context'
import { 
  generateTenantToken, 
  verifyTenantToken, 
  checkUserPermission 
} from './middleware'
import { crossTenantAccessControl } from './cross-tenant'
import type {
  TenantLoginRequest,
  TenantLoginResponse,
  TenantLoginSuccessResponse,
  TenantLoginFailureResponse,
  TenantUserContext,
  TenantSwitchResponse,
  CrossTenantInviteRequest,
  CrossTenantInviteResponse,
  CrossTenantTransferRequest,
  CrossTenantTransferResponse,
} from './types'
import type { TenantMemberRole } from '../../tenant/types'
import { verifyPassword, getUserByEmail, getUserById, createUserToken, updateLastLogin } from '../auth/repository'
import { UserStatus } from '../auth/types'

/**
 * 租户认证服务
 */
export class TenantAuthService {
  /**
   * 租户登录
   */
  async login(request: TenantLoginRequest): Promise<TenantLoginResponse> {
    try {
      // 1. 查找用户
      const user = await getUserByEmail(request.email)
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
        }
      }

      // 2. 验证用户状态
      if (user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          error: 'Account is not active',
          errorCode: 'USER_INACTIVE',
        }
      }

      // 3. 验证密码
      const isPasswordValid = verifyPassword(request.password, user.password)
      if (!isPasswordValid) {
        logger.info('Login failed: invalid password', { userId: user.id })
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
        }
      }

      // 4. 确定租户
      let tenantId = request.tenantId
      
      if (!tenantId && request.tenantSlug) {
        // 通过 slug 查找租户
        const tenant = await tenantService.getTenantBySlug(request.tenantSlug)
        if (tenant) {
          tenantId = tenant.id
        }
      }

      if (!tenantId) {
        // 如果没有指定租户，获取用户的第一个租户
        const userTenants = await tenantService.listUserTenants(user.id)
        if (userTenants.length === 0) {
          return {
            success: false,
            error: 'User does not belong to any tenant',
            errorCode: 'NO_TENANT',
          }
        }
        tenantId = userTenants[0].id
      }

      // 5. 验证用户在租户中的成员身份
      const tenantContext = await tenantService.getTenantContext(user.id, tenantId)
      if (!tenantContext) {
        return {
          success: false,
          error: 'User is not a member of this tenant',
          errorCode: 'NOT_TENANT_MEMBER',
        }
      }

      // 6. 检查租户状态
      if (tenantContext.tenantStatus !== 'active') {
        return {
          success: false,
          error: 'Tenant is not active',
          errorCode: 'TENANT_INACTIVE',
        }
      }

      // 7. 创建租户用户上下文
      const context = TenantContextManager.createTenantUserContext(
        tenantContext,
        user.email,
        tenantContext.permissions
      )

      // 8. 生成 Token
      const expiresIn = request.rememberMe ? 86400 * 7 : 3600
      const token = await generateTenantToken(context, expiresIn)

      // 9. 创建数据库 Token 记录
      await createUserToken(user.id, expiresIn / 3600)

      // 10. 更新最后登录时间
      await updateLastLogin(user.id)

      logger.info('Tenant login successful', {
        userId: user.id,
        tenantId,
        email: user.email,
      })

      return {
        success: true,
        user: context,
        token,
        refreshToken: '', // 简化处理
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      }
    } catch (error) {
      logger.error('Tenant login failed', { error, email: request.email })
      return {
        success: false,
        error: 'Login failed',
        errorCode: 'LOGIN_ERROR',
      }
    }
  }

  /**
   * 验证 Token 并获取上下文
   */
  async verifyAndGetContext(token: string): Promise<TenantUserContext | null> {
    const context = await verifyTenantToken(token)
    
    if (!context) {
      return null
    }

    // 验证租户状态
    const tenant = await tenantService.getTenant(context.tenantId)
    if (!tenant || tenant.status !== 'active') {
      return null
    }

    // 验证用户在租户中的成员身份并获取最新权限
    const tenantContext = await tenantService.getTenantContext(
      context.userId,
      context.tenantId
    )

    if (!tenantContext) {
      return null
    }

    // 更新权限
    context.permissions = tenantContext.permissions

    return context
  }

  /**
   * 切换租户
   */
  async switchTenant(
    userId: string,
    targetTenantId: string
  ): Promise<TenantSwitchResponse> {
    return crossTenantAccessControl.switchTenant(userId, { targetTenantId })
  }

  /**
   * 邀请用户到租户
   */
  async inviteToTenant(
    inviterContext: TenantUserContext,
    request: CrossTenantInviteRequest
  ): Promise<CrossTenantInviteResponse> {
    return crossTenantAccessControl.inviteToTenant(inviterContext, request)
  }

  /**
   * 接受租户邀请
   */
  async acceptInvite(
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    return crossTenantAccessControl.acceptInvite(userId, token)
  }

  /**
   * 转移用户到其他租户
   */
  async transferUser(
    adminContext: TenantUserContext,
    request: CrossTenantTransferRequest
  ): Promise<CrossTenantTransferResponse> {
    return crossTenantAccessControl.transferUser(adminContext, request)
  }

  /**
   * 获取用户所属的租户列表
   */
  async getUserTenants(userId: string): Promise<TenantUserContext[]> {
    const tenants = await tenantService.listUserTenants(userId)
    const contexts: TenantUserContext[] = []

    for (const tenant of tenants) {
      const tenantContext = await tenantService.getTenantContext(userId, tenant.id)
      if (tenantContext) {
        const user = await getUserById(userId)
        if (user) {
          contexts.push(
            TenantContextManager.createTenantUserContext(
              tenantContext,
              user.email,
              tenantContext.permissions
            )
          )
        }
      }
    }

    return contexts
  }

  /**
   * 获取待处理的租户邀请
   */
  async getPendingInvites(userId: string) {
    return crossTenantAccessControl.getPendingInvites(userId)
  }

  /**
   * 检查用户是否有权限
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    return checkUserPermission(userId, tenantId, resource, action)
  }

  /**
   * 在租户上下文中执行操作
   */
  async runInTenantContext<T>(
    context: TenantUserContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return TenantContextManager.runAsync(context, fn)
  }

  /**
   * 获取当前请求的租户上下文
   */
  getCurrentContext(): TenantUserContext | undefined {
    return TenantContextManager.getContext()
  }

  /**
   * 获取当前请求的租户 ID
   */
  getCurrentTenantId(): string | undefined {
    return TenantContextManager.getTenantId()
  }

  /**
   * 获取当前请求的用户 ID
   */
  getCurrentUserId(): string | undefined {
    return TenantContextManager.getUserId()
  }

  /**
   * 验证当前用户是否有权限
   */
  currentUserHasPermission(permission: string): boolean {
    return TenantContextManager.hasPermission(permission)
  }

  /**
   * 验证当前用户是否有管理员权限
   */
  currentUserIsAdmin(): boolean {
    return TenantContextManager.isAdmin()
  }

  /**
   * 验证当前用户是否有所有者权限
   */
  currentUserIsOwner(): boolean {
    return TenantContextManager.isOwner()
  }
}

// 导出单例
export const tenantAuthService = new TenantAuthService()

export default TenantAuthService