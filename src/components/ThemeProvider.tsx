'use client';

/**
 * ThemeProvider - Backward Compatibility Layer
 * 
 * This component now delegates to Zustand preferencesStore for unified state management.
 * Zustand stores don't require providers, so this is now a pass-through component.
 * 
 * @deprecated Use preferencesStore hooks directly: useTheme, useSettings from '@/stores'
 * @see preferencesStore for the new unified state management
 */

import { useTheme as useThemeFromStore } from '@/stores/preferencesStore';
import type { Theme } from '@/stores/preferencesStore';

// Re-export useTheme for backward compatibility
export const useTheme = useThemeFromStore;

// Re-export Theme type
export type { Theme };

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string; // Kept for API compatibility, but ignored (Zustand handles persistence)
}

/**
 * @deprecated Zustand stores don't require providers.
 * Simply use useTheme() hook directly in components.
 */
export function ThemeProvider({ 
  children, 
  defaultTheme: _defaultTheme = 'system',
  storageKey: _storageKey, // eslint-disable-line @typescript-eslint/no-unused-vars
}: ThemeProviderProps) {
  // Zustand doesn't need a provider - just render children
  return <>{children}</>;
}
