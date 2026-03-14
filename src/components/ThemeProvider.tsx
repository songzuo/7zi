'use client';

/**
 * ThemeProvider - Backward Compatibility Layer
 * 
 * This component now delegates to SettingsProvider for unified state management.
 * The theme functionality is fully integrated into SettingsContext.
 * 
 * @deprecated Use SettingsProvider from '@/contexts/SettingsContext' instead
 * @see SettingsContext for the new unified context
 */

import { SettingsProvider, useTheme } from '@/contexts/SettingsContext';
import type { Theme } from '@/contexts/SettingsContext';

// Re-export useTheme for backward compatibility
export { useTheme };

// Re-export Theme type
export type { Theme };

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string; // Kept for API compatibility, but ignored
}

/**
 * @deprecated Use SettingsProvider directly instead
 */
export function ThemeProvider({ 
  children, 
  defaultTheme = 'system',
  storageKey: _storageKey, 
}: ThemeProviderProps) {
  return (
    <SettingsProvider defaultSettings={{ theme: defaultTheme }}>
      {children}
    </SettingsProvider>
  );
}
