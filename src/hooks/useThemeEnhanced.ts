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
 * This hook integrates with SettingsContext for unified state management.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Theme } from '@/contexts/SettingsContext';
import { useSettings } from '@/contexts/SettingsContext';

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
  const { settings, setTheme: setSettingsTheme } = useSettings();
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Track system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Initial check
    setSystemPrefersDark(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Computed isDark state
  const isDark = useMemo(() => {
    if (settings.theme === 'system') {
      return systemPrefersDark;
    }
    return settings.theme === 'dark';
  }, [settings.theme, systemPrefersDark]);

  // Set theme
  const setTheme = useCallback((theme: Theme) => {
    setSettingsTheme(theme);
  }, [setSettingsTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setSettingsTheme(isDark ? 'light' : 'dark');
  }, [isDark, setSettingsTheme]);

  // Cycle through themes
  const cycleTheme = useCallback(() => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(settings.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setSettingsTheme(themes[nextIndex]);
  }, [settings.theme, setSettingsTheme]);

  // Reset to system
  const resetTheme = useCallback(() => {
    setSettingsTheme('system');
  }, [setSettingsTheme]);

  return {
    theme: settings.theme,
    isDark,
    systemPrefersDark,
    setTheme,
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
