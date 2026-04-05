/**
 * 认证状态管理 Store
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-29
 * 更新日期: 2026-04-04 - 添加细粒度选择器优化
 *
 * 功能:
 * - 用户登录/登出
 * - 用户信息管理
 * - Token 管理
 * - 认证状态持久化
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'

/**
 * 用户信息接口
 */
export interface User {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 认证状态接口
 */
export interface AuthState {
  // 状态
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // 登录操作
  login: (email: string, password: string) => Promise<void>
  loginWithToken: (token: string, user: User) => void

  // 登出操作
  logout: () => void

  // 用户信息更新
  updateProfile: (data: Partial<User>) => void
  setAvatar: (avatar: string) => void

  // 错误处理
  setError: (error: string | null) => void
  clearError: () => void

  // 加载状态
  setLoading: (loading: boolean) => void

  // 重置状态
  reset: () => void
}

/**
 * 初始状态
 */
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

/**
 * 认证状态 Store
 *
 * 使用 persist 中间件将用户信息和 token 持久化到 localStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * 用户登录
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.message || '登录失败')
          }

          const { user, token } = await response.json()

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '登录失败'
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
          })
          throw error
        }
      },

      /**
       * 使用 Token 登录 (用于 OAuth 等)
       */
      loginWithToken: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      },

      /**
       * 用户登出
       */
      logout: () => {
        // 可以在这里调用登出 API
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
          // 忽略错误，本地清除即可
        })

        set({
          ...initialState,
        })
      },

      /**
       * 更新用户资料
       */
      updateProfile: (data: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({
            user: { ...user, ...data, updatedAt: new Date().toISOString() },
          })
        }
      },

      /**
       * 设置头像
       */
      setAvatar: (avatar: string) => {
        const { user } = get()
        if (user) {
          set({
            user: { ...user, avatar },
          })
        }
      },

      /**
       * 设置错误
       */
      setError: (error: string | null) => {
        set({ error })
      },

      /**
       * 清除错误
       */
      clearError: () => {
        set({ error: null })
      },

      /**
       * 设置加载状态
       */
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      /**
       * 重置状态
       */
      reset: () => {
        set(initialState)
      },
    }),
    {
      name: '7zi-auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // 只持久化必要的状态
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

/**
 * 选择器 - 用于性能优化（使用 shallow 进行浅比较）
 */
export const selectUser = (state: AuthState) => state.user
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectToken = (state: AuthState) => state.token
export const selectIsLoading = (state: AuthState) => state.isLoading
export const selectError = (state: AuthState) => state.error

/**
 * 复合选择器 - 用于同时订阅多个状态而不触发过度渲染
 */
export const selectAuthActions = (state: AuthState) => ({
  login: state.login,
  logout: state.logout,
  updateProfile: state.updateProfile,
  setAvatar: state.setAvatar,
  clearError: state.clearError,
  setLoading: state.setLoading,
})

export const selectLoginState = (state: AuthState) => ({
  isLoading: state.isLoading,
  error: state.error,
})

/**
 * 用于组件中的优化选择器
 * 示例: const { login, isLoading, error } = useAuthStore(useShallow(selectLoginAndError))
 */
export const selectLoginAndError = (state: AuthState) => ({
  login: state.login,
  isLoading: state.isLoading,
  error: state.error,
  clearError: state.clearError,
})
