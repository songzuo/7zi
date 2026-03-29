'use client';

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

import { useCallback, useMemo, useState } from 'react';
import type { Theme } from '@/stores/preferencesStore';
import { useTheme as useThemeFromStore } from '@/stores/preferencesStore';

interface UseThemeEnhancedReturn {
  /** Current theme value */
  theme: Theme;
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** System preference for dark mode */
  systemPrefersDark: boolean;
  /** Set theme to specific value */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
  /** Cycle through light → dark → system */
  cycleTheme: () => void;
  /** Reset theme to system preference */
  resetTheme: () => void;
}

export function useThemeEnhanced(): UseThemeEnhancedReturn {
  const { theme, setTheme: setStoreTheme, toggleTheme, isDark } = useThemeFromStore();
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Track system preference changes
  // Note: The store also listens for system theme changes when theme is 'system'
  // This hook's state is kept for backward compatibility and direct access
  if (typeof window !== 'undefined') {
    useState(() => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemPrefersDark(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => {
        setSystemPrefersDark(e.matches);
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    });
  }

  // Cycle through themes
  const cycleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setStoreTheme(themes[nextIndex]);
  }, [theme, setStoreTheme]);

  // Reset to system
  const resetTheme = useCallback(() => {
    setStoreTheme('system');
  }, [setStoreTheme]);

  return {
    theme,
    isDark,
    systemPrefersDark,
    setTheme: setStoreTheme,
    toggleTheme,
    cycleTheme,
    resetTheme,
  };
}

/**
 * Convenience hook that only returns the values needed by most components
 */
export function useThemeSimple() {
  const { theme, isDark, setTheme, toggleTheme } = useThemeEnhanced();
  return { theme, isDark, setTheme, toggleTheme };
}
