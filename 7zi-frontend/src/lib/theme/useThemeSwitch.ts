/**
 * useThemeSwitch Hook
 * Provides theme switching utilities with smooth transitions
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTheme } from './ThemeContext';
import type { ThemeMode } from './theme-config';

export interface UseThemeSwitchOptions {
  /** Enable smooth transition */
  transition?: boolean;
  /** Transition duration in ms */
  transitionDuration?: number;
  /** Callback when theme changes */
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export function useThemeSwitch(options: UseThemeSwitchOptions = {}) {
  const {
    transition = true,
    transitionDuration = 300,
    onThemeChange,
  } = options;
  
  const { mode, resolvedTheme, setMode, toggle, timeBasedEnabled, setTimeBasedEnabled } = useTheme();
  const transitionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Apply smooth transition
  const applyTransition = useCallback(() => {
    if (!transition || typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Add transition class
    root.style.setProperty('--theme-transition', `background-color ${transitionDuration}ms ease-in-out, color ${transitionDuration}ms ease-in-out, border-color ${transitionDuration}ms ease-in-out`);
    root.classList.add('theme-transitioning');
    
    // Remove transition class after animation
    transitionTimeoutRef.current = setTimeout(() => {
      root.classList.remove('theme-transitioning');
      root.style.removeProperty('--theme-transition');
    }, transitionDuration);
  }, [transition, transitionDuration]);
  
  // Clean up transition timeout
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);
  
  // Call callback when theme changes
  useEffect(() => {
    if (onThemeChange) {
      onThemeChange(resolvedTheme);
    }
  }, [resolvedTheme, onThemeChange]);
  
  // Set theme mode with transition
  const setModeWithTransition = useCallback((newMode: ThemeMode) => {
    const oldTheme = resolvedTheme;
    setMode(newMode);
    
    // Only apply transition if theme actually changes
    if (oldTheme !== resolvedTheme) {
      applyTransition();
    }
  }, [resolvedTheme, setMode, applyTransition]);
  
  // Toggle theme with transition
  const toggleWithTransition = useCallback(() => {
    const oldTheme = resolvedTheme;
    toggle();
    
    // Only apply transition if theme actually changes
    if (oldTheme !== resolvedTheme) {
      applyTransition();
    }
  }, [resolvedTheme, toggle, applyTransition]);
  
  // Set time-based auto-switching
  const setTimeBased = useCallback((enabled: boolean) => {
    setTimeBasedEnabled(enabled);
    
    // Apply transition when time-based mode changes theme
    if (enabled && mode === 'system') {
      applyTransition();
    }
  }, [mode, setTimeBasedEnabled, applyTransition]);
  
  return {
    mode,
    resolvedTheme,
    setMode: setModeWithTransition,
    toggle: toggleWithTransition,
    timeBasedEnabled,
    setTimeBasedEnabled: setTimeBased,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };
}