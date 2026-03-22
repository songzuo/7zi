/**
 * Auth Types
 * 认证相关类型定义
 */

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  USER = 'user',
  GUEST = 'guest',
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  name?: string;
  avatar?: string;
  role?: UserRole;
  roles?: string[];
  status?: UserStatus;
  permissions?: string[];
  customPermissions?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastLoginAt?: string | Date;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}
