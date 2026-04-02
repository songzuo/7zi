/**
 * 应用全局设置 Store
 *
 * 架构师: 🏗️ 架构师
 * 创建日期: 2026-03-29
 *
 * 功能:
 * - UI 状态管理 (侧边栏、主题)
 * - 用户偏好设置
 * - 语言设置
 * - 设置持久化
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * 应用设置接口
 */
export interface AppSettings {
  // UI 设置
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  darkMode: boolean
  compactMode: boolean

  // 语言
  language: string
  timezone: string

  // 分页
  pageSize: number

  // 自动刷新
  autoRefresh: boolean
  refreshInterval: number // 毫秒

  // 通知设置
  notificationsEnabled: boolean
  soundEnabled: boolean
  desktopNotifications: boolean

  // 调试
  debugMode: boolean
}

/**
 * 应用状态接口
 */
export interface AppState {
  // 设置
  settings: AppSettings

  // 全局加载状态
  isGlobalLoading: boolean
  globalLoadingMessage: string | null

  // 操作
  updateSettings: (settings: Partial<AppSettings>) => void
  resetSettings: () => void

  // UI 操作
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
  setDarkMode: (enabled: boolean) => void
  setLanguage: (lang: string) => void
  setPageSize: (size: number) => void
  setAutoRefresh: (enabled: boolean) => void
  setRefreshInterval: (interval: number) => void

  // 全局加载
  setGlobalLoading: (loading: boolean, message?: string) => void
}

/**
 * 默认设置
 */
const defaultSettings: AppSettings = {
  sidebarOpen: true,
  sidebarCollapsed: false,
  darkMode: false,
  compactMode: false,
  language: 'en',
  timezone: 'UTC',
  pageSize: 20,
  autoRefresh: false,
  refreshInterval: 30000, // 30 秒
  notificationsEnabled: true,
  soundEnabled: true,
  desktopNotifications: false,
  debugMode: false,
}

/**
 * 应用状态 Store
 *
 * 使用 persist 中间件将设置持久化到 localStorage
 */
export const useAppStore = create<AppState>()(
  persist(
    set => ({
      settings: defaultSettings,
      isGlobalLoading: false,
      globalLoadingMessage: null,

      /**
       * 更新设置
       */
      updateSettings: (newSettings: Partial<AppSettings>) => {
        set(state => ({
          settings: { ...state.settings, ...newSettings },
        }))
      },

      /**
       * 重置设置
       */
      resetSettings: () => {
        set({ settings: defaultSettings })
      },

      /**
       * 切换侧边栏
       */
      toggleSidebar: () => {
        set(state => ({
          settings: {
            ...state.settings,
            sidebarOpen: !state.settings.sidebarOpen,
          },
        }))
      },

      /**
       * 设置侧边栏状态
       */
      setSidebarOpen: (open: boolean) => {
        set(state => ({
          settings: { ...state.settings, sidebarOpen: open },
        }))
      },

      /**
       * 切换暗色模式
       */
      toggleDarkMode: () => {
        set(state => ({
          settings: {
            ...state.settings,
            darkMode: !state.settings.darkMode,
          },
        }))
      },

      /**
       * 设置暗色模式
       */
      setDarkMode: (enabled: boolean) => {
        set(state => ({
          settings: { ...state.settings, darkMode: enabled },
        }))
      },

      /**
       * 设置语言
       */
      setLanguage: (lang: string) => {
        set(state => ({
          settings: { ...state.settings, language: lang },
        }))
      },

      /**
       * 设置页面大小
       */
      setPageSize: (size: number) => {
        set(state => ({
          settings: { ...state.settings, pageSize: size },
        }))
      },

      /**
       * 设置自动刷新
       */
      setAutoRefresh: (enabled: boolean) => {
        set(state => ({
          settings: { ...state.settings, autoRefresh: enabled },
        }))
      },

      /**
       * 设置刷新间隔
       */
      setRefreshInterval: (interval: number) => {
        set(state => ({
          settings: { ...state.settings, refreshInterval: interval },
        }))
      },

      /**
       * 设置全局加载状态
       */
      setGlobalLoading: (loading: boolean, message?: string) => {
        set({
          isGlobalLoading: loading,
          globalLoadingMessage: message || null,
        })
      },
    }),
    {
      name: '7zi-app-settings', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // 只持久化设置
        settings: state.settings,
      }),
    }
  )
)

/**
 * 选择器 - 用于性能优化
 */
export const selectSettings = (state: AppState) => state.settings
export const selectDarkMode = (state: AppState) => state.settings.darkMode
export const selectLanguage = (state: AppState) => state.settings.language
export const selectSidebarOpen = (state: AppState) => state.settings.sidebarOpen
export const selectIsGlobalLoading = (state: AppState) => state.isGlobalLoading
