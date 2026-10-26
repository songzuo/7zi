'use client'

/**
 * useThemeEnhanced Hook
 *
 * Enhanced theme management hook that provides:
 * - Theme state (light/dark/system)
 * - Computed isDark state
 * - Theme switching methods
 * - System preference detection
 * - Theme persistence in localStorage
 *
 * This hook now integrates with preferencesStore (Zustand) for unified state management.
 */

import { useCallback, useEffect, useState } from 'react'
import type { Theme } from '@/stores/preferencesStore'
import { useTheme as useThemeFromStore } from '@/stores/preferencesStore'

export interface UseThemeEnhancedReturn {
  /** Current theme value */
  theme: Theme
  /** Whether dark mode is currently active */
  isDark: boolean
  /** System preference for dark mode */
  systemPrefersDark: boolean
  /** Set theme to specific value */
  setTheme: (theme: Theme) => void
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void
  /** Cycle through light → dark → system */
  cycleTheme: () => void
  /** Reset theme to system preference */
  resetTheme: () => void
}

export function useThemeEnhanced(): UseThemeEnhancedReturn {
  const { theme, setTheme: setStoreTheme, toggleTheme } = useThemeFromStore()
  const [systemPrefersDark, setSystemPrefersDark] = useState(false)

  // Track system preference changes
  // Note: The store also listens for system theme changes when theme is 'system'
  // This hook's state is kept for backward compatibility and direct access
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemPrefersDark(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // isDark 必须**实时推导**，不能用 store 里的快照。
  //
  // 快照的问题：store 的 isDark 只在 setTheme / hydrate 时算一次。
  // 当 theme === 'system' 时，它取决于 window.matchMedia 的**当前**结果 ——
  // 而快照是过期的（系统偏好变了、或 hydrate 发生在 matchMedia mock 之前）。
  //
  // 本 hook 自己就在实时跟踪 systemPrefersDark（useEffect + change 事件），
  // 所以直接用它推导：theme='system' 时跟随系统偏好，否则跟随显式主题。
  const effectiveIsDark = theme === 'system' ? systemPrefersDark : theme === 'dark'

  // Cycle through themes
  const cycleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setStoreTheme(themes[nextIndex])
  }, [theme, setStoreTheme])

  // Reset to system
  const resetTheme = useCallback(() => {
    setStoreTheme('system')
  }, [setStoreTheme])

  return {
    theme,
    isDark: effectiveIsDark,
    systemPrefersDark,
    setTheme: setStoreTheme,
    toggleTheme,
    cycleTheme,
    resetTheme,
  }
}

/**
 * Convenience hook that only returns the values needed by most components
 */
export function useThemeSimple() {
  const { theme, isDark, setTheme, toggleTheme } = useThemeEnhanced()
  return { theme, isDark, setTheme, toggleTheme }
}
