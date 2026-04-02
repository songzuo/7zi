'use client'

/**
 * ThemeSelector Component
 *
 * A comprehensive theme selector that supports:
 * - Light mode
 * - Dark mode
 * - System preference mode
 *
 * Features:
 * - Smooth transitions
 * - Icon-based selection
 * - Visual feedback for active theme
 * - Accessible keyboard navigation
 */

import React, { useState } from 'react'
import { useTheme } from '@/stores/preferencesStore'

interface ThemeOption {
  value: 'light' | 'dark' | 'system'
  label: string
  icon: React.ReactNode
  description: string
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    label: '浅色模式',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    description: '适合白天使用',
  },
  {
    value: 'dark',
    label: '深色模式',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    ),
    description: '适合夜间使用',
  },
  {
    value: 'system',
    label: '跟随系统',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    description: '自动适应系统设置',
  },
]

interface ThemeSelectorProps {
  className?: string
  variant?: 'compact' | 'full'
}

export function ThemeSelector({ className = '', variant = 'full' }: ThemeSelectorProps) {
  const { theme, setTheme, isDark } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  if (variant === 'compact') {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`relative h-6 w-12 rounded-full bg-zinc-200 transition-colors duration-300 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:bg-zinc-700 dark:focus:ring-offset-zinc-900 ${className} `}
        aria-label="Toggle theme"
      >
        <span
          className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-md transition-transform duration-300 dark:from-cyan-400 dark:to-blue-500 ${isDark ? 'translate-x-6' : 'translate-x-0'} `}
        />
        <span className="absolute top-1.5 left-1.5 text-[10px] transition-opacity duration-300 dark:opacity-0">
          ☀️
        </span>
        <span className="absolute top-1.5 right-1.5 text-[10px] opacity-0 transition-opacity duration-300 dark:opacity-100">
          🌙
        </span>
      </button>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 transition-colors hover:bg-zinc-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none dark:bg-zinc-800 dark:hover:bg-zinc-700"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select theme"
      >
        <span className="text-lg">
          {theme === 'light' && '☀️'}
          {theme === 'dark' && '🌙'}
          {theme === 'system' && (isDark ? '🌙' : '☀️')}
        </span>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {THEME_OPTIONS.find(opt => opt.value === theme)?.label}
        </span>
        <svg
          className={`h-4 w-4 text-zinc-500 transition-transform dark:text-zinc-400 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Menu */}
          <div
            className="absolute top-full right-0 z-50 mt-2 w-64 space-y-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            role="listbox"
          >
            {THEME_OPTIONS.map(option => {
              const isActive = theme === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value)
                    setIsOpen(false)
                  }}
                  role="option"
                  aria-selected={isActive}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300'
                      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  } `}
                >
                  <span className="text-xl">{option.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs opacity-70">{option.description}</div>
                  </div>
                  {isActive && (
                    <svg
                      className="h-5 w-5 text-cyan-600 dark:text-cyan-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Compact theme toggle button that cycles through themes
 */
export function ThemeToggleCycle({ className = '' }: { className?: string }) {
  const { theme, isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`relative h-6 w-12 rounded-full bg-zinc-200 transition-colors duration-300 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:bg-zinc-700 dark:focus:ring-offset-zinc-900 ${className} `}
      aria-label={`Current theme: ${theme}. Click to toggle.`}
    >
      <span
        className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-md transition-transform duration-300 dark:from-cyan-400 dark:to-blue-500 ${isDark ? 'translate-x-6' : 'translate-x-0'} `}
      />
      <span className="absolute top-1.5 left-1.5 text-[10px] transition-opacity duration-300 dark:opacity-0">
        ☀️
      </span>
      <span className="absolute top-1.5 right-1.5 text-[10px] opacity-0 transition-opacity duration-300 dark:opacity-100">
        🌙
      </span>
    </button>
  )
}
