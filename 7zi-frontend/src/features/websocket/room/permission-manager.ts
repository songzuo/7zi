/**
 * Permission Manager - WebSocket 权限管理核心
 * 提供细粒度的权限检查和管理功能
 */

import { PermissionAction, MemberRole, RoomPermission } from './room-model'

export interface PermissionRule {
  role: MemberRole
  action: PermissionAction
  allowed: boolean
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  type: 'time' | 'count' | 'custom'
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq'
  value: unknown
}

export interface PermissionContext {
  userId: string
  roomId: string
  role: MemberRole
  customPermissions?: RoomPermission[]
  metadata?: Record<string, unknown>
}

export class PermissionManager {
  private rules: Map<string, PermissionRule[]> = new Map()

  /**
   * 默认权限规则
   */
  private defaultRules: PermissionRule[] = [
    // Owner 权限
    { role: 'owner', action: 'read', allowed: true },
    { role: 'owner', action: 'write', allowed: true },
    { role: 'owner', action: 'manage', allowed: true },
    { role: 'owner', action: 'moderate', allowed: true },
    { role: 'owner', action: 'invite', allowed: true },
    { role: 'owner', action: 'kick', allowed: true },

    // Admin 权限
    { role: 'admin', action: 'read', allowed: true },
    { role: 'admin', action: 'write', allowed: true },
    { role: 'admin', action: 'manage', allowed: false },
    { role: 'admin', action: 'moderate', allowed: true },
    { role: 'admin', action: 'invite', allowed: true },
    { role: 'admin', action: 'kick', allowed: true },

    // Member 权限
    { role: 'member', action: 'read', allowed: true },
    { role: 'member', action: 'write', allowed: true },
    { role: 'member', action: 'manage', allowed: false },
    { role: 'member', action: 'moderate', allowed: false },
    { role: 'member', action: 'invite', allowed: false },
    { role: 'member', action: 'kick', allowed: false },

    // Guest 权限
    { role: 'guest', action: 'read', allowed: true },
    { role: 'guest', action: 'write', allowed: false },
    { role: 'guest', action: 'manage', allowed: false },
    { role: 'guest', action: 'moderate', allowed: false },
    { role: 'guest', action: 'invite', allowed: false },
    { role: 'guest', action: 'kick', allowed: false },
  ]

  constructor() {
    this.rules.set('default', this.defaultRules)
  }

  /**
   * 检查权限
   */
  checkPermission(context: PermissionContext, action: PermissionAction): boolean {
    // 1. 首先检查自定义权限
    if (context.customPermissions) {
      const customPermission = context.customPermissions.find(p => p.action === action)
      if (customPermission) {
        return customPermission.allowed
      }
    }

    // 2. 获取房间特定规则或默认规则
    const rules = this.rules.get(context.roomId) || this.rules.get('default')!

    // 3. 查找匹配的规则
    const rule = rules.find(r => r.role === context.role && r.action === action)

    if (!rule) {
      return false
    }

    // 4. 检查条件
    if (rule.conditions && !this.checkConditions(rule.conditions, context)) {
      return false
    }

    return rule.allowed
  }

  /**
   * 检查条件
   */
  private checkConditions(conditions: PermissionCondition[], context: PermissionContext): boolean {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'time': {
          const now = new Date()
          const hour = now.getHours()
          const value = condition.value as number

          switch (condition.operator) {
            case 'lt':
              if (hour >= value) return false
              break
            case 'gte':
              if (hour < value) return false
              break
          }
          break
        }

        case 'count': {
          const metadata = context.metadata || {}
          const count = (metadata.messageCount as number) || 0
          const value = condition.value as number

          switch (condition.operator) {
            case 'lt':
              if (count >= value) return false
              break
            case 'gte':
              if (count < value) return false
              break
          }
          break
        }

        case 'custom': {
          // 自定义条件检查
          const metadata = context.metadata || {}
          const customValue = metadata.customCondition
          const value = condition.value

          switch (condition.operator) {
            case 'eq':
              if (customValue !== value) return false
              break
            case 'neq':
              if (customValue === value) return false
              break
          }
          break
        }
      }
    }

    return true
  }

  /**
   * 添加房间特定规则
   */
  addRoomRules(roomId: string, rules: PermissionRule[]): void {
    const existing = this.rules.get(roomId) || []
    this.rules.set(roomId, [...existing, ...rules])
  }

  /**
   * 移除房间规则
   */
  removeRoomRules(roomId: string): void {
    this.rules.delete(roomId)
  }

  /**
   * 获取角色的所有权限
   */
  getRolePermissions(role: MemberRole): Record<PermissionAction, boolean> {
    const rules = this.rules.get('default')!
    const permissions: Record<PermissionAction, boolean> = {
      read: false,
      write: false,
      manage: false,
      moderate: false,
      invite: false,
      kick: false,
    }

    for (const rule of rules) {
      if (rule.role === role) {
        permissions[rule.action] = rule.allowed
      }
    }

    return permissions
  }

  /**
   * 批量检查权限
   */
  checkMultiplePermissions(
    context: PermissionContext,
    actions: PermissionAction[]
  ): Record<PermissionAction, boolean> {
    const result: Record<PermissionAction, boolean> = {} as Record<PermissionAction, boolean>

    for (const action of actions) {
      result[action] = this.checkPermission(context, action)
    }

    return result
  }

  /**
   * 获取权限差异
   */
  getPermissionDifference(
    context1: PermissionContext,
    context2: PermissionContext,
    actions: PermissionAction[]
  ): Record<PermissionAction, { context1: boolean; context2: boolean; difference: boolean }> {
    const result: Record<
      PermissionAction,
      { context1: boolean; context2: boolean; difference: boolean }
    > = {} as Record<PermissionAction, { context1: boolean; context2: boolean; difference: boolean }>

    for (const action of actions) {
      const p1 = this.checkPermission(context1, action)
      const p2 = this.checkPermission(context2, action)

      result[action] = {
        context1: p1,
        context2: p2,
        difference: p1 !== p2,
      }
    }

    return result
  }
}
