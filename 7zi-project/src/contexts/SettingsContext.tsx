'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Locale } from '@/i18n/config';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  email: boolean;
  push: boolean;
}

// 用户偏好设置类型
export interface UserSettings {
  theme: Theme;
  language: Locale;
  notifications: NotificationPreferences;
}

// Context 类型
interface SettingsContextType {
  // Settings state
  settings: UserSettings;
  isLoaded: boolean;
  
  // Theme methods
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  
  // Language methods
  setLanguage: (language: Locale) => void;
  
  // Notification methods
  setNotifications: (notifications: Partial<NotificationPreferences>) => void;
  
  // Reset
  resetSettings: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = '7zi-user-settings';

const defaultSettings: UserSettings = {
  theme: 'system',
  language: 'zh',
  notifications: {
    enabled: true,
    sound: true,
    email: false,
    push: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

// Load settings from localStorage
function loadStoredSettings(): Partial<UserSettings> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Partial<UserSettings>;
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
  }
  return null;
}

// Merge settings with defaults
function mergeSettings(stored: Partial<UserSettings> | null): UserSettings {
  return {
    ...defaultSettings,
    ...(stored || {}),
    notifications: {
      ...defaultSettings.notifications,
      ...(stored?.notifications || {}),
    },
  };
}

// localStorage subscription helper
function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

// ============================================================================
// Context
// ============================================================================

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Default context for safe hook
const defaultContext: SettingsContextType = {
  settings: defaultSettings,
  isLoaded: false,
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
  setLanguage: () => {},
  setNotifications: () => {},
  resetSettings: () => {},
};

// ============================================================================
// Provider
// ============================================================================

interface SettingsProviderProps {
  children: React.ReactNode;
  defaultSettings?: Partial<UserSettings>;
}

export function SettingsProvider({ 
  children, 
  defaultSettings: userDefaults 
}: SettingsProviderProps) {
  // Track if we're on the client
  const mounted = useSyncExternalStore(
    subscribeToStorage,
    () => true,
    () => false
  );

  // Initialize settings from localStorage
  const [settings, setSettings] = useState<UserSettings>(() => {
    const stored = loadStoredSettings();
    return mergeSettings({
      ...userDefaults,
      ...stored,
    });
  });

  // Compute isDark as derived state
  const isDark = useMemo(() => {
    if (!mounted) return false;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return settings.theme === 'dark' || (settings.theme === 'system' && systemDark);
  }, [settings.theme, mounted]);

  // Sync theme to DOM and localStorage
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save settings to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings, mounted, isDark]);

  // Theme methods
  const setTheme = useCallback((theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings(prev => {
      if (prev.theme === 'light') return { ...prev, theme: 'dark' };
      if (prev.theme === 'dark') return { ...prev, theme: 'light' };
      // For system theme, toggle based on current system preference
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return { ...prev, theme: systemDark ? 'light' : 'dark' };
    });
  }, []);

  // Language method
  const setLanguage = useCallback((language: Locale) => {
    setSettings(prev => ({ ...prev, language }));
  }, []);

  // Notification method
  const setNotifications = useCallback((notifications: Partial<NotificationPreferences>) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        ...notifications,
      },
    }));
  }, []);

  // Reset method
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  // Don't render children until mounted to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoaded: mounted,
        setTheme,
        toggleTheme,
        isDark,
        setLanguage,
        setNotifications,
        resetSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Primary hook for accessing settings context
 * @throws Error if used outside of SettingsProvider
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

/**
 * Safe hook that returns default values instead of throwing
 * Use this in components that might render outside the provider
 */
export function useSettingsSafe(): SettingsContextType {
  const context = useContext(SettingsContext);
  return context === undefined ? defaultContext : context;
}

/**
 * Convenience hook for theme-only access
 * Provides the same interface as the old useTheme hook for backward compatibility
 */
export function useTheme() {
  const { settings, setTheme, toggleTheme, isDark } = useSettingsSafe();
  return {
    theme: settings.theme,
    setTheme,
    toggleTheme,
    isDark,
  };
}
