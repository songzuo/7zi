/**
 * Tenant Service
 * 租户管理核心服务
 */

import { db } from '../db'
import { logger } from '../logger'
import {
  Tenant,
  TenantStatus,
  TenantPlan,
  TenantIsolationMode,
  TenantMember,
  TenantMemberRole,
  TenantMemberStatus,
  TenantContext,
  TenantStats,
  TenantQuota,
  CreateTenantRequest,
  UpdateTenantRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
} from './types'

/**
 * 生成唯一ID
 */
function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

/**
 * 生成租户 Slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

/**
 * 租户服务类
 */
export class TenantService {
  /**
   * 创建租户
   */
  async createTenant(
    ownerId: string,
    request: CreateTenantRequest
  ): Promise<Tenant> {
    const id = generateId('tenant')
    const slug = request.slug || generateSlug(request.name)
    
    // 检查 slug 是否已存在
    const existing = await db.get<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [slug]
    )
    
    if (existing) {
      throw new Error(`Tenant slug "${slug}" already exists`)
    }
    
    // 创建租户
    await db.exec(`
      INSERT INTO tenants (
        id, name, slug, plan, status, isolation_mode, settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      request.name,
      slug,
      request.plan || TenantPlan.STARTER,
      TenantStatus.ACTIVE,
      request.isolationMode || TenantIsolationMode.SHARED,
      request.settings ? JSON.stringify(request.settings) : null,
    ])
    
    // 将创建者添加为所有者
    await this.addMember(id, ownerId, TenantMemberRole.OWNER)
    
    // 创建默认订阅
    await this.createDefaultSubscription(id, request.plan || TenantPlan.STARTER)
    
    logger.info('Tenant created', { tenantId: id, ownerId, slug })
    
    return this.getTenant(id) as Promise<Tenant>
  }

  /**
   * 获取租户
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    const row = await db.get<{
      id: string
      name: string
      slug: string
      plan: string
      status: string
      isolation_mode: string
      database_url: string | null
      schema_name: string | null
      settings: string | null
      created_at: string
      updated_at: string
    }>(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    )
    
    if (!row) return null
    
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.plan as TenantPlan,
      status: row.status as TenantStatus,
      isolationMode: row.isolation_mode as TenantIsolationMode,
      databaseUrl: row.database_url || undefined,
      schemaName: row.schema_name || undefined,
      settings: row.settings ? JSON.parse(row.settings) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * 通过 Slug 获取租户
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const row = await db.get<{ id: string }>(
      'SELECT id FROM tenants WHERE slug = ?',
      [slug]
    )
    
    return row ? this.getTenant(row.id) : null
  }

  /**
   * 更新租户
   */
  async updateTenant(
    tenantId: string,
    request: UpdateTenantRequest
  ): Promise<Tenant> {
    const updates: string[] = []
    const params: unknown[] = []
    
    if (request.name !== undefined) {
      updates.push('name = ?')
      params.push(request.name)
    }
    if (request.plan !== undefined) {
      updates.push('plan = ?')
      params.push(request.plan)
    }
    if (request.status !== undefined) {
      updates.push('status = ?')
      params.push(request.status)
    }
    if (request.isolationMode !== undefined) {
      updates.push('isolation_mode = ?')
      params.push(request.isolationMode)
    }
    if (request.settings !== undefined) {
      updates.push('settings = ?')
      params.push(JSON.stringify(request.settings))
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = ?')
      params.push(new Date().toISOString())
      params.push(tenantId)
      
      await db.exec(
        `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
        params
      )
    }
    
    logger.info('Tenant updated', { tenantId, updates: Object.keys(request) })
    
    return this.getTenant(tenantId) as Promise<Tenant>
  }

  /**
   * 删除租户
   */
  async deleteTenant(tenantId: string): Promise<void> {
    // 软删除：更新状态为 deleted
    await db.exec(
      'UPDATE tenants SET status = ?, updated_at = ? WHERE id = ?',
      [TenantStatus.DELETED, new Date().toISOString(), tenantId]
    )
    
    logger.info('Tenant deleted', { tenantId })
  }

  /**
   * 列出租户成员
   */
  async listMembers(tenantId: string): Promise<TenantMember[]> {
    const rows = await db.queryRows<{
      id: string
      tenant_id: string
      user_id: string
      role: string
      status: string
      joined_at: string
    }>(
      'SELECT * FROM tenant_members WHERE tenant_id = ?',
      [tenantId]
    )

    return rows.map((row: {
      id: string
      tenant_id: string
      user_id: string
      role: string
      status: string
      joined_at: string
    }) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      role: row.role as TenantMemberRole,
      status: row.status as TenantMemberStatus,
      joinedAt: new Date(row.joined_at),
    }))
  }

  /**
   * 添加成员
   */
  async addMember(
    tenantId: string,
    userId: string,
    role: TenantMemberRole
  ): Promise<TenantMember> {
    const id = generateId('member')
    
    await db.exec(`
      INSERT INTO tenant_members (id, tenant_id, user_id, role, status)
      VALUES (?, ?, ?, ?, ?)
    `, [id, tenantId, userId, role, TenantMemberStatus.ACTIVE])
    
    // 分配角色
    await this.assignRole(userId, tenantId, role)
    
    logger.info('Member added', { tenantId, userId, role })
    
    return {
      id,
      tenantId,
      userId,
      role,
      status: TenantMemberStatus.ACTIVE,
      joinedAt: new Date(),
    }
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(
    tenantId: string,
    userId: string,
    request: UpdateMemberRoleRequest
  ): Promise<void> {
    await db.exec(
      'UPDATE tenant_members SET role = ? WHERE tenant_id = ? AND user_id = ?',
      [request.role, tenantId, userId]
    )
    
    // 更新角色分配
    await this.revokeAllRoles(userId, tenantId)
    await this.assignRole(userId, tenantId, request.role)
    
    logger.info('Member role updated', { tenantId, userId, role: request.role })
  }

  /**
   * 移除成员
   */
  async removeMember(tenantId: string, userId: string): Promise<void> {
    await db.exec(
      'DELETE FROM tenant_members WHERE tenant_id = ? AND user_id = ?',
      [tenantId, userId]
    )
    
    await this.revokeAllRoles(userId, tenantId)
    
    logger.info('Member removed', { tenantId, userId })
  }

  /**
   * 获取用户所属租户列表
   */
  async listUserTenants(userId: string): Promise<(Tenant & { role: TenantMemberRole })[]> {
    const rows = await db.queryRows<{
      tenant_id: string
      role: string
    }>(
      'SELECT tenant_id, role FROM tenant_members WHERE user_id = ? AND status = ?',
      [userId, TenantMemberStatus.ACTIVE]
    )

    const tenants = await Promise.all(
      rows.map((row: { tenant_id: string; role: string }) => this.getTenant(row.tenant_id))
    )

    return tenants
      .filter((t): t is Tenant => t !== null)
      .map((tenant: Tenant, index: number) => ({
        ...tenant,
        role: rows[index].role as TenantMemberRole,
      }))
  }

  /**
   * 获取租户上下文
   */
  async getTenantContext(
    userId: string,
    tenantId: string
  ): Promise<TenantContext | null> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) return null
    
    const member = await db.get<{ role: string }>(
      'SELECT role FROM tenant_members WHERE tenant_id = ? AND user_id = ?',
      [tenantId, userId]
    )
    
    if (!member) return null
    
    const permissions = await this.getUserPermissions(userId, tenantId)
    
    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantPlan: tenant.plan,
      tenantStatus: tenant.status,
      userId,
      userRole: member.role as TenantMemberRole,
      permissions,
    }
  }

  /**
   * 获取租户统计信息
   */
  async getTenantStats(tenantId: string): Promise<TenantStats> {
    // 获取用户数
    const userCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM tenant_members WHERE tenant_id = ?',
      [tenantId]
    )
    
    // 获取智能体数
    const agentCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM agents WHERE tenant_id = ?',
      [tenantId]
    )
    
    // 获取工作流数
    const workflowCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM workflows WHERE tenant_id = ?',
      [tenantId]
    )
    
    // 获取对话数
    const conversationCount = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM conversations WHERE tenant_id = ?',
      [tenantId]
    )
    
    // 获取本月用量
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    
    const usage = await db.queryRows<{
      resource_type: string
      total_quantity: number
    }>(
      `SELECT resource_type, SUM(quantity) as total_quantity
       FROM usage_records
       WHERE tenant_id = ? AND recorded_at >= ?
       GROUP BY resource_type`,
      [tenantId, monthStart.toISOString()]
    )

    return {
      totalUsers: userCount?.count || 0,
      totalAgents: agentCount?.count || 0,
      totalWorkflows: workflowCount?.count || 0,
      totalConversations: conversationCount?.count || 0,
      storageUsed: 0, // TODO: 实现存储计算
      monthlyUsage: {
        aiCalls: usage.find((u: { resource_type: string }) => u.resource_type === 'ai_calls')?.total_quantity || 0,
        workflowRuns: usage.find((u: { resource_type: string }) => u.resource_type === 'workflow_runs')?.total_quantity || 0,
        storageGB: usage.find((u: { resource_type: string }) => u.resource_type === 'storage')?.total_quantity || 0,
      },
    }
  }

  /**
   * 获取租户配额
   */
  async getTenantQuota(tenantId: string): Promise<TenantQuota> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) throw new Error('Tenant not found')
    
    // 获取计划限制
    const limits = this.getPlanLimits(tenant.plan)
    
    // 获取当前使用量
    const stats = await this.getTenantStats(tenantId)
    
    return {
      maxUsers: limits.maxUsers,
      maxAgents: limits.maxAgents,
      maxWorkflows: limits.maxWorkflows,
      maxStorageGB: limits.maxStorageGB,
      current: {
        users: stats.totalUsers,
        agents: stats.totalAgents,
        workflows: stats.totalWorkflows,
        storageGB: stats.storageUsed,
      },
      remaining: {
        users: Math.max(0, limits.maxUsers - stats.totalUsers),
        agents: Math.max(0, limits.maxAgents - stats.totalAgents),
        workflows: Math.max(0, limits.maxWorkflows - stats.totalWorkflows),
        storageGB: Math.max(0, limits.maxStorageGB - stats.storageUsed),
      },
    }
  }

  /**
   * 分配角色
   */
  private async assignRole(
    userId: string,
    tenantId: string,
    role: TenantMemberRole
  ): Promise<void> {
    const roleId = `role_${role}`
    
    await db.exec(`
      INSERT OR IGNORE INTO user_roles (user_id, role_id, tenant_id)
      VALUES (?, ?, ?)
    `, [userId, roleId, tenantId])
  }

  /**
   * 撤销所有角色
   */
  private async revokeAllRoles(
    userId: string,
    tenantId: string
  ): Promise<void> {
    await db.exec(
      'DELETE FROM user_roles WHERE user_id = ? AND tenant_id = ?',
      [userId, tenantId]
    )
  }

  /**
   * 获取用户权限
   */
  private async getUserPermissions(
    userId: string,
    tenantId: string
  ): Promise<string[]> {
    const rows = await db.queryRows<{ permission_id: string }>(
      `SELECT DISTINCT rp.permission_id
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       WHERE ur.user_id = ? AND ur.tenant_id = ?`,
      [userId, tenantId]
    )

    return rows.map((row: { permission_id: string }) => row.permission_id)
  }

  /**
   * 创建默认订阅
   */
  private async createDefaultSubscription(
    tenantId: string,
    plan: TenantPlan
  ): Promise<void> {
    const id = generateId('sub')
    const planId = `plan_${plan}`
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    
    await db.exec(`
      INSERT INTO subscriptions (
        id, tenant_id, plan_id, status,
        current_period_start, current_period_end
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      id,
      tenantId,
      planId,
      'active',
      now.toISOString(),
      periodEnd.toISOString(),
    ])
  }

  /**
   * 获取计划限制
   */
  private getPlanLimits(plan: TenantPlan): {
    maxUsers: number
    maxAgents: number
    maxWorkflows: number
    maxStorageGB: number
  } {
    switch (plan) {
      case TenantPlan.ENTERPRISE:
        return { maxUsers: 1000, maxAgents: 10000, maxWorkflows: 10000, maxStorageGB: 1000 }
      case TenantPlan.PROFESSIONAL:
        return { maxUsers: 50, maxAgents: 100, maxWorkflows: 200, maxStorageGB: 100 }
      case TenantPlan.STARTER:
      default:
        return { maxUsers: 5, maxAgents: 10, maxWorkflows: 20, maxStorageGB: 10 }
    }
  }
}

// 导出单例
export const tenantService = new TenantService()
