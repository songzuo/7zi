/**
 * Theme Configuration
 * Defines theme modes, colors, and settings
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Brand colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  secondaryHover: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border colors
  border: string;
  borderHover: string;
  borderFocus: string;
  
  // Shadow
  shadow: string;
  shadowLg: string;
  
  // Code/Syntax
  codeBackground: string;
  codeText: string;
  
  // Chart colors
  chartColors: string[];
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  transitions: {
    duration: number;
    timing: string;
  };
  autoSwitch: {
    enabled: boolean;
    timeBased: boolean;
    dayStart: number; // Hour (0-23)
    nightStart: number; // Hour (0-23)
  };
}

export const themeConfig: ThemeConfig = {
  mode: 'system',
  colors: {
    light: {
      background: '#ffffff',
      surface: '#f9fafb',
      surfaceHover: '#f3f4f6',
      surfaceActive: '#e5e7eb',
      
      textPrimary: '#111827',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      textInverse: '#ffffff',
      
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryActive: '#1d4ed8',
      secondary: '#8b5cf6',
      secondaryHover: '#7c3aed',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      border: '#e5e7eb',
      borderHover: '#d1d5db',
      borderFocus: '#3b82f6',
      
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      
      codeBackground: '#f3f4f6',
      codeText: '#1f2937',
      
      chartColors: [
        '#3b82f6',
        '#8b5cf6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#06b6d4',
        '#ec4899',
        '#84cc16',
      ],
    },
    dark: {
      background: '#0f172a',
      surface: '#1e293b',
      surfaceHover: '#334155',
      surfaceActive: '#475569',
      
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      textInverse: '#0f172a',
      
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      primaryActive: '#2563eb',
      secondary: '#a78bfa',
      secondaryHover: '#8b5cf6',
      
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      
      border: '#334155',
      borderHover: '#475569',
      borderFocus: '#60a5fa',
      
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
      shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
      
      codeBackground: '#1e293b',
      codeText: '#e2e8f0',
      
      chartColors: [
        '#60a5fa',
        '#a78bfa',
        '#34d399',
        '#fbbf24',
        '#f87171',
        '#22d3ee',
        '#f472b6',
        '#a3e635',
      ],
    },
  },
  transitions: {
    duration: 300,
    timing: 'ease-in-out',
  },
  autoSwitch: {
    enabled: true,
    timeBased: false,
    dayStart: 6, // 6 AM
    nightStart: 18, // 6 PM
  },
};

/**
 * Get the actual theme based on mode
 */
export function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    // Default to light on server-side
    return 'light';
  }
  return mode;
}

/**
 * Get time-based theme
 */
export function getTimeBasedTheme(): 'light' | 'dark' {
  const hour = new Date().getHours();
  const { dayStart, nightStart } = themeConfig.autoSwitch;
  
  if (hour >= dayStart && hour < nightStart) {
    return 'light';
  }
  return 'dark';
}
