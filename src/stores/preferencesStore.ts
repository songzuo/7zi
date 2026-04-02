/**
 * @fileoverview 用户偏好设置 Store
 * @description 使用 Zustand 实现用户偏好管理，替代 SettingsContext
 *
 * 功能:
 * - 主题设置（light/dark/system）
 * - 语言设置
 * - 通知偏好
 * - 持久化存储
 * - SSR 兼容（使用 hydrate）
 *
 * @example
 * // 在组件中使用
 * const { settings, setTheme, setLanguage } = usePreferencesStore();
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ============================================================================
// 类型定义
// ============================================================================

export type Theme = 'light' | 'dark' | 'system'

export type Locale = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de'

export interface NotificationPreferences {
  enabled: boolean
  sound: boolean
  email: boolean
  push: boolean
}

export interface UserSettings {
  theme: Theme
  language: Locale
  notifications: NotificationPreferences
}

interface PreferencesState {
  // 数据
  settings: UserSettings
  isLoaded: boolean
  isDark: boolean

  // 操作
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLanguage: (language: Locale) => void
  setNotifications: (notifications: Partial<NotificationPreferences>) => void
  resetSettings: () => void
  syncThemeToDOM: () => void
}

// ============================================================================
// 常量
// ============================================================================

const STORAGE_KEY = '7zi-user-settings'

const defaultSettings: UserSettings = {
  theme: 'system',
  language: 'zh',
  notifications: {
    enabled: true,
    sound: true,
    email: false,
    push: true,
  },
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 计算当前是否为深色主题
 */
function computeDarkMode(theme: Theme): boolean {
  if (typeof window === 'undefined') return false
  if (theme === 'dark') return true
  if (theme === 'light') return false
  // system theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * 同步主题到 DOM
 */
function syncTheme(theme: Theme): void {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const isDark = computeDarkMode(theme)

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

/**
 * 监听系统主题变化
 */
function listenSystemThemeChange(callback: (isDark: boolean) => void) {
  if (typeof window === 'undefined') return () => {}

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
    callback(e.matches)
  }

  // 现代浏览器使用 addEventListener
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }

  // 旧版浏览器回退
  const legacyHandler = (e: MediaQueryListEvent) => handleChange(e)
  mediaQuery.addListener(legacyHandler)
  return () => mediaQuery.removeListener(legacyHandler)
}

// ============================================================================
// Store 实现
// ============================================================================

export const usePreferencesStore = create<PreferencesState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        settings: defaultSettings,
        isLoaded: false,
        isDark: false,

        // 设置主题
        setTheme: theme => {
          set(state => ({
            settings: { ...state.settings, theme },
            isDark: computeDarkMode(theme),
          }))
          get().syncThemeToDOM()
        },

        // 切换主题
        toggleTheme: () => {
          set(state => {
            const { theme: currentTheme } = state.settings

            let newTheme: Theme
            if (currentTheme === 'light') {
              newTheme = 'dark'
            } else if (currentTheme === 'dark') {
              newTheme = 'light'
            } else {
              // system: toggle based on current system preference
              const systemDark = computeDarkMode('system')
              newTheme = systemDark ? 'light' : 'dark'
            }

            return {
              settings: { ...state.settings, theme: newTheme },
              isDark: computeDarkMode(newTheme),
            }
          })
          get().syncThemeToDOM()
        },

        // 设置语言
        setLanguage: language => {
          set(state => ({
            settings: { ...state.settings, language },
          }))
        },

        // 设置通知偏好
        setNotifications: notifications => {
          set(state => ({
            settings: {
              ...state.settings,
              notifications: {
                ...state.settings.notifications,
                ...notifications,
              },
            },
          }))
        },

        // 重置设置
        resetSettings: () => {
          set({
            settings: defaultSettings,
            isDark: computeDarkMode(defaultSettings.theme),
          })
          get().syncThemeToDOM()
        },

        // 同步主题到 DOM
        syncThemeToDOM: () => {
          const { settings } = get()
          syncTheme(settings.theme)
        },
      }),
      {
        name: STORAGE_KEY,
        // 首次加载后初始化主题
        onRehydrateStorage: () => state => {
          if (state) {
            state.isLoaded = true
            state.isDark = computeDarkMode(state.settings.theme)
            syncTheme(state.settings.theme)

            // 监听系统主题变化（仅当使用 system 主题时）
            if (state.settings.theme === 'system') {
              const unsubscribe = listenSystemThemeChange(isDark => {
                state.isDark = isDark
                syncTheme('system')
              })
              return () => unsubscribe?.()
            }
          }
        },
      }
    ),
    { name: 'preferences-store' }
  )
)

// ============================================================================
// 选择器 Hooks
// ============================================================================

/**
 * 获取所有设置
 */
export const useSettings = () => usePreferencesStore(s => s.settings)

/**
 * 获取主题设置
 */
export const useTheme = () => {
  return usePreferencesStore(state => ({
    theme: state.settings.theme,
    setTheme: state.setTheme,
    toggleTheme: state.toggleTheme,
    isDark: state.isDark,
  }))
}

/**
 * 获取语言设置
 */
export const useLanguage = () => {
  return usePreferencesStore(state => ({
    language: state.settings.language,
    setLanguage: state.setLanguage,
  }))
}

/**
 * 获取通知偏好
 */
export const useNotificationPreferences = () => {
  return usePreferencesStore(state => ({
    notifications: state.settings.notifications,
    setNotifications: state.setNotifications,
  }))
}

/**
 * 获取加载状态
 */
export const usePreferencesLoaded = () => usePreferencesStore(s => s.isLoaded)

/**
 * 获取是否为深色模式
 */
export const useDarkMode = () => usePreferencesStore(s => s.isDark)

// ============================================================================
// 外部访问 API
// ============================================================================

/**
 * 获取当前设置（用于非 React 环境）
 */
export const getSettings = () => usePreferencesStore.getState().settings

/**
 * 设置主题（外部调用）
 */
export const setTheme = (theme: Theme) => {
  usePreferencesStore.getState().setTheme(theme)
}

/**
 * 切换主题（外部调用）
 */
export const toggleTheme = () => {
  usePreferencesStore.getState().toggleTheme()
}

/**
 * 设置语言（外部调用）
 */
export const setLanguage = (language: Locale) => {
  usePreferencesStore.getState().setLanguage(language)
}
