/**
 * 🚀 统一 Auth Mock 系统
 * 
 * 为所有认证相关测试提供一致、可配置的 mock 实现
 * 支持多种认证状态：未认证、部分认证、完全认证、管理员
 */

import { vi } from 'vitest'
import { UserRole, Permission } from '@/lib/auth'

// ============================================================
// 统一的 Auth 状态存储
// ============================================================

export interface MockUser {
  id: string
  username: string
  email: string
  role: UserRole
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export interface MockSession {
  token: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

// 全局 Auth 状态
const authState = {
  user: null as MockUser | null,
  session: null as MockSession | null,
  isAuthenticated: false,
}

// 回调函数集合
const callbacks = {
  onAuthChange: [] as Array<(user: MockUser | null) => void>,
  onSessionExpire: [] as Array<() => void>,
}

// ============================================================
// 预设的 Mock 用户
// ============================================================

export const mockUsers = {
  guest: {
    id: 'guest-001',
    username: 'guest',
    email: 'guest@example.com',
    role: UserRole.GUEST,
    permissions: [Permission.READ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  user: {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.USER,
    permissions: [Permission.READ, Permission.WRITE],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  admin: {
    id: 'admin-001',
    username: 'admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    permissions: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
}

// ============================================================
// Auth Mock API
// ============================================================

export const mockAuthApi = {
  // 获取当前用户
  getCurrentUser: () => authState.user,

  // 获取当前会话
  getCurrentSession: () => authState.session,

  // 是否已认证
  isAuthenticated: () => authState.isAuthenticated,

  // 登录
  login: vi.fn(async (username: string, password: string) => {
    if (username === 'admin' && password === 'password123') {
      authState.user = mockUsers.admin
      authState.session = {
        token: 'mock-admin-token-' + Date.now(),
        userId: mockUsers.admin.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      }
      authState.isAuthenticated = true
      callbacks.onAuthChange.forEach(cb => cb(authState.user))
      return { success: true, user: authState.user }
    }
    if (username === 'testuser' && password === 'password123') {
      authState.user = mockUsers.user
      authState.session = {
        token: 'mock-user-token-' + Date.now(),
        userId: mockUsers.user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      }
      authState.isAuthenticated = true
      callbacks.onAuthChange.forEach(cb => cb(authState.user))
      return { success: true, user: authState.user }
    }
    return { success: false, error: 'Invalid credentials' }
  }),

  // 注册
  register: vi.fn(async (data: { username: string; email: string; password: string }) => {
    if (data.username && data.email && data.password.length >= 8) {
      const newUser: MockUser = {
        id: 'new-user-' + Date.now(),
        username: data.username,
        email: data.email,
        role: UserRole.USER,
        permissions: [Permission.READ, Permission.WRITE],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      return { success: true, user: newUser }
    }
    return { success: false, error: 'Registration failed' }
  }),

  // 登出
  logout: vi.fn(() => {
    authState.user = null
    authState.session = null
    authState.isAuthenticated = false
    callbacks.onAuthChange.forEach(cb => cb(null))
  }),

  // 设置认证状态（测试用）
  setAuth: (user: MockUser | null, token?: string) => {
    authState.user = user
    authState.isAuthenticated = !!user
    if (user && token) {
      authState.session = {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        createdAt: new Date(),
      }
    } else {
      authState.session = null
    }
    callbacks.onAuthChange.forEach(cb => cb(user))
  },

  // 重置状态
  reset: () => {
    authState.user = null
    authState.session = null
    authState.isAuthenticated = false
    vi.clearAllMocks()
  },

  // 注册认证状态变化回调
  onAuthChange: (callback: (user: MockUser | null) => void) => {
    callbacks.onAuthChange.push(callback)
    return () => {
      const index = callbacks.onAuthChange.indexOf(callback)
      if (index > -1) callbacks.onAuthChange.splice(index, 1)
    }
  },
}

// ============================================================
// 创建 Vitest Mock 模块
// ============================================================

export const createAuthMock = () => {
  return {
    // 核心 API
    getCurrentUser: mockAuthApi.getCurrentUser,
    getCurrentSession: mockAuthApi.getCurrentSession,
    isAuthenticated: mockAuthApi.isAuthenticated,
    login: mockAuthApi.login,
    logout: mockAuthApi.logout,
    register: mockAuthApi.register,
    setAuth: mockAuthApi.setAuth,
    resetAuth: mockAuthApi.reset,
    onAuthChange: mockAuthApi.onAuthChange,

    // 预设用户
    users: mockUsers,

    // 状态
    state: authState,
  }
}

// 导出默认的 mock 实例
export const authMock = createAuthMock()

// ============================================================
// Vitest.mock() 工厂函数
// ============================================================

export const createVitestAuthMock = () => {
  const mock = createAuthMock()

  return {
    default: mock,
    authMock: mock,
    mockUsers,
    mockAuthApi,
    // 便捷方法
    withUser: (user: MockUser | keyof typeof mockUsers) => {
      const u = typeof user === 'string' ? mockUsers[user] : user
      mock.setAuth(u, 'mock-token-' + Date.now())
      return mock
    },
    withGuest: () => {
      mock.setAuth(mockUsers.guest, 'mock-guest-token')
      return mock
    },
    withAdmin: () => {
      mock.setAuth(mockUsers.admin, 'mock-admin-token')
      return mock
    },
    withRegularUser: () => {
      mock.setAuth(mockUsers.user, 'mock-user-token')
      return mock
    },
    unauthenticated: () => {
      mock.setAuth(null)
      return mock
    },
  }
}
