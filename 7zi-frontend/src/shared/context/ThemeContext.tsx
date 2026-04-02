/**
 * Theme Context - 主题管理上下文
 * 提供主题切换和持久化功能
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // 从 localStorage 读取主题设置
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme
    if (stored) {
      setThemeState(stored)
    }
  }, [])

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setResolvedTheme(e.matches ? 'dark' : 'light')
      }
    }

    // 初始化系统主题
    if (theme === 'system') {
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    // 监听系统主题变化
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // 当主题改变时更新 DOM 和 localStorage
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
      setResolvedTheme(systemTheme)
    } else {
      root.classList.remove('light', 'dark')
      root.classList.add(theme)
      setResolvedTheme(theme)
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
