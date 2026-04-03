/**
 * CrossTenantAccessControl - 跨租户访问控制
 * 
 * 提供跨租户邀请、转移和访问许可功能：
 * - 跨租户邀请用户
 * - 跨租户转移用户
 * - 跨租户访问许可管理
 * - 租户切换
 */

import { db } from '../../db'
import { logger } from '../../logger'
import { tenantService } from '../../tenant/service'
import { TenantContextManager } from './context'
import { generateTenantToken } from './middleware'
import type {
  CrossTenantInviteRequest,
  CrossTenantInviteResponse,
  CrossTenantTransferRequest,
  CrossTenantTransferResponse,
  SwitchTenantRequest,
  SwitchTenantResponse,
  CrossTenantPermission,
  TenantInvite,
  TenantUserContext,
} from './types'
import type { TenantMemberRole } from '../../tenant/types'
import crypto from 'crypto'

/**
 * 生成邀请 Token
 */
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 生成唯一 ID
 */
function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

/**
 * 跨租户访问控制服务
 */
export class CrossTenantAccessControl {
  /**
   * 邀请用户到其他租户
   */
  async inviteToTenant(
    inviterContext: TenantUserContext,
    request: CrossTenantInviteRequest
  ): Promise<CrossTenantInviteResponse> {
    try {
      // 验证邀请者权限（需要管理员权限）
      if (!inviterContext.isAdmin) {
        return {
          success: false,
          error: 'Only admins can invite users to other tenants',
        }
      }

      // 验证目标租户
      const targetTenant = await tenantService.getTenant(request.targetTenantId)
      if (!targetTenant) {
        return {
          success: false,
          error: 'Target tenant not found',
        }
      }

      // 检查邀请者是否在目标租户中
      const inviterInTarget = await tenantService.getTenantContext(
        inviterContext.userId,
        request.targetTenantId
      )
      
      if (!inviterInTarget) {
        return {
          success: false,
          error: 'You are not a member of the target tenant',
        }
      }

      // 检查用户是否已在目标租户中
      const existingMember = await db.get<{ id: string }>(
        'SELECT id FROM tenant_members WHERE tenant_id = ? AND user_id = ?',
        [request.targetTenantId, inviterContext.userId]
      )

      if (existingMember) {
        return {
          success: false,
          error: 'User is already a member of this tenant',
        }
      }

      // 创建邀请记录
      const inviteId = generateId('invite')
      const token = generateInviteToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 天有效期

      await db.exec(`
        INSERT INTO tenant_invites (
          id, tenant_id, email, role, invited_by, token, 
          status, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        inviteId,
        request.targetTenantId,
        request.email,
        request.role,
        inviterContext.userId,
        token,
        'pending',
        expiresAt.toISOString(),
        new Date().toISOString(),
      ])

      logger.info('Tenant invite created', {
        inviteId,
        tenantId: request.targetTenantId,
        email: request.email,
        invitedBy: inviterContext.userId,
      })

      // TODO: 发送邀请邮件
      // await this.sendInviteEmail(request.email, token, targetTenant.name)

      return {
        success: true,
        inviteId,
      }
    } catch (error) {
      logger.error('Failed to invite user to tenant', { error, request })
      return {
        success: false,
        error: 'Failed to create invite',
      }
    }
  }

  /**
   * 接受租户邀请
   */
  async acceptInvite(
    userId: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 查找邀请记录
      const invite = await db.get<{
        id: string
        tenant_id: string
        email: string
        role: string
        status: string
        expires_at: string
      }>(
        'SELECT * FROM tenant_invites WHERE token = ? AND status = ?',
        [token, 'pending']
      )

      if (!invite) {
        return {
          success: false,
          error: 'Invalid or expired invite',
        }
      }

      // 检查邀请是否过期
      if (new Date(invite.expires_at) < new Date()) {
        await db.exec(
          'UPDATE tenant_invites SET status = ? WHERE id = ?',
          ['expired', invite.id]
        )
        return {
          success: false,
          error: 'Invite has expired',
        }
      }

      // 获取用户邮箱
      const user = await db.get<{ email: string }>(
        'SELECT email FROM users WHERE id = ?',
        [userId]
      )

      if (!user || user.email !== invite.email) {
        return {
          success: false,
          error: 'Invite email does not match your email',
        }
      }

      // 添加用户到租户
      await tenantService.addMember(
        invite.tenant_id,
        userId,
        invite.role as TenantMemberRole
      )

      // 更新邀请状态
      await db.exec(
        'UPDATE tenant_invites SET status = ?, accepted_at = ? WHERE id = ?',
        ['accepted', new Date().toISOString(), invite.id]
      )

      logger.info('Tenant invite accepted', {
        inviteId: invite.id,
        tenantId: invite.tenant_id,
        userId,
      })

      return { success: true }
    } catch (error) {
      logger.error('Failed to accept tenant invite', { userId, token, error })
      return {
        success: false,
        error: 'Failed to accept invite',
      }
    }
  }

  /**
   * 转移用户到其他租户
   */
  async transferUser(
    adminContext: TenantUserContext,
    request: CrossTenantTransferRequest
  ): Promise<CrossTenantTransferResponse> {
    try {
      // 验证管理员权限（需要在源租户和目标租户都有管理员权限）
      const sourceContext = await tenantService.getTenantContext(
        adminContext.userId,
        request.sourceTenantId
      )
      
      const targetContext = await tenantService.getTenantContext(
        adminContext.userId,
        request.targetTenantId
      )

      if (!sourceContext || !targetContext) {
        return {
          success: false,
          error: 'You must be a member of both source and target tenants',
        }
      }

      if (!adminContext.isAdmin) {
        return {
          success: false,
          error: 'Admin privileges required in both tenants',
        }
      }

      // 验证源租户和目标租户
      const sourceTenant = await tenantService.getTenant(request.sourceTenantId)
      const targetTenant = await tenantService.getTenant(request.targetTenantId)

      if (!sourceTenant || !targetTenant) {
        return {
          success: false,
          error: 'Source or target tenant not found',
        }
      }

      // 检查用户是否在源租户中
      const userInSource = await db.get<{ id: string }>(
        'SELECT id FROM tenant_members WHERE tenant_id = ? AND user_id = ?',
        [request.sourceTenantId, request.userId]
      )

      if (!userInSource) {
        return {
          success: false,
          error: 'User is not a member of the source tenant',
        }
      }

      // 检查用户是否已在目标租户中
      const userInTarget = await db.get<{ id: string }>(
        'SELECT id FROM tenant_members WHERE tenant_id = ? AND user_id = ?',
        [request.targetTenantId, request.userId]
      )

      if (userInTarget) {
        return {
          success: false,
          error: 'User is already a member of the target tenant',
        }
      }

      // 从源租户移除用户
      await tenantService.removeMember(request.sourceTenantId, request.userId)

      // 添加到目标租户
      await tenantService.addMember(
        request.targetTenantId,
        request.userId,
        request.targetRole
      )

      logger.info('User transferred between tenants', {
        userId: request.userId,
        sourceTenantId: request.sourceTenantId,
        targetTenantId: request.targetTenantId,
        targetRole: request.targetRole,
        transferredBy: adminContext.userId,
      })

      return { success: true }
    } catch (error) {
      logger.error('Failed to transfer user', { error, request })
      return {
        success: false,
        error: 'Failed to transfer user',
      }
    }
  }

  /**
   * 切换租户
   */
  async switchTenant(
    userId: string,
    request: SwitchTenantRequest
  ): Promise<SwitchTenantResponse> {
    try {
      // 验证用户在目标租户中的成员身份
      const tenantContext = await tenantService.getTenantContext(
        userId,
        request.targetTenantId
      )

      if (!tenantContext) {
        return {
          success: false,
          error: 'You are not a member of this tenant',
        }
      }

      // 获取用户邮箱
      const user = await db.get<{ email: string }>(
        'SELECT email FROM users WHERE id = ?',
        [userId]
      )

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        }
      }

      // 创建新的租户上下文
      const newContext = TenantContextManager.createTenantUserContext(
        tenantContext,
        user.email,
        tenantContext.permissions
      )

      // 生成新的 Token
      const token = await generateTenantToken(newContext)

      logger.info('Tenant switched', {
        userId,
        targetTenantId: request.targetTenantId,
      })

      return {
        success: true,
        context: newContext,
        token,
      }
    } catch (error) {
      logger.error('Failed to switch tenant', { userId, request, error })
      return {
        success: false,
        error: 'Failed to switch tenant',
      }
    }
  }

  /**
   * 创建跨租户访问许可
   */
  async createCrossTenantPermission(
    adminContext: TenantUserContext,
    targetTenantId: string,
    userId: string,
    permissions: string[],
    expiresAt?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 验证管理员权限
      if (!adminContext.isAdmin) {
        return {
          success: false,
          error: 'Admin privileges required',
        }
      }

      // 验证目标租户
      const targetTenant = await tenantService.getTenant(targetTenantId)
      if (!targetTenant) {
        return {
          success: false,
          error: 'Target tenant not found',
        }
      }

      // 创建许可记录
      const permissionId = generateId('xperm')

      await db.exec(`
        INSERT INTO cross_tenant_permissions (
          id, source_tenant_id, target_tenant_id, user_id,
          permissions, expires_at, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        permissionId,
        adminContext.tenantId,
        targetTenantId,
        userId,
        JSON.stringify(permissions),
        expiresAt?.toISOString() || null,
        new Date().toISOString(),
        adminContext.userId,
      ])

      logger.info('Cross-tenant permission created', {
        permissionId,
        sourceTenantId: adminContext.tenantId,
        targetTenantId,
        userId,
        permissions,
      })

      return { success: true }
    } catch (error) {
      logger.error('Failed to create cross-tenant permission', { error })
      return {
        success: false,
        error: 'Failed to create permission',
      }
    }
  }

