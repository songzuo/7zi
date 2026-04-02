/**
 * Unified Authentication Types
 * Combines basic auth types with enhanced RBAC support
 * Maintains backward compatibility while supporting multi-role systems
 */

import { Permission, Role } from '@/lib/permissions/types'

/**
 * User status
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  DELETED = 'deleted',
}

/**
 * User role (legacy single role - maintained for backward compatibility)
 * @deprecated Use roles array instead for multi-role support
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  GUEST = 'guest',
}

/**
 * User entity (with multi-role support)
 */
export interface User {
  id: string
  email: string
  password: string // Hashed
  name: string
  avatar?: string
  role: UserRole // Primary role (for backward compatibility)
  roles: Role[] // Multiple roles (new RBAC system)
  status: UserStatus
  permissions: string[] // Computed permissions from roles
  customPermissions?: string[] // Additional custom permissions
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

/**
 * User token (JWT)
 */
export interface UserToken {
  id: string
  userId: string
  token: string // JWT token
  refreshToken: string
  expiresAt: Date
  refreshExpiresAt: Date
  createdAt: Date
  lastUsedAt?: Date
}

/**
 * Login request
 */
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

/**
 * Login response - success case
 */
export interface LoginSuccessResponse {
  success: true
  user: Omit<User, 'password'>
  token: string
  refreshToken: string
  expiresAt: Date
}

/**
 * Login response - failure case
 */
export interface LoginFailureResponse {
  success: false
  error: string
}

/**
 * Combined login response type (discriminated union)
 */
export type LoginResponse = LoginSuccessResponse | LoginFailureResponse

/**
 * Register request
 */
export interface RegisterRequest {
  email: string
  password: string
  name: string
  role?: UserRole
  roles?: Role[]
}

/**
 * Register response
 */
export interface RegisterResponse {
  success: boolean
  user?: Omit<User, 'password'>
  error?: string
  token?: string
  refreshToken?: string | null
  expiresAt?: number
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string
}

/**
 * Refresh token success response
 */
export interface RefreshTokenSuccessResponse {
  success: true
  token: string
  refreshToken: string
  expiresAt: Date
}

/**
 * Refresh token failure response
 */
export interface RefreshTokenFailureResponse {
  success: false
  error: string
}

/**
 * Combined refresh token response type (discriminated union)
 */
export type RefreshTokenResponse = RefreshTokenSuccessResponse | RefreshTokenFailureResponse

/**
 * User context (decoded from JWT) - With RBAC support
 */
export interface UserContext {
  userId: string
  email: string
  role: UserRole // Primary role
  roles: Role[] // Multiple roles
  permissions: string[]
  customPermissions?: string[]
  requestId?: string
}

/**
 * Create user request - With multi-role support
 */
export interface CreateUserRequest {
  email: string
  password: string
  name: string
  role?: UserRole
  roles?: Role[]
  permissions?: string[]
  customPermissions?: string[]
  metadata?: Record<string, unknown>
}

/**
 * Update user request - With multi-role support
 */
export interface UpdateUserRequest {
  name?: string
  avatar?: string
  role?: UserRole
  roles?: Role[]
  status?: UserStatus
  permissions?: string[]
  customPermissions?: string[]
  metadata?: Record<string, unknown>
  password?: string // For password changes
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/**
 * Forgot password request
 */
export interface ForgotPasswordRequest {
  email: string
}

/**
 * Reset password request
 */
export interface ResetPasswordRequest {
  token: string
  newPassword: string
}
