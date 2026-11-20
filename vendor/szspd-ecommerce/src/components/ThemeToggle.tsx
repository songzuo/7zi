'use client'

/**
 * ThemeToggle - Simple theme switcher
 *
 * A compact toggle button that switches between light and dark modes.
 * For full theme selection (light/dark/system), use ThemeSelector instead.
 *
 * @see ThemeSelector for advanced theme selection with system preference
 */

import { useTheme } from '@/stores/preferencesStore'
import type { FC } from 'react'

interface ThemeToggleProps {
  className?: string
  /**
   * If true, cycles through light → dark → system instead of just toggling
   */
  cycle?: boolean
}

export function ThemeToggle({ className = '', cycle = false }: ThemeToggleProps) {
  const { toggleTheme, isDark, theme } = useTheme()

  const handleClick = () => {
    toggleTheme()
  }

  return (
    <button
      onClick={handleClick}
      className={`relative h-6 w-12 rounded-full bg-zinc-200 transition-colors duration-300 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none dark:bg-zinc-700 dark:focus:ring-offset-zinc-900 ${className} `}
      aria-label={`Current theme: ${theme}. Click to ${isDark ? 'switch to light' : 'switch to dark'} mode`}
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
