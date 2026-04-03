/**
 * Multi-Tenant Authentication Types
 * 租户认证相关类型定义
 */

import type { UserContext } from '../../auth/types'
import type { TenantContext, TenantMemberRole, TenantPlan, TenantStatus } from '../tenant/types'

/**
 * 扩展的用户上下文（包含租户信息）
 */
export interface TenantUserContext extends UserContext {
  tenantId: string
  tenantSlug: string
  tenantPlan: TenantPlan
  tenantStatus: TenantStatus
  tenantRole: TenantMemberRole
  isOwner: boolean
  isAdmin: boolean
}

/**
 * JWT Token Payload（扩展支持租户）
 */
export interface TenantJwtPayload extends Omit<UserContext, 'role' | 'roles' | 'permissions'> {
  tenantId: string
  tenantSlug: string
  tenantPlan: TenantPlan
  tenantRole: TenantMemberRole
  roles?: string[]
  permissions?: string[]
}

/**
 * 租户登录请求
 */
export interface TenantLoginRequest {
  email: string
  password: string
  tenantId?: string
  tenantSlug?: string
  rememberMe?: boolean
}

/**
 * 租户登录响应
 */
export interface TenantLoginSuccessResponse {
  success: true
  user: TenantUserContext
  token: string
  refreshToken: string
  expiresAt: Date
}

/**
 * 租户登录失败响应
 */
export interface TenantLoginFailureResponse {
  success: false
  error: string
  errorCode?: string
}

/**
 * 租户登录响应类型
 */
export type TenantLoginResponse = TenantLoginSuccessResponse | TenantLoginFailureResponse

/**
 * 跨租户邀请请求
 */
export interface CrossTenantInviteRequest {
  targetTenantId: string
  email: string
  role: TenantMemberRole
  message?: string
}

/**
 * 跨租户邀请响应
 */
export interface CrossTenantInviteResponse {
  success: boolean
  inviteId?: string
  error?: string
}

/**
 * 跨租户转移请求
 */
export interface CrossTenantTransferRequest {
  userId: string
  sourceTenantId: string
  targetTenantId: string
  targetRole: TenantMemberRole
}

/**
 * 跨租户转移响应
 */
export interface CrossTenantTransferResponse {
  success: boolean
  error?: string
}

/**
 * 租户切换请求
 */
export interface SwitchTenantRequest {
  targetTenantId: string
}

/**
 * 租户切换响应
 */
export interface SwitchTenantResponse {
  success: boolean
  context?: TenantUserContext
  token?: string
  error?: string
}

/**
 * 租户认证中间件配置
 */
export interface TenantAuthConfig {
  required: boolean
  allowPublic?: boolean
  allowedTenants?: string[]
  requireActiveTenant?: boolean
}

/**
 * 权限检查配置
 */
export interface PermissionCheckConfig {
  resource: string
  action: 'read' | 'write' | 'delete' | 'execute' | '*'
  tenantId?: string
}

/**
 * 跨租户访问许可
 */
export interface CrossTenantPermission {
  id: string
  sourceTenantId: string
  targetTenantId: string
  userId: string
  permissions: string[]
  expiresAt?: Date
  createdAt: Date
  createdBy: string
}

/**
 * 租户邀请记录
 */
export interface TenantInvite {
  id: string
  tenantId: string
  email: string
  role: TenantMemberRole
  invitedBy: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expiresAt: Date
  createdAt: Date
  acceptedAt?: Date
}

/**
 * API 响应类型别名
 */
export type TenantSwitchResponseType = SwitchTenantResponse
export type TenantAuthResponseType = TenantLoginResponse
export type CrossTenantInviteResponseType = CrossTenantInviteResponse
export type CrossTenantTransferResponseType = CrossTenantTransferResponse