  /**
   * 验证跨租户访问许可
   */
  async verifyCrossTenantPermission(
    userId: string,
    sourceTenantId: string,
    targetTenantId: string,
    requiredPermission: string
  ): Promise<boolean> {
    try {
      const permission = await db.get<{
        permissions: string
        expires_at: string | null
      }>(
        `SELECT permissions, expires_at
         FROM cross_tenant_permissions
         WHERE source_tenant_id = ? 
           AND target_tenant_id = ? 
           AND user_id = ?
           AND (expires_at IS NULL OR expires_at > ?)
         LIMIT 1`,
        [
          sourceTenantId,
          targetTenantId,
          userId,
          new Date().toISOString(),
        ]
      )

      if (!permission) {
        return false
      }

      const permissions = JSON.parse(permission.permissions)
      return permissions.includes(requiredPermission) || permissions.includes('*')
    } catch (error) {
      logger.error('Failed to verify cross-tenant permission', { error })
      return false
    }
  }

  /**
   * 撤销跨租户访问许可
   */
  async revokeCrossTenantPermission(
    adminContext: TenantUserContext,
    permissionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 验证权限
      if (!adminContext.isAdmin) {
        return {
          success: false,
          error: 'Admin privileges required',
        }
      }

      // 删除许可
      await db.exec(
        'DELETE FROM cross_tenant_permissions WHERE id = ? AND source_tenant_id = ?',
        [permissionId, adminContext.tenantId]
      )

      logger.info('Cross-tenant permission revoked', {
        permissionId,
        revokedBy: adminContext.userId,
      })

      return { success: true }
    } catch (error) {
      logger.error('Failed to revoke cross-tenant permission', { error })
      return {
        success: false,
        error: 'Failed to revoke permission',
      }
    }
  }

  /**
   * 获取待处理的邀请列表
   */
  async getPendingInvites(userId: string): Promise<TenantInvite[]> {
    try {
      const user = await db.get<{ email: string }>(
        'SELECT email FROM users WHERE id = ?',
        [userId]
      )

      if (!user) {
        return []
      }

      const rows = await db.queryRows<{
        id: string
        tenant_id: string
        email: string
        role: string
        invited_by: string
        token: string
        status: string
        expires_at: string
        created_at: string
        accepted_at: string | null
      }>(
        `SELECT * FROM tenant_invites 
         WHERE email = ? AND status = ? AND expires_at > ?
         ORDER BY created_at DESC`,
        [user.email, 'pending', new Date().toISOString()]
      )

      return rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        email: row.email,
        role: row.role as TenantMemberRole,
        invitedBy: row.invited_by,
        token: row.token,
        status: row.status as any,
        expiresAt: new Date(row.expires_at),
        createdAt: new Date(row.created_at),
        acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
      }))
    } catch (error) {
      logger.error('Failed to get pending invites', { userId, error })
      return []
    }
  }
}

// 导出单例
export const crossTenantAccessControl = new CrossTenantAccessControl()

export default CrossTenantAccessControl