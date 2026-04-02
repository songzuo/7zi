/**
 * Shared Types
 * 全局类型定义
 */

// 用户角色
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}

// 基础用户类型
export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  createdAt?: Date
  updatedAt?: Date
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 分页类型
export interface PaginationParams {
  page: number
  limit: number
  total?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationParams
}

// 通用 ID 类型
export type ID = string

// 时间戳类型
export interface Timestamped {
  createdAt: Date
  updatedAt: Date
}
