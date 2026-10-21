/**
 * ThemeSwitcher - 主题切换按钮组件
 * 支持浅色、深色、跟随系统三种模式切换
 */

'use client'

import React from 'react'
import { useTheme } from '@/lib/theme'

export interface ThemeSwitcherProps {
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示标签 */
  showLabel?: boolean
  /** 自定义类名 */
  className?: string
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const { mode, setMode, resolvedTheme } = useTheme()

  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const handleCycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(mode)
    const nextIndex = (currentIndex + 1) % themes.length
    setMode(themes[nextIndex])
  }

  const getIcon = () => {
    if (resolvedTheme === 'light') {
      return (
        <svg className={iconSize[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )
    } else {
      return (
        <svg className={iconSize[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )
    }
  }

  const getLabel = () => {
    if (mode === 'light') return '浅色'
    if (mode === 'dark') return '深色'
    return '跟随系统'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleCycleTheme}
        className={` ${sizeStyles[size]} flex items-center justify-center rounded-full bg-gray-200 text-gray-700 transition-all duration-200 ease-in-out hover:bg-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none active:scale-95 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`}
        title={getLabel()}
        aria-label={`当前主题: ${getLabel()}，点击切换`}
      >
        {getIcon()}
      </button>
      {showLabel && <span className="text-sm text-gray-700 dark:text-gray-200">{getLabel()}</span>}
    </div>
  )
}

export default ThemeSwitcher
