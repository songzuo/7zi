/**
 * Theme Context Provider
 * Manages global theme state and provides theme switching functionality
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { ThemeMode, getResolvedTheme, themeConfig } from './theme-config';

interface ThemeContextValue {
  /** Current theme mode (light/dark/system) */
  mode: ThemeMode;
  
  /** Resolved theme (always light or dark) */
  resolvedTheme: 'light' | 'dark';
  
  /** Set theme mode */
  setMode: (mode: ThemeMode) => void;
  
  /** Toggle between light and dark */
  toggle: () => void;
  
  /** Enable/disable time-based auto-switching */
  timeBasedEnabled: boolean;
  setTimeBasedEnabled: (enabled: boolean) => void;
  
  /** System preference (light/dark) */
  systemTheme: 'light' | 'dark';
  
  /** Theme is loaded and applied */
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = '7zi-theme-preference';
const TIME_BASED_KEY = '7zi-theme-time-based';

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme mode */
  defaultMode?: ThemeMode;
  /** Enable time-based auto-switching by default */
  defaultTimeBased?: boolean;
}

export function ThemeProvider({
  children,
  defaultMode = 'system',
  defaultTimeBased = false,
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [timeBasedEnabled, setTimeBasedEnabledState] = useState(defaultTimeBased);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Resolve current theme based on mode
  const resolvedTheme = useMemo(() => {
    if (mode === 'system') {
      if (timeBasedEnabled) {
        const hour = new Date().getHours();
        return (hour >= 6 && hour < 18) ? 'light' : 'dark';
      }
      return systemTheme;
    }
    return mode;
  }, [mode, systemTheme, timeBasedEnabled]);
  
  // Load saved preference on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      const savedTimeBased = localStorage.getItem(TIME_BASED_KEY) === 'true';
      
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setModeState(savedMode);
      }
      if (savedTimeBased !== null) {
        setTimeBasedEnabledState(savedTimeBased);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
    
    setIsLoaded(true);
  }, []);
  
  // Detect system theme preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    // Listen for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  // Apply theme to document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    const isDark = resolvedTheme === 'dark';
    
    // Update class
    root.classList.toggle('dark', isDark);
    
    // Update CSS variable
    root.style.setProperty('--theme-mode', resolvedTheme);
    
    // Update color-scheme for native elements
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);
  
  // Time-based theme switching check (every minute)
  useEffect(() => {
    if (!timeBasedEnabled || mode !== 'system') return;
    
    const checkTime = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour < 6 || hour >= 18;
      const isCurrentlyDark = resolvedTheme === 'dark';
      
      if (shouldBeDark !== isCurrentlyDark) {
        // Force re-render to update resolvedTheme
        setSystemTheme(shouldBeDark ? 'dark' : 'light');
      }
    };
    
    const interval = setInterval(checkTime, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [timeBasedEnabled, mode, resolvedTheme]);
  
  // Set theme mode
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);
  
  // Toggle between light and dark
  const toggle = useCallback(() => {
    const newMode = resolvedTheme === 'light' ? 'dark' : 'light';
    setMode(newMode);
  }, [resolvedTheme, setMode]);
  
  // Set time-based auto-switching
  const setTimeBasedEnabled = useCallback((enabled: boolean) => {
    setTimeBasedEnabledState(enabled);
    
    try {
      localStorage.setItem(TIME_BASED_KEY, String(enabled));
    } catch (error) {
      console.error('Failed to save time-based preference:', error);
    }
  }, []);
  
  const value = useMemo(() => ({
    mode,
    resolvedTheme,
    setMode,
    toggle,
    timeBasedEnabled,
    setTimeBasedEnabled,
    systemTheme,
    isLoaded,
  }), [
    mode,
    resolvedTheme,
    setMode,
    toggle,
    timeBasedEnabled,
    setTimeBasedEnabled,
    systemTheme,
    isLoaded,
  ]);
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